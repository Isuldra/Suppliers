# Database Storage

This document provides detailed information about the database storage functionality in SupplyChain OneMed.

## Overview

The database storage feature provides a reliable, local data persistence layer for the SupplyChain OneMed application. Using SQLite via the `better-sqlite3` library, it enables efficient storage and retrieval of application data without requiring external database servers.

**Offline Access Note:** Because the primary data storage is local, core application data (like suppliers and orders previously loaded) can typically be viewed and modified even without an active internet connection. However, these changes remain local to the device and are **not** automatically synchronized with any central server or other users. Furthermore, any application feature requiring network access (e.g., sending emails, checking for application updates) will fail when offline.

## Technology Stack

### Database Engine

SupplyChain OneMed uses SQLite as its database engine:

- **Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL`) is enabled for improved concurrency.
- **Encryption**: Database encryption is **not** currently implemented.

### Integration Libraries

The application connects to SQLite exclusively through:

- **better-sqlite3**: High-performance, synchronous API for Node.js.
- **Database Service (`src/services/databaseService.ts`)**: A singleton service class that encapsulates all database interactions, providing a consistent API across the application.

## Database Location

The database file (`app.sqlite`) is stored in the user's application data directory:

- **Windows**: `%APPDATA%\one-med-supplychain-app\app.sqlite` (Note: Actual parent folder name might be based on `name` in `package.json`)
- **macOS**: `~/Library/Application Support/one-med-supplychain-app/app.sqlite`
- **Linux**: `~/.config/one-med-supplychain-app/app.sqlite`

_(The parent directory name `one-med-supplychain-app` is derived from the application name and might vary slightly)_

## Schema Design

The database schema is defined within the `initialize` method of the `DatabaseService`. The key tables created are:

### `orders` Table

Stores order information, likely imported from Excel.

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

### `audit_log` Table

Logs basic changes (insert, update, delete) made to certain tables via the `DatabaseService`.

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT, -- Stores JSON string
  new_value TEXT, -- Stores JSON string
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT -- Note: user_id is not currently populated
);
```

### `weekly_status` Table

Stores weekly status information, likely related to supplier planning.

```sql
CREATE TABLE IF NOT EXISTS weekly_status (
  leverandor TEXT,
  dag TEXT,
  uke TEXT,
  status TEXT,
  email TEXT,
  UNIQUE(leverandor, dag, uke) ON CONFLICT REPLACE
);
CREATE INDEX IF NOT EXISTS idx_weekly_status_leverandor ON weekly_status(leverandor);
CREATE INDEX IF NOT EXISTS idx_weekly_status_uke ON weekly_status(uke);
```

### `purchase_order` Table

Stores purchase order details, potentially related to cross-referencing imported data.

```sql
CREATE TABLE IF NOT EXISTS purchase_order (
  nøkkel TEXT PRIMARY KEY,
  ordreNr TEXT,
  itemNo TEXT,
  beskrivelse TEXT,
  dato TEXT,
  ftgnavn TEXT
);
CREATE INDEX IF NOT EXISTS idx_po_ordreNr ON purchase_order(ordreNr);
CREATE INDEX IF NOT EXISTS idx_po_ftgnavn ON purchase_order(ftgnavn);
```

**Note:** Tables for managing Suppliers directly or Email Templates, as previously documented, are **not** present in the current schema defined in `DatabaseService`.

## Database Operations

### Read Operations

- **Indexing**: Indexes are created on key columns (e.g., `orders.supplier`, `orders.dueDate`) for faster retrieval.
- **Query Optimization**: Uses `better-sqlite3` prepared statements with parameter binding.

### Write Operations

- **Transactions**: Grouped operations (like batch upserts) are wrapped in transactions internally within `DatabaseService` methods (e.g., `upsertOrders`).
- **Constraints**: Unique constraints (e.g., `orders(supplier, orderNumber)`) help maintain data integrity.
- **Update Tracking**: `orders.updatedAt` timestamp is managed automatically by the `insertOrUpdateOrder` method.
- **Audit Logging**: Basic insert/update/delete actions on orders are logged to `audit_log` via the internal `logOperation` method.

### Batch Operations

- **`upsertOrders`**: Method exists for efficient batch insertion/updating of orders.

## Performance Considerations

### Optimizations

- **Prepared Statements**: Used via `better-sqlite3`.
- **Indexes**: Created on key query columns.
- **WAL Mode**: Enabled for improved concurrency.

### Limits and Boundaries

- **File Size**: SQLite supports large databases, but practical limits depend on system resources.
- **Concurrent Access**: WAL mode allows multiple readers concurrent with a single writer.

## Data Migration

Database schema migration (handling changes between application versions) is **not currently implemented**. The `initialize` method only creates tables if they don't exist and includes a basic `ALTER TABLE` to add a potentially missing column, but it doesn't handle version tracking or complex schema changes.

## Backup and Recovery

### Automatic Backups

- **Mechanism**: The `DatabaseService` includes logic (`performBackupIfNeeded`) to create backups.
- **Schedule**: Checks approximately hourly, but only performs a backup if 24 hours have passed since the last one.
- **Location**: Backups are stored in a `backups` subdirectory within the application data directory.
- **Naming**: Files are named `supplier-reminder-{timestamp}.db`.
- **Retention**: Keeps the most recent 7 backup files, deleting older ones.

### Recovery Process

- **Manual Restore**: **Not implemented** via the application UI or API.
- **Corruption Handling**: If the main `app.sqlite` file cannot be opened, the service attempts to rename it to `app.sqlite.corrupt.{timestamp}`. The application will then likely prompt the user for the initial Excel import to create a new database.

## Usage in Code

### Database Service API

The `DatabaseService` is a singleton instance imported and used throughout the application.

```typescript
// Example of database service usage
import { databaseService } from '../services/databaseService';

// Retrieve orders for a specific supplier
const supplierOrders = databaseService.getOrdersBySupplier('Example Supplier');

// Insert or update an order
const orderId = databaseService.insertOrUpdateOrder({
  supplier: 'Example Corp',
  orderNumber: 'ORD-123',
  // ... other order properties
});

// Close database connection when application exits (handled in main process)
app.on('will-quit', () => {
  databaseService.close();
});
```

## Best Practices

1. **Close Connections**: Always ensure database connections are properly closed
2. **Use Transactions**: Wrap related operations in transactions for data integrity
3. **Parameter Binding**: Always use parameter binding rather than string concatenation
4. **Regular Backups**: Implement a regular backup schedule
5. **Error Handling**: Implement comprehensive error handling for database operations

## Troubleshooting

Common issues and their solutions:

1. **Database Locked**: Ensure long operations use transactions appropriately. `better-sqlite3` is synchronous, reducing typical locking issues compared to async libraries.
2. **Corruption**: If the database file is corrupt, the application may attempt to rename it. Manual intervention (deleting the corrupt file, restoring a backup manually, re-importing from Excel) might be necessary.
3. **Performance Issues**: Check for missing indexes or potentially inefficient queries, although `better-sqlite3` is generally fast.
4. **Disk Space**: Monitor available disk space for the `app.sqlite` database and the `backups` directory.

## Related Features

- [Backup and Restore](#backup-and-recovery) - Details on the implemented automatic backup.
