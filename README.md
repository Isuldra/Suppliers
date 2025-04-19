# Supplier Reminder Pro - OneMed Application

This project is a desktop application implementing OneMed's design system, built for managing supplier reminders efficiently.

## Contents

- [Design System](#design-system)
- [Implementation](#implementation)
- [Getting Started](#getting-started)
- [Component Usage](#component-usage)
- [SQLite Database](#sqlite-database)
- [Customization](#customization)
- [Electron Integration](#electron-integration)
- [Development Tools](#development-tools)
- [Security](#security)
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

This project implements the design system using:

- **Tailwind CSS** with customized configuration
- **React** for component-based UI
- **Electron** for desktop application framework
- **TypeScript** for type safety
- **CSS variables** for consistent styling
- **Component-based architecture** for reusability
- **Responsive design** for different window sizes

## Getting Started

To use this implementation in your environment:

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Start the development environment:

```bash
npm run dev
```

4. For development without Node.js warnings:

```bash
npm run dev:no-warnings
```

5. Build for production:

```bash
npm run build
```

### First Run

On the very first launch after installation, the application needs to initialize its local database. You will be prompted to select the master supplier data Excel file (.xlsx). This file is processed using `exceljs` (no external ODBC drivers needed) to populate the initial dataset.

Ensure the Excel file is up-to-date before selecting it.

### Development

Start the development environment:

```bash
npm run dev
```

## Component Usage

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

The application includes specialized components for supplier reminder management:

- `DataReview` - For reviewing supplier data
- `SupplierSelect` - For selecting suppliers
- `WeekdaySelect` - For selecting weekdays for reminders
- `PlannerSelect` - For selecting planners
- `WizardSteps` - For multi-step workflow
- `EmailPreviewModal` - For previewing reminder emails
- `EmailButton` - For email actions
- `DateFilter` - For filtering by date
- `FileUpload` - For importing supplier data

## Customization

All styling variables are defined in:

1. The Tailwind config file (`tailwind.config.js`) for Tailwind CSS usage
2. CSS variables in `src/renderer/styles/index.css` for direct CSS usage

You can easily change colors and other variables to customize the appearance of your application while maintaining consistency with OneMed's design system.

## SQLite Database

The application uses SQLite for local data persistence, implemented with the `better-sqlite3` library for high performance and reliability.

### Database Architecture

- **Location**: The database file (`app.sqlite`) is stored in the application's user data directory (`app.getPath('userData')`).
- **Schema**: Includes tables for orders (`orders`), weekly status (`weekly_status`), purchase orders (`purchase_order`), and audit logs (`audit_log`). See `src/services/databaseService.ts` for details.
- **Initialization**: On first run, data is imported from a user-selected Excel file using `exceljs`.
- **Connection Mode**: Uses Write-Ahead Logging (WAL) mode for better performance and reliability.

### Database Service

The application implements a singleton `DatabaseService` class that handles all database operations:

```typescript
// Import and get database instance
import { databaseService } from "../services/databaseService";
```

### Table Structure

The database includes the following table:

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

The database service provides the following key methods:

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
const outstandingOrders = databaseService.getOutstandingOrders("Supplier Name");

// Mark an order as confirmed
const success = databaseService.markOrderAsConfirmed(
  "Supplier Name",
  "OrderNumber"
);

// Record email sent for specific orders
const updatedCount = databaseService.recordEmailSent([orderId1, orderId2]);

// Delete an order
const deleted = databaseService.deleteOrder("Supplier Name", "OrderNumber");

// Close database connection
databaseService.close();
```

### Renderer Process API

For accessing the database from the renderer process (React components), use the database API:

```typescript
import { databaseAPI } from "../renderer/api/database";

// Example usage in a React component
useEffect(() => {
  async function loadOrders() {
    const orders = await databaseAPI.getOrdersBySupplier("Acme Inc");
    setOrders(orders);
  }

  loadOrders();
}, []);
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

Example of using the database service in the main process:

```typescript
// Import the service
import { databaseService } from "../services/databaseService";
import { ExcelRow } from "../types/ExcelRow";

// Example order data
const order: ExcelRow = {
  supplier: "Acme Inc",
  orderNumber: "ORD-001",
  orderDate: new Date("2023-05-15"),
  dueDate: new Date("2023-06-15"),
  description: "Office supplies",
  value: 1200.5,
  currency: "USD",
  confirmed: false,
};

// Insert order into database
const orderId = databaseService.insertOrUpdateOrder(order);

// Get orders for supplier
const orders = databaseService.getOrdersBySupplier("Acme Inc");
```

For a complete example, see the `src/examples/databaseUsageExample.ts` file.

## Electron Integration

The application is built as an Electron desktop app with:

- Cross-platform compatibility (macOS and Windows)
- Native desktop functionality
- File system integration
- Email sending capabilities
- Local database storage

## Development Tools

- **Testing**: Vitest for unit and component testing
- **Linting**: ESLint for code quality
- **Type Checking**: TypeScript for type safety
- **Build**: Electron-Vite for optimized builds

## Security

The application has been built with security best practices for Electron applications:

### Electron Security Measures

- **Context Isolation**: Enabled to prevent direct access to Node.js APIs from the renderer process
- **Node Integration**: Disabled to prevent malicious scripts from accessing Node.js
- **Web Security**: Always enabled, even in development mode
- **Content Security Policy (CSP)**: Implemented to restrict resource loading and script execution
- **Secure Headers**: Added X-Content-Type-Options, X-Frame-Options, and X-XSS-Protection

### Database Security

- **SQLite WAL Mode**: Uses Write-Ahead Logging for better data integrity and crash recovery
- **Prepared Statements**: All SQL queries use parameterized queries to prevent SQL injection
- **Database Audit Logging**: Records all critical database operations
- **Automatic Backups**: Configurable database backup system with retention policy
- **Clean Shutdown**: Ensures database connections are properly closed when the app exits

### Error Handling and Monitoring

- **Comprehensive Logging**: Uses electron-log for structured logging of operations and errors
- **Graceful Shutdown**: Handles application termination safely to prevent data corruption
- **Resource Cleanup**: Ensures all resources are released during app closure

### Best Practices Implemented

- **Memory Management**: Proper cleanup of event listeners and resources to prevent memory leaks
- **Input Validation**: Client-side validation of user inputs before processing
- **Secure Communication**: Uses secure IPC channels with defined message structures
- **Defensive Programming**: Implements checks and safeguards throughout the codebase

To maintain security, ensure you always:

1. Keep the application and its dependencies updated
2. Test thoroughly after any security-related changes
3. Follow the principle of least privilege when adding features
4. Regularly back up the database file

## External Link Handling

The application includes a secure system for opening external links, which is particularly important for:

- Opening documentation links in the user's default browser
- Launching email clients with pre-filled support request templates
- Ensuring platform-specific compatibility

### Security Features

- **URL Validation**: All URLs are validated before opening
- **Platform-Specific Handling**: Special handling for Windows when dealing with mailto: links
- **Comprehensive Error Handling**: Detailed error messages for troubleshooting
- **Fallback Mechanisms**: UI provides alternatives when links cannot be opened

### Usage in UI Components

The external link handler is used in several UI components:

- Help menus for documentation access
- Support buttons for contacting support
- File upload components for accessing documentation

### Implementation

The functionality is implemented through a secure IPC channel between the renderer and main processes:

```typescript
// From renderer (React component)
window.electron.openExternalLink("https://example.com").then((result) => {
  if (!result.success) {
    // Handle error
  }
});

// In main process (Electron)
ipcMain.handle("openExternalLink", async (_, url: string) => {
  // Validation and security checks
  await shell.openExternal(url);
});
```

## Deployment & Installation

The application can be built and deployed as a standalone desktop application for Windows, macOS, and Linux.

### Building the Application

To build the application for distribution:

```bash
# Build for all platforms
npm run dist

# Build only for Windows
npm run dist:win
```

### Windows Silent Installation

The Windows installer supports silent installation, which is ideal for enterprise deployment. This allows IT administrators to deploy the application without user interaction.

For detailed deployment instructions, see the [Deployment Guide](resources/DEPLOYMENT.md).

#### Quick Silent Installation Commands

Using PowerShell:

```powershell
# Install silently with default options
Start-Process -Wait -FilePath "Supplier-Reminder-Pro-1.0.0-setup.exe" -ArgumentList "/S"

# Install to a custom directory
Start-Process -Wait -FilePath "Supplier-Reminder-Pro-1.0.0-setup.exe" -ArgumentList "/S /D=D:\CustomPath"
```

Using the provided deployment scripts:

```powershell
# Using the PowerShell script
.\resources\silent-install.ps1 -InstallerPath "path\to\installer.exe"

# Using the batch wrapper (automatically handles elevation)
.\resources\silent-install.bat -installer "path\to\installer.exe"
```

### Enterprise Deployment

For enterprise environments, the application supports:

1. **Group Policy Deployment** - Deploy via GPO using the silent installation options
2. **Remote Installation** - Deploy remotely using PowerShell remoting
3. **Installation Verification** - Scripts to verify successful installation
4. **Customizable Installation** - Modify installation parameters as needed

For more details on enterprise deployment scenarios, refer to the [Deployment Guide](resources/DEPLOYMENT.md).

## Automatic Updates

Supplier Reminder Pro includes an automatic update system that allows users to receive updates without reinstalling the application. The update system works differently depending on how the application was installed.

### How Automatic Updates Work

1. **Update Detection**: The application checks for updates:

   - At startup (after a 10-second delay)
   - Every hour while the application is running
   - When manually triggered by the user

2. **Update Process**:

   - When an update is available, users are notified
   - Updates are downloaded automatically in the background
   - Users can choose to install updates immediately or later

3. **Installation Requirements**:
   - **MSI Installation (User Level)**: Updates can be installed without administrator rights
   - **NSIS Installation**: Updates may require administrator rights depending on installation type
   - **Portable Version**: Updates can be installed without administrator rights

### Update Configuration

Updates are distributed through the GitHub repository configured in `package.json`:

```json
"publish": [
  {
    "provider": "github",
    "owner": "Isuldra",
    "repo": "Suppliers"
  }
]
```

### Creating Application Updates

To release an update for users:

1. Increment the version number in `package.json`
2. Build and test the application locally
3. Run the release command to publish the update:

```bash
npm run release
```

This will:

- Build the application
- Create installers
- Publish the release to GitHub
- Tag the release with the version number

### Manual Update Check

Users can manually check for updates through the application's Help menu or Settings panel.
