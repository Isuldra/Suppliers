# Database - OneMed SupplyChain (Pulse)

Denne dokumentasjonen beskriver database-strukturen og operasjonene i Pulse, generert direkte fra
`CREATE TABLE`-setningene i `src/services/databaseService.ts`.

## Oversikt

Pulse bruker SQLite som lokal database for å lagre ordredata, leverandørinformasjon og
planleggingsdata. Databasen er filbasert, krever ingen server, og er designet for å være enkel,
rask og pålitelig for en desktop-applikasjon.

## Teknisk Stack

- **SQLite**: Lokal filbasert database
- **better-sqlite3**: Synkron Node.js-driver for SQLite
- **WAL-modus**: `PRAGMA journal_mode = WAL` er aktivert for bedre samtidighet
- **Automatisk backup**: Se [Backup og Recovery](#backup-og-recovery)
- **Ingen kryptering**: Databasefilen er ikke kryptert

### Database Fil

- **Filnavn**: `app.sqlite`
- **Plassering**: `%APPDATA%/one-med-supplychain-app/` (Windows) eller
  `~/Library/Application Support/one-med-supplychain-app/` (macOS) — mappenavnet kommer fra
  `name`-feltet i `package.json`, ikke `productName`.

## Tabellstruktur

Databasen har seks tabeller, alle opprettet i `DatabaseService`'s `initialize()`-metode:

### `orders`

```sql
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT,
  supplier TEXT NOT NULL,
  orderNumber TEXT,
  orderDate TEXT,
  dueDate TEXT,
  category TEXT,
  description TEXT,
  value REAL,
  currency TEXT,
  confirmed INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  email_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_supplier ON orders(supplier);
CREATE INDEX IF NOT EXISTS idx_dueDate ON orders(dueDate);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_ordernum ON orders(supplier, orderNumber);
```

### `audit_log`

Logger endringer (insert/update/delete) gjort av `DatabaseService`.

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT
);
```

`user_id` er del av skjemaet, men populeres ikke av dagens kode.

### `weekly_status`

Ukentlig status per leverandør/dag, brukt av Excel-importflyten.

```sql
CREATE TABLE IF NOT EXISTS weekly_status (
  leverandor TEXT,
  dag         TEXT,
  uke         TEXT,
  status      TEXT,
  email       TEXT,
  UNIQUE(leverandor, dag, uke) ON CONFLICT REPLACE
);
CREATE INDEX IF NOT EXISTS idx_weekly_status_leverandor ON weekly_status(leverandor);
CREATE INDEX IF NOT EXISTS idx_weekly_status_uke ON weekly_status(uke);
```

### `purchase_order`

Hovedtabellen for ordredata importert fra Excel. Skjemaet har fått en rekke kolonner lagt til
gjennom migrations (se `poColumns` i `databaseService.ts`); tabellen under viser sluttresultatet.

```sql
CREATE TABLE IF NOT EXISTS purchase_order (
  nøkkel        TEXT PRIMARY KEY,
  ordreNr       TEXT,
  itemNo        TEXT,
  beskrivelse   TEXT,
  dato          TEXT,
  ftgnavn       TEXT,
  status        TEXT,
  producer_item TEXT,
  specification TEXT,
  note          TEXT,
  inventory_balance REAL DEFAULT 0,
  order_qty     INTEGER DEFAULT 0,
  received_qty  INTEGER DEFAULT 0,
  purchaser     TEXT,
  incoming_date TEXT,
  eta_supplier  TEXT,
  supplier_name TEXT,
  warehouse     TEXT,
  outstanding_qty INTEGER DEFAULT 0
  -- additional columns added via migration: from_restliste, order_row_number,
  -- company_code, besttyp, and others — see poColumns in databaseService.ts
);
```

### `supplier_emails`

Leverandørnavn til e-postadresse-oppslag.

```sql
CREATE TABLE IF NOT EXISTS supplier_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT NOT NULL UNIQUE,
  email_address TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supplier_emails_name ON supplier_emails(supplier_name);
```

### `supplier_planning`

Hvilken planlegger som er ansvarlig for en leverandør på en gitt ukedag (ark 6 / "Leverandør" i
Excel-importen).

```sql
CREATE TABLE IF NOT EXISTS supplier_planning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT NOT NULL,
  weekday TEXT NOT NULL,
  planner_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(supplier_name, weekday, planner_name) ON CONFLICT REPLACE
);
CREATE INDEX IF NOT EXISTS idx_supplier_planning_supplier ON supplier_planning(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_planning_weekday ON supplier_planning(weekday);
CREATE INDEX IF NOT EXISTS idx_supplier_planning_planner ON supplier_planning(planner_name);
```

## Database Operasjoner

- **Prepared Statements**: All SQL i `DatabaseService` bruker `better-sqlite3` sine
  prepared statements med parameterbinding — ingen strengkonkatenering av brukerdata.
- **Transactions**: Batch-operasjoner (som `upsertOrders`) kjøres i transaksjoner.
  `better-sqlite3` er synkron, så det er ikke behov for connection pooling.
- **Audit Logging**: Insert/update/delete på `orders` logges til `audit_log` via
  `DatabaseService`'s interne `logOperation`-metode.
- **Migrations**: `initialize()` kjører `CREATE TABLE IF NOT EXISTS` for alle tabeller, og en enkel
  kolonne-migrasjon for `purchase_order` (sjekker `PRAGMA table_info` og legger til manglende
  kolonner via `ALTER TABLE`). Det finnes ingen versjonert migreringsmekanisme utover dette.

## Backup og Recovery

- **Mekanisme**: `DatabaseService` har logikk (`performBackupIfNeeded`) som sjekker omtrent hver
  time, men kun tar backup hvis det har gått 24 timer siden forrige.
- **Plassering**: `backups`-undermappe i applikasjonens data-mappe.
- **Retention**: Beholder et begrenset antall nyeste backup-filer (eldre slettes automatisk).
- **Korrupsjon**: Hvis `app.sqlite` ikke kan åpnes, forsøker tjenesten å gi nytt navn til filen
  (`app.sqlite.corrupt.{timestamp}`). Brukeren må da importere Excel-filen på nytt for å opprette en
  ny database.
- **Manuell gjenoppretting**: Ikke implementert i UI — må gjøres manuelt ved å kopiere en
  backup-fil over `app.sqlite`.

## Sikkerhet

- **Lokal lagring**: Alle data lagres lokalt på brukerens maskin. Applikasjonen synkroniserer ikke
  ordre-/leverandørdata til noen sky-tjeneste.
- **Supabase**: Brukes kun for å synkronisere en produktkatalog fra skyen
  (`src/services/supabaseClient.ts`), med kun en anon-nøkkel — ikke for ordre- eller
  leverandørdata, og ikke skrivbar fra klienten uten videre.
- **SQL injection**: Unngås ved konsekvent bruk av prepared statements.
- **Ingen database-kryptering** er implementert per i dag.

## Relatert

- [Excel Import](excel-import.md) — hvordan data havner i `purchase_order` og `weekly_status`
- [Email Setup](email-setup.md) — hvordan `supplier_emails`/leverandørdata brukes til utsending

---

**Sist verifisert mot kode**: juli 2026
