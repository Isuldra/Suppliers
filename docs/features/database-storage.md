# Database Storage

This document provides detailed information about the database storage functionality in Supplier Reminder Pro.

## Overview

The database storage feature provides a reliable, local data persistence layer for the application. Using SQLite, it enables efficient storage and retrieval of supplier data, orders, and application settings without requiring external database servers.

## Technology Stack

### Database Engine

Supplier Reminder Pro uses SQLite as its database engine:

- **SQLite Version**: 3.35.0+
- **Mode**: Write-Ahead Logging (WAL) for improved concurrency and reliability
- **Encryption**: Optional database encryption for sensitive data (using SQLCipher)

### Integration Libraries

The application connects to SQLite through:

- **better-sqlite3**: High-performance, prepared statement-based synchronous API
- **SQLite3 Node.js Bindings**: Used as a fallback on platforms where better-sqlite3 is unavailable
- **Database Service**: Custom abstraction layer providing consistent API across the application

## Database Location

The database file is stored in the user's application data directory:

- **Windows**: `%APPDATA%\supplier-reminder-pro\supplier-reminder.db`
- **macOS**: `~/Library/Application Support/supplier-reminder-pro/supplier-reminder.db`
- **Linux**: `~/.config/supplier-reminder-pro/supplier-reminder.db`

## Schema Design

The database includes several key tables:

### Suppliers Table

```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT,
  supplier TEXT NOT NULL,
  order_number TEXT,
  order_date TIMESTAMP,
  due_date TIMESTAMP,
  category TEXT,
  description TEXT,
  value REAL,
  currency TEXT,
  confirmed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_sent_at TIMESTAMP,
  FOREIGN KEY (supplier) REFERENCES suppliers(name)
);
```

### Email Templates Table

```sql
CREATE TABLE email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Email History Table

```sql
CREATE TABLE email_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_count INTEGER DEFAULT 0,
  FOREIGN KEY (supplier) REFERENCES suppliers(name)
);
```

## Database Operations

### Read Operations

The application provides optimized read operations:

- **Indexing**: Key columns are indexed for faster retrieval
- **Query Optimization**: Queries use prepared statements with parameter binding
- **Result Caching**: Frequently accessed data is cached to reduce database load

### Write Operations

Data integrity is maintained through:

- **Transactions**: Grouped operations are wrapped in transactions
- **Constraints**: Foreign key and uniqueness constraints prevent invalid data
- **Update Tracking**: Automatic update timestamp management

### Batch Operations

For performance when handling multiple records:

- **Bulk Insert**: Efficient batch insertion for importing large data sets
- **Batch Update**: Optimized updates for multiple records

## Performance Considerations

### Optimizations

- **Connection Pooling**: Reuse of database connections
- **Prepared Statements**: Pre-compiled queries for improved performance
- **Indexes**: Strategic indexing of frequently queried columns
- **WAL Mode**: Write-ahead logging for improved concurrency

### Limits and Boundaries

- **File Size**: Practical limit of several gigabytes for the database file
- **Concurrent Access**: Multiple read operations with single write capability
- **Query Complexity**: Complex queries are optimized to prevent performance issues

## Data Migration

The application supports database schema evolution:

- **Version Tracking**: Database schema version is tracked in a metadata table
- **Migration Scripts**: Automatic migration between schema versions
- **Data Preservation**: Updates maintain existing data when possible

## Backup and Recovery

### Automatic Backups

- **Scheduled Backups**: Regular database backups at configurable intervals
- **Pre-Update Backups**: Automatic backup before schema updates
- **Retention Policy**: Configurable retention of backup files

### Recovery Process

- **Manual Restore**: User-initiated restoration from backup
- **Corruption Recovery**: Automatic recovery attempts for corrupted databases
- **Validation**: Database integrity validation after restoration

## Usage in Code

### Database Service API

```typescript
// Example of database service usage
import { databaseService } from "../services/databaseService";

// Retrieve all suppliers
const suppliers = databaseService.getAllSuppliers();

// Insert or update an order
const orderId = databaseService.insertOrUpdateOrder({
  supplier: "Acme Inc",
  orderNumber: "ORD-123",
  orderDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  value: 1250.0,
  currency: "USD",
  description: "Office supplies",
});

// Close database connection when application exits
app.on("will-quit", () => {
  databaseService.close();
});
```

### Transaction Example

```typescript
// Example of using transactions
import { databaseService } from "../services/databaseService";

// Using a transaction for batch operations
databaseService.transaction((db) => {
  // All operations here are part of the same transaction
  const supplierId = db.insertSupplier({
    name: "New Supplier Ltd",
    email: "contact@newsupplier.com",
  });

  // Multiple orders for the same supplier
  orders.forEach((order) => {
    db.insertOrder({
      supplier: "New Supplier Ltd",
      orderNumber: order.number,
      description: order.description,
      value: order.value,
    });
  });

  // Transaction will be committed if no errors occur
  // or rolled back if any operation fails
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

1. **Database Locked**: Ensure all connections are properly closed after use
2. **Corruption**: Use the built-in integrity check and restore from backup if needed
3. **Performance Issues**: Check for missing indexes or inefficient queries
4. **Disk Space**: Monitor available disk space for database and backup files
5. **Version Conflicts**: Ensure all application instances use compatible database versions

## Related Features

- [Data Export](data-export.md) - Exporting data from the database
- [Backup and Restore](backup-restore.md) - Backing up and restoring the database
- [ODBC Integration](odbc-integration.md) - Integration with external databases
