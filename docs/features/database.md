# Database - OneMed SupplyChain

Denne dokumentasjonen beskriver database-strukturen og operasjonene i OneMed SupplyChain.

## 💾 Oversikt

OneMed SupplyChain bruker SQLite som lokal database for å lagre ordredata, leverandørinformasjon og e-post historikk. Databasen er designet for å være enkel, rask og pålitelig for desktop-applikasjoner.

## 🏗️ Database Arkitektur

### Teknisk Stack

- **SQLite**: Lokal filbasert database
- **better-sqlite3**: Node.js driver for SQLite
- **Automatisk Backup**: Sikkerhetskopiering ved hver import
- **Migrations**: Automatisk schema oppdateringer

### Database Fil

- **Filnavn**: `app.sqlite`
- **Plassering**: `%APPDATA%/one-med-supplychain-app/` (Windows) eller `~/Library/Application Support/one-med-supplychain-app/` (macOS)
- **Størrelse**: Typisk 1-10 MB avhengig av data

## 📊 Tabellstruktur

### purchase_order

Hovedtabellen for ordredata importert fra Excel.

```sql
CREATE TABLE purchase_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nøkkel TEXT,                    -- Unik nøkkel for hver ordre
  ordreNr TEXT,                   -- Ordrenummer
  itemNo TEXT,                    -- Artikkelnummer
  beskrivelse TEXT,               -- Produktbeskrivelse
  dato TEXT,                      -- Ordredato
  ftgnavn TEXT,                   -- Leverandørnavn (gammelt felt)
  status TEXT,                    -- Ordrestatus
  order_qty INTEGER,              -- Bestilt antall
  received_qty INTEGER,           -- Levert antall
  outstanding_qty INTEGER,        -- Restantall
  eta_supplier TEXT,              -- Forventet leveringsdato
  supplier_name TEXT,             -- Leverandørnavn (nytt felt)
  warehouse TEXT,                 -- Lager
  order_row_number TEXT,          -- Ordre radnummer
  email_sent_at TEXT              -- Når e-post ble sendt
);
```

### supplier_emails

Tabell for leverandørinformasjon og e-postadresser.

```sql
CREATE TABLE supplier_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT UNIQUE,      -- Leverandørnavn
  email_address TEXT,             -- E-postadresse
  updated_at TEXT                 -- Sist oppdatert
);
```

## 🔍 Indekser

For optimal ytelse er følgende indekser opprettet:

```sql
-- purchase_order indekser
CREATE INDEX idx_purchase_order_supplier ON purchase_order(supplier_name);
CREATE INDEX idx_purchase_order_outstanding ON purchase_order(outstanding_qty);
CREATE INDEX idx_purchase_order_eta ON purchase_order(eta_supplier);

-- supplier_emails indekser
CREATE INDEX idx_supplier_emails_name ON supplier_emails(supplier_name);
```

## 🔄 Database Operasjoner

### Import Operasjoner

#### Initial Import

