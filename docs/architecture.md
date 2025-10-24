# Arkitektur - OneMed SupplyChain

Denne dokumentasjonen beskriver arkitekturen til OneMed SupplyChain, en Electron-basert desktop-applikasjon for leverandørstyring.

## 🏗️ Overordnet Arkitektur

OneMed SupplyChain følger Electron's hovedprosess/renderer-prosess arkitektur med moderne React-komponenter og TypeScript.

```
┌─────────────────────────────────────────────────────────────┐
│                    OneMed SupplyChain                       │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)           │  Renderer Process       │
│  ┌─────────────────────────────┐  │  ┌─────────────────────┐ │
│  │ • Database Management       │  │  │ • React Components  │ │
│  │ • IPC Handlers              │  │  │ • UI State          │ │
│  │ • File System Operations    │  │  │ • User Interactions │ │
│  │ • Email Integration         │  │  │ • Progress Tracking │ │
│  └─────────────────────────────┘  │  └─────────────────────┘ │
│              │                    │              │            │
│              └─── IPC Bridge ─────┼──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Prosjektstruktur

```
supplier-reminder-pro/
├── src/
│   ├── main/                    # Main process
│   │   ├── index.ts            # Main entry point
│   │   ├── database.ts         # Database service
│   │   ├── importer.ts         # Excel import logic
│   │   └── auto-updater.ts     # Auto-update functionality
│   ├── renderer/               # Renderer process
│   │   ├── App.tsx            # Main application component
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.tsx  # Dashboard component
│   │   │   ├── FileUpload.tsx # File upload component
│   │   │   ├── EmailButton.tsx # Email functionality
│   │   │   └── ...            # Other components
│   │   ├── services/          # Business logic
│   │   │   ├── emailService.ts # Email service
│   │   │   └── database.ts    # Database API
│   │   └── types/             # TypeScript definitions
│   └── preload/               # Preload scripts
│       └── index.ts           # IPC bridge setup
├── docs/                      # Documentation
├── resources/                 # App resources
└── scripts/                   # Build scripts
```

## 🔄 Dataflyt

### 1. Excel Import Flyt

```
User Upload → FileUpload Component → Main Process → Database → UI Update
     │              │                    │            │           │
     │              │                    │            │           └── Progress Indicator
     │              │                    │            └── Supplier List Update
     │              │                    └── SQLite Storage
     │              └── Validation & Parsing
     └── Drag & Drop
```

### 2. E-post Sending Flyt

```
User Action → EmailButton → EmailService → Main Process → Email Client
     │            │              │              │              │
     │            │              │              │              └── User Sends
     │            │              │              └── System Integration
     │            │              └── Template Rendering
     │            └── Preview Modal
     └── Supplier Selection
```

### 3. Dashboard Data Flyt

```
Dashboard Load → Database Queries → IPC → React State → UI Components
      │               │              │        │            │
      │               │              │        │            └── Charts & Cards
      │               │              │        └── useState/useEffect
      │               │              └── contextBridge
      │               └── SQLite Queries
      └── Route Change
```

## 🧩 Komponentarkitektur

### Hovedkomponenter

#### App.tsx (Root Component)

- **Ansvar**: Global state management, routing, layout
- **State**: `AppState` interface med alle applikasjonstilstander
- **Props**: Ingen - hovedkomponent

#### MainApp Component

- **Ansvar**: Hovedvisning med progress tracking
- **Props**: `AppState` og callback funksjoner
- **Features**: Progress indicator, keyboard shortcuts

#### Dashboard Component

- **Ansvar**: Statistikk og oversikt
- **Props**: `AppState` og callback funksjoner
- **Features**: Charts, overview cards, real-time data

### Komponenthierarki

```
App (Router)
├── MainApp
│   ├── ProgressIndicator
│   ├── FileUpload
│   ├── WeekdaySelect
│   ├── SupplierSelect
│   ├── DataReview
│   └── EmailButton
└── Dashboard
    ├── OverviewCards
    ├── SupplierChart
    └── WeekdayChart
