# SupplyChain OneMed - OneMed Application

This project is a desktop application implementing OneMed's design system, built for managing supplier data and interactions efficiently. It uses Electron, React, TypeScript, and Tailwind CSS.

## Contents

- [Design System](#design-system)
- [Implementation](#implementation)
- [Getting Started](#getting-started)
- [Component Usage](#component-usage)
- [SQLite Database](#sqlite-database)
- [Customization](#customization)
- [Electron Integration](#electron-integration)
- [Security](#security)
- [Development Tools](#development-tools)
- [External Link Handling](#external-link-handling)
- [Deployment & Installation](#deployment--installation)
- [Automatic Updates](#automatic-updates)

## Design System

OneMed's design system is based on the following core principles:

### Color Palette

- **Primary Teal/Green**: #497886 - Used for primary UI elements, buttons, and navigation
- **Primary Light**: #6A99A7 - Used for hover states and secondary elements
- **Primary Dark**: #366573 - Used for active states and important UI elements
- **Accent Color**: #E63946 - Used for important buttons, alerts, and highlights
- **Neutral Colors**: #333333 (text), #666666 (secondary text), #F5F5F5 (background), #FFFFFF (white)

### Typography

- **Main Font**: Roboto
- **Secondary Font**: Open Sans
- **Base Size**: 16px
- **Font Weights**: 400 (normal), 500 (medium), 600 (bold)

### Spacing

- **Base unit**: 8px
- **Spacing Scale**: 8px (sm), 16px (md), 24px (lg), 32px (xl), 48px (2xl)
- **Border Radius**: 4px (sm), 8px (md), 12px (lg)

## Implementation

This application implements the OneMed design system using:

- **Tailwind CSS** with customized configuration
- **React** for component-based UI
- **Electron** for the desktop application framework
- **TypeScript** for type safety
- **CSS variables** for consistent styling
- **Component-based architecture** for reusability
- **Responsive design** for adapting to different window sizes

## Getting Started

To set up the development environment for this application:

1. Clone this repository.
2. Install dependencies using npm:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Build the application for production:

```bash
npm run build
```

### First Run

On the very first launch after installation, the application needs to initialize its local database. You will be prompted to select the master supplier data Excel file (.xlsx). This file is processed using `exceljs` (no external ODBC drivers needed) to populate the initial dataset.

Ensure the Excel file is up-to-date before selecting it. The application expects specific column headers for correct data mapping.

### Development

Start the development environment using the following command:

```bash
npm run dev
```

## Component Usage

This section provides examples of common UI components based on the OneMed design system.

### Buttons

```tsx
<button className="btn btn-primary">Primary Button</button>
<button className="btn btn-secondary">Secondary Button</button>
<button className="btn btn-accent">Accent Button</button>
```

### Cards

```tsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">Content here...</div>
</div>
```

### Forms

```tsx
<div className="form-group">
  <label className="form-label" htmlFor="example">
    Label
  </label>
  <input type="text" id="example" className="form-control" />
</div>
```

### Current Components

The application includes specialized React components for managing supplier interactions and data:

- `DataReview` - For reviewing imported supplier data.
- `SupplierSelect` - For selecting suppliers
- `WeekdaySelect` - For selecting weekdays for reminders
- `PlannerSelect` - For selecting planners
- `WizardSteps` - For multi-step workflow
- `EmailPreviewModal` - For previewing reminder emails
- `EmailButton` - For email actions
- `DateFilter` - For filtering by date
- `FileUpload` - For importing supplier data from Excel files.

## Customization

Application styling can be customized via:

1. The Tailwind config file (`tailwind.config.js`) for utility classes.
2. CSS variables defined in `src/renderer/styles/index.css` for direct CSS usage.

## SQLite Database

The application utilizes SQLite for local data persistence, chosen for its simplicity and file-based nature suitable for desktop applications. It uses the `better-sqlite3` library for synchronous, high-performance database operations.

### Database Architecture

- **Location**: The database file (`app.sqlite`) is stored in the application's user data directory (`app.getPath('userData')`).
- **Schema**: Includes tables for orders (`orders`), weekly status (`weekly_status`), purchase orders (`purchase_order`), and audit logs (`audit_log`). See `src/services/databaseService.ts` for the detailed schema definition.
- **Initialization**: On the first application run, the database schema is created, and initial data is imported from a user-selected Excel file (`.xlsx`) using the `exceljs` library.
- **Connection Mode**: Uses Write-Ahead Logging (WAL) mode (`PRAGMA journal_mode=WAL;`) for improved concurrency and performance, allowing reads and writes to occur simultaneously more effectively.

### Database Service

The application implements a singleton `DatabaseService` class that handles all database operations:

```typescript
// Import and get database instance
import { databaseService } from "../services/databaseService";
```

### Table Structure

The core database table for managing order data is:

**orders**

- `id` - Primary key
- `reference` - Order reference code
- `supplier` - Supplier name
- `orderNumber` - Order number
- `orderDate` - Date when order was placed
- `dueDate` - Date when order is due
- `category` - Order category
- `description` - Order description
- `value` - Order value
- `currency` - Currency
- `confirmed` - Boolean flag for confirmation status
- `createdAt` - Timestamp for creation
- `updatedAt` - Timestamp for last update
- `email_sent_at` - Timestamp for when email was sent

### Available Methods

The `DatabaseService` class provides methods for interacting with the database:

```typescript
// Insert or update a single order
const orderId = databaseService.insertOrUpdateOrder(order);

// Bulk insert or update orders
const insertCount = databaseService.upsertOrders(ordersArray);

// Get orders by supplier
const orders = databaseService.getOrdersBySupplier("Supplier Name");

// Get all orders
const allOrders = databaseService.getAllOrders();

// Get orders due within specific days
const upcomingOrders = databaseService.getOrdersDueWithinDays(30);

// Get outstanding (unconfirmed) orders for a supplier
const outstandingOrders = databaseService.getOutstandingOrders("Example Corp");

// Mark an order as confirmed
const success = databaseService.markOrderAsConfirmed(
  "Example Corp",
  "OrderNumber123" // Use a specific example order number
);

// Record email sent for specific orders
const updatedCount = databaseService.recordEmailSent([orderId1, orderId2]);

// Delete an order
const deleted = databaseService.deleteOrder("Example Corp", "OrderNumber123"); // Use a specific example order number

// Close database connection
databaseService.close();
```

### Renderer Process API

To access database operations from the React frontend (renderer process), the application uses Electron's IPC (Inter-Process Communication) mechanism. Preload scripts expose a secure `databaseAPI` object:

```typescript
import { databaseAPI } from "../renderer/api/database"; // Path depends on file location

// Example usage within a React component
useEffect(() => {
  async function loadOrders() {
    try {
      // Make an asynchronous call to the main process via the exposed API
      const orders = await databaseAPI.getOrdersBySupplier("Example Corp");
      setOrders(orders); // Update component state
    } catch (error) {
      console.error("Failed to load orders:", error);
      // Handle error appropriately in the UI
    }
  }

  loadOrders();
}, []); // Empty dependency array ensures this runs once on mount
```

### Database Integration with Main Process

The database service is initialized when the Electron app starts and handles are set up for IPC communication:

```typescript
// In main/index.ts
app.whenReady().then(() => {
  try {
    // Database is auto-initialized when the singleton is accessed
    log.info("Database initialized successfully");

    // Setup IPC handlers for database operations
    setupDatabaseHandlers();
  } catch (error) {
    log.error("Failed to initialize database:", error);
  }

  // ...
});
```

### Example Usage

Here is a basic example of using the `DatabaseService` directly within the Electron main process:

```typescript
// ... existing code ...
// Get orders for the specified supplier
const orders = databaseService.getOrdersBySupplier("Example Corp");
console.log(`Found ${orders.length} orders for Example Corp.`);

// Remember to close the database connection when the application shuts down
// This is typically handled in the main process cleanup logic
// databaseService.close();
```

## Electron Integration

This application is packaged as a cross-platform desktop application using Electron. Key aspects include:

- **Cross-platform Compatibility**: Builds available for macOS and Windows.
- **Native Features**: Access to file system, native menus, and notifications.
- **Local Data**: Secure local storage using SQLite.
- **Email**: Capability to interact with the default email client.

## Security

The application incorporates security best practices relevant to Electron development.

### Electron Security Measures

- **Context Isolation**: Enabled (`contextIsolation: true`) to separate preload scripts and the renderer process, preventing direct access to Node.js APIs.
- **Node Integration**: Disabled (`nodeIntegration: false`).
- **Web Security**: Enabled.
- **Content Security Policy (CSP)**: Implemented via `session.defaultSession.webRequest.onHeadersReceived` to restrict resource loading and script execution.
- **Secure Headers**: Includes `X-Content-Type-Options`, `X-Frame-Options`, etc.
- **Permissions**: Use Electron's permission request handlers (`ses.setPermissionRequestHandler`) to explicitly grant/deny access to sensitive OS-level capabilities only when required.
- **External Links**: Opened securely in the default browser via `shell.openExternal()`.

### Database Security

- **SQLite WAL Mode**: Enhances data integrity and crash recovery.
- **Prepared Statements**: All database queries use parameterized statements (`better-sqlite3`) to prevent SQL injection.
- **Database Audit Logging**: An `audit_log` table records critical operations.

### Error Handling and Monitoring

- **Comprehensive Logging**: Uses `electron-log`. Logs stored in `app.getPath('userData')/logs` (e.g., `%APPDATA%\one-med-supplychain-app\logs`).
- **Log Access**: Menu option to open log folder (`shell.openPath`); IPC handler to potentially view recent logs in-app.
- **Graceful Shutdown**: Handles `before-quit` to close DB connections cleanly.

### Dependencies

- Regularly audit project dependencies (`npm audit`) and keep them updated.

## Development Tools

- **Testing**: Vitest for unit and component testing.
- **Linting/Formatting**: ESLint / Prettier (`npm run lint`).
- **Type Checking**: TypeScript (`npm run typecheck`).
- **Build**: Electron-Vite (`npm run build`).
- **Debugging**: Standard Electron & React DevTools.

## External Link Handling

For security, all external web links clicked within the application are intercepted and opened using the operating system's default web browser via Electron's `shell.openExternal()` function. This prevents loading external web content directly within the application's windows.

## Deployment & Installation

Refer to the following dedicated documents for detailed procedures:

- `docs/installation/end-user-installation.md`: Instructions for end-users on installing the application.
- `docs/development/ci-cd-pipeline.md`: Information on the Continuous Integration setup using GitHub Actions.
- `docs/development/publishing-updates.md`: Details on how application updates are built and manually published.

### Windows Installer Examples

To perform a silent installation on Windows:

```powershell
# Install for current user only (No Admin Rights Needed)
.\"OneMed SupplyChain-1.0.1.exe" /S /CURRENTUSER

# Install for all users (Requires Admin Rights & build config change)
# .\"OneMed SupplyChain-1.0.1.exe" /S /ALLUSERS
```

_(Replace 1.0.1 with the specific application version number.)_

### macOS Installation Example

A standard `.dmg` disk image is typically provided.

```bash
# Example manual command-line steps for installing from DMG
hdiutil attach "OneMed SupplyChain-1.0.1.dmg"
sudo cp -R "/Volumes/OneMed SupplyChain/OneMed SupplyChain.app" /Applications/
hdiutil detach "/Volumes/OneMed SupplyChain"
```

_(Replace 1.0.1 with the specific version. Silent deployment usually involves MDM.)_

## Automatic Updates

The application uses `electron-updater` to check for and download updates **once they have been manually published** to GitHub Releases (see `docs/development/publishing-updates.md`).

### Update Process

1.  **Check**: Application checks for updates on startup and periodically (if configured).
2.  **Download**: If a newer version is found on GitHub Releases, it's downloaded.
3.  **Prompt**: User is prompted to restart to apply the update.

### Configuration (`package.json`)

The `electron-builder` configuration within `package.json` influences the update process. While `build.publish` is set to `null` (disabling automatic publishing by the builder), `electron-updater` implicitly uses GitHub as the source when running from a packaged app built with appropriate repository information.

```json
{
  // ... other package.json fields ...
  "build": {
    "appId": "com.onemed.supplychain",
    "productName": "OneMed SupplyChain",
    "repository": {
      "type": "git",
      "url": "https://github.com/your-org/your-repo.git" // Replace with actual repo URL
    },
    "publish": null // Correctly set for manual publishing
    // ... other build configurations ...
  }
}
```

**Key Points for Manual Updates:**

- Ensure the `repository` field in `package.json` points to the correct GitHub repository where releases are manually created.
- Manually upload the correct artifacts (installer `.exe`, `latest.yml`, portable `.exe`, etc.) to a new GitHub Release (as described in `publishing-updates.md`).
- `electron-updater` will check the repository specified in `package.json` (via the `repository` field or other heuristics) for a `latest.yml` file on the Releases page to determine if an update is available.

**Security Note:** If the repository is private, `electron-updater` might require a `GITHUB_TOKEN` to access the release assets. This token should **never** be hardcoded but provided securely during the build process if needed (e.g., via environment variables in CI, though this is less relevant for purely manual publishing).