```typescript
// Kalles ved første oppstart
async function importAlleArk(source: string | ArrayBuffer, db: Database): Promise<boolean> {
  // 1. Ryd eksisterende data
  db.prepare('DELETE FROM purchase_order').run();

  // 2. Import BP ark data
  const bpData = parseBPSheet(workbook);
  for (const row of bpData) {
    db.prepare(
      `
      INSERT INTO purchase_order (
        nøkkel, ordreNr, itemNo, beskrivelse, dato, 
        order_qty, received_qty, outstanding_qty, 
        eta_supplier, supplier_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      row.nøkkel,
      row.ordreNr,
      row.itemNo,
      row.beskrivelse,
      row.dato,
      row.order_qty,
      row.received_qty,
      row.outstanding_qty,
      row.eta_supplier,
      row.supplier_name
    );
  }

  // 3. Import leverandør e-post
  const supplierData = parseSupplierSheet(workbook);
  for (const supplier of supplierData) {
    db.prepare(
      `
      INSERT OR REPLACE INTO supplier_emails (supplier_name, email_address, updated_at)
      VALUES (?, ?, ?)
    `
    ).run(supplier.name, supplier.email, new Date().toISOString());
  }
}
```

#### Oppdatering av Eksisterende Data

```typescript
// Kalles ved ny fil opplasting
async function saveOrdersToDatabase(fileBuffer: ArrayBuffer): Promise<boolean> {
  // 1. Ryd eksisterende ordre
  db.prepare('DELETE FROM purchase_order').run();

  // 2. Import ny data
  const success = await importAlleArk(fileBuffer, db);

  // 3. Opprett backup
  if (success) {
    await createBackup();
  }

  return success;
}
```

### Query Operasjoner

#### Hent Leverandører med Åpne Ordre

```typescript
function getSuppliersWithOutstandingOrders(): string[] {
  return db
    .prepare(
      `
    SELECT DISTINCT supplier_name 
    FROM purchase_order 
    WHERE (outstanding_qty > 0 OR (order_qty - received_qty) > 0)
    AND eta_supplier IS NOT NULL 
    AND eta_supplier != ''
    ORDER BY supplier_name
  `
    )
    .all()
    .map((row) => row.supplier_name);
}
```

#### Hent Utestående Ordre for Leverandør

```typescript
function getOutstandingOrders(supplier: string): Order[] {
  return db
    .prepare(
      `
    SELECT 
      supplier_name as supplier,
      ordreNr as poNumber,
      itemNo as itemNo,
      outstanding_qty as outstandingQty
    FROM purchase_order 
    WHERE supplier_name = ? 
    AND (outstanding_qty > 0 OR (order_qty - received_qty) > 0)
    ORDER BY ordreNr, itemNo
  `
    )
    .all(supplier);
}
```

#### Hent Alle Leverandører

```typescript
function getAllSuppliers(): string[] {
  return db
    .prepare(
      `
    SELECT DISTINCT supplier_name 
    FROM purchase_order 
    WHERE supplier_name IS NOT NULL 
    AND supplier_name != ''
    ORDER BY supplier_name
  `
    )
    .all()
    .map((row) => row.supplier_name);
}
```

### E-post Tracking

#### Registrer Sendt E-post

```typescript
function recordEmailSent(supplier: string, orderIds: string[]): void {
  const timestamp = new Date().toISOString();

  db.prepare(
    `
    UPDATE purchase_order 
    SET email_sent_at = ? 
    WHERE supplier_name = ? AND nøkkel IN (${orderIds.map(() => '?').join(',')})
  `
  ).run(timestamp, supplier, ...orderIds);
}
```

## 🔒 Sikkerhet og Backup

### Automatisk Backup

```typescript
async function createBackup(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `supplier-reminder-backup-${timestamp}.db`);

  // Kopier database fil
  await fs.copyFile(dbPath, backupPath);

  // Ryd gamle backups (behold siste 5)
  await cleanupOldBackups();
}
```

### Backup Strategi

- **Frekvens**: Automatisk backup ved hver import
- **Retention**: Beholder siste 5 backups
- **Plassering**: `backups/` mappe i app data directory
- **Størrelse**: Typisk 1-10 MB per backup

### Data Sikkerhet

- **Lokal lagring**: Alle data lagres lokalt
- **Ingen cloud sync**: Ingen ekstern datalagring
- **Kryptering**: SQLite med encryption (valgfritt)
- **Tilgangskontroll**: Kun applikasjonen har tilgang

## 📊 Statistikk og Rapportering

### Dashboard Statistikk

```typescript
function getDashboardStats(): DashboardStats {
  const stats = db
    .prepare(
      `
    SELECT 
      COUNT(DISTINCT supplier_name) as totalSuppliers,
      COUNT(DISTINCT CASE WHEN outstanding_qty > 0 THEN supplier_name END) as suppliersWithOrders,
      COUNT(*) as totalOrders,
      SUM(outstanding_qty) as totalOutstanding
    FROM purchase_order
  `
    )
    .get();

  return {
    totalSuppliers: stats.totalSuppliers,
    suppliersWithOutstandingOrders: stats.suppliersWithOrders,
    totalOutstandingOrders: stats.totalOrders,
    totalOutstandingQuantity: stats.totalOutstanding,
  };
}
```

### Topp Leverandører

```typescript
function getTopSuppliers(limit: number = 5): SupplierStat[] {
  return db
    .prepare(
      `
    SELECT 
      supplier_name as name,
      COUNT(*) as outstandingOrders,
      SUM(outstanding_qty) as outstandingQuantity
    FROM purchase_order 
    WHERE outstanding_qty > 0
    GROUP BY supplier_name 
    ORDER BY outstandingQuantity DESC 
    LIMIT ?
  `
    )
    .all(limit);
}
```

### Ordrer per Ukedag

```typescript
function getOrdersByWeekday(): WeekdayStat[] {
  return db
    .prepare(
      `
    SELECT 
      CASE 
        WHEN strftime('%w', eta_supplier) = '1' THEN 'Mandag'
        WHEN strftime('%w', eta_supplier) = '2' THEN 'Tirsdag'
        WHEN strftime('%w', eta_supplier) = '3' THEN 'Onsdag'
        WHEN strftime('%w', eta_supplier) = '4' THEN 'Torsdag'
        WHEN strftime('%w', eta_supplier) = '5' THEN 'Fredag'
        ELSE 'Ukjent'
      END as weekday,
      COUNT(*) as count
    FROM purchase_order 
    WHERE outstanding_qty > 0
    GROUP BY weekday
    ORDER BY count DESC
  `
    )
    .all();
}
```

## 🔧 Vedlikehold

### Database Optimalisering

```typescript
function optimizeDatabase(): void {
  // VACUUM for å rydde opp fragmentering
  db.prepare('VACUUM').run();

  // ANALYZE for å oppdatere statistikk
  db.prepare('ANALYZE').run();
}
```

### Schema Migrations

```typescript
function runMigrations(): void {
  // Sjekk om nye kolonner trengs
  const columns = db.prepare('PRAGMA table_info(purchase_order)').all();
  const columnNames = columns.map((col) => col.name);

  if (!columnNames.includes('email_sent_at')) {
    db.prepare('ALTER TABLE purchase_order ADD COLUMN email_sent_at TEXT').run();
  }
}
```

## 🚨 Feilhåndtering

### Database Feil

```typescript
function handleDatabaseError(error: Error): void {
  console.error('Database error:', error);

  // Logg feilen
  logError('Database operation failed', error);

  // Vis brukervennlig feilmelding
  showError('Database operasjon feilet. Prøv å starte applikasjonen på nytt.');
}
```

### Recovery

```typescript
async function recoverFromBackup(): Promise<boolean> {
  try {
    const latestBackup = await getLatestBackup();
    if (latestBackup) {
      await fs.copyFile(latestBackup, dbPath);
      return true;
    }
  } catch (error) {
    console.error('Recovery failed:', error);
  }
  return false;
}
```

## 📈 Ytelse

### Query Optimalisering

- **Indekser**: På kritiske felter for rask søk
- **Prepared Statements**: For å unngå SQL injection og øke ytelse
- **Batch Operations**: For store datamengder
- **Connection Pooling**: Enkelt med SQLite (én tilkobling)

### Monitoring

```typescript
function logQueryPerformance(query: string, duration: number): void {
  if (duration > 100) {
    // Logg trege queries
    console.warn(`Slow query (${duration}ms):`, query);
  }
}
```

---

**Sist oppdatert**: Juli 2024  
**Versjon**: Se package.json for gjeldende versjon