```

## 💾 Datamodell

### Database Schema

#### purchase_order Table

```sql
CREATE TABLE purchase_order (
  id INTEGER PRIMARY KEY,
  nøkkel TEXT,                    -- Unique key
  ordreNr TEXT,                   -- Purchase order number
  itemNo TEXT,                    -- Item number
  beskrivelse TEXT,               -- Description
  dato TEXT,                      -- Date
  ftgnavn TEXT,                   -- Supplier name
  status TEXT,                    -- Order status
  order_qty INTEGER,              -- Ordered quantity
  received_qty INTEGER,           -- Received quantity
  outstanding_qty INTEGER,        -- Outstanding quantity
  eta_supplier TEXT,              -- Expected delivery date
  supplier_name TEXT,             -- Supplier name (new field)
  warehouse TEXT,                 -- Warehouse
  order_row_number TEXT           -- Order row number
);
```

#### supplier_emails Table

```sql
CREATE TABLE supplier_emails (
  id INTEGER PRIMARY KEY,
  supplier_name TEXT UNIQUE,      -- Supplier name
  email_address TEXT,             -- Email address
  updated_at TEXT                 -- Last updated timestamp
);
```

### TypeScript Interfaces

#### AppState

```typescript
interface AppState {
  excelData?: ExcelData; // Parsed Excel data
  selectedPlanner: string; // Selected planner
  selectedWeekday: string; // Selected weekday
  selectedSupplier: string; // Selected supplier
  validationErrors: ValidationError[]; // Validation errors
  isLoading: boolean; // Loading state
  showDataReview: boolean; // Show data review
  showEmailButton: boolean; // Show email button
}
```

#### ExcelData

```typescript
interface ExcelData {
  bp: ExcelRow[]; // BP sheet data
  suppliers: string[]; // Available suppliers
  weekdays: string[]; // Available weekdays
}
```

## 🔌 IPC (Inter-Process Communication)

### Main Process Handlers

```typescript
// Database operations
ipcMain.handle("saveOrdersToDatabase", handleSaveOrders);
ipcMain.handle("getSuppliers", handleGetSuppliers);
ipcMain.handle("getOutstandingOrders", handleGetOutstandingOrders);
ipcMain.handle(
  "getSuppliersWithOutstandingOrders",
  handleGetSuppliersWithOutstandingOrders
);

// Email operations
ipcMain.handle("sendEmail", handleSendEmail);
ipcMain.handle("recordEmailSent", handleRecordEmailSent);

// File operations
ipcMain.handle("selectFile", handleSelectFile);
```

### Preload API

```typescript
// Exposed to renderer process
contextBridge.exposeInMainWorld("electron", {
  saveOrdersToDatabase: (fileBuffer: ArrayBuffer) => Promise<boolean>,
  getSuppliers: () => Promise<string[]>,
  getOutstandingOrders: (supplier: string) => Promise<Order[]>,
  getSuppliersWithOutstandingOrders: () => Promise<string[]>,
  sendEmail: (emailData: EmailData) => Promise<boolean>,
  recordEmailSent: (data: EmailRecordData) => Promise<void>,
  selectFile: () => Promise<string | null>,
});
```

## 🎨 UI/UX Arkitektur

### Design System

- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Tilpasser seg skjermstørrelse
- **Dark/Light Mode**: Automatisk tema basert på system
- **Accessibility**: WCAG 2.1 AA compliance

### Komponentprinsipper

1. **Composition over Inheritance**: Bruker komposisjon for å bygge komplekse komponenter
2. **Single Responsibility**: Hver komponent har ett ansvar
3. **Props Down, Events Up**: Data flyter ned, events flyter opp
4. **Controlled Components**: Alle input-komponenter er kontrollerte

### State Management

- **Local State**: `useState` for komponent-spesifikk state
- **Global State**: `AppState` i hovedkomponenten
- **Derived State**: `useMemo` for beregnede verdier
- **Side Effects**: `useEffect` for API-kall og subscriptions

## 🔒 Sikkerhet

### Electron Security

- **Context Isolation**: Enabled for sikker IPC
- **Node Integration**: Disabled i renderer process
- **Content Security Policy**: Restrictive CSP headers
- **Preload Scripts**: Sikker API-eksponering

### Data Security

- **Local Storage**: Alle data lagres lokalt
- **No Cloud Sync**: Ingen ekstern datalagring
- **Encrypted Database**: SQLite med encryption (valgfritt)
- **Backup Strategy**: Automatisk database backup

## 🚀 Performance

### Optimaliseringer

- **Lazy Loading**: Komponenter lastes ved behov
- **Memoization**: `useMemo` og `useCallback` for kostbare operasjoner
- **Virtual Scrolling**: For store lister (planlagt)
- **Database Indexing**: Optimaliserte SQLite-indekser

### Monitoring

- **Error Tracking**: Sentry integration (valgfritt)
- **Performance Metrics**: React DevTools Profiler
- **Memory Leaks**: Automatisk cleanup av event listeners
- **Database Performance**: Query timing og optimization

## 🔄 Oppdateringer

### Auto-Update System

- **Electron Updater**: Automatisk oppdateringer
- **Delta Updates**: Kun endringer lastes ned
- **Rollback**: Automatisk tilbakefall ved feil
- **User Control**: Bruker kan deaktivere auto-updates

### Version Management

- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Changelog**: Automatisk generert fra commits
- **Migration Scripts**: Database schema updates
- **Backward Compatibility**: API compatibility

## 📊 Testing

### Test Strategy

- **Unit Tests**: Jest for komponenter og utilities
- **Integration Tests**: Electron test for IPC
- **E2E Tests**: Playwright for brukerflyt
- **Database Tests**: SQLite in-memory testing

### Test Coverage

- **Components**: >90% coverage
- **Services**: >95% coverage
- **Utilities**: >98% coverage
- **E2E**: Kritisk brukerflyt

---

**Sist oppdatert**: Juli 2024  
**Versjon**: Se package.json for gjeldende versjon
