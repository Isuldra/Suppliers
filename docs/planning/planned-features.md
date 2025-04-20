# Planned Features & Enhancements

This document outlines planned features and potential future enhancements for the SupplyChain OneMed application. It serves as a reference for development priorities and desired functionality that is not yet implemented.

## Feature Areas

### Email Template Enhancements

The current email template system (documented in `docs/features/email-templates.md`) is basic, relying on hardcoded templates. The following enhancements are desired to create a more flexible and user-friendly system:

- **Database Storage:**
  - Store email templates (metadata, subject, HTML body, plain text alternative) in the application database (e.g., a dedicated `email_templates` table).
  - Allow users to save custom templates.
- **Template Management UI:**
  - Provide a UI for users to create, edit, duplicate, and delete templates.
  - Include a Rich Text Editor (WYSIWYG) and potentially a direct HTML editor view.
  - Implement template categories for organization (e.g., Standard Reminder, Urgent, Confirmation Request, Custom).
  - Add search and filtering capabilities to the template list.
- **Advanced Editing Features:**
  - **Variable Insertion:** UI helper to easily insert available placeholders (`{{variableName}}`) into the subject and body.
  - **Live Preview:** Allow users to preview the rendered template using sample data.
  - **Version History:** (Optional) Track changes to templates with the ability to revert to previous versions.
- **Custom Handlebars Helpers:**
  - Implement and register useful helpers for formatting within templates:
    - `formatDate`: Format dates according to locale/preference (e.g., `{{formatDate orderDate}}` -> "15.05.2023").
    - `formatCurrency`: Format numerical values as currency (e.g., `{{formatCurrency orderValue "NOK"}}` -> "kr 1.250,50").
    - `pluralize`: Handle singular/plural words based on counts (e.g., `{{pluralize orderCount "order" "orders"}}`).
- **Template Structure Improvements:**
  - Store and use the subject line directly from the template data.
  - Generate and store a plain text alternative automatically from the HTML or allow manual editing.
  - Add support for defining default attachments per template.
- **Import/Export:**
  - Allow users to export custom templates (e.g., as JSON or a custom format) and import them into another instance of the application.

### Wizard Framework Enhancements

The current wizard implementation (documented in `docs/features/wizard-interface.md`) is specific to the Excel Import -> Email workflow and managed directly within `App.tsx`. A planned enhancement is to refactor this into a reusable, generic wizard framework.

**Goals:**

- Create a reusable `WizardContainer` component.
- Implement a robust state management solution (e.g., a `WizardManager` class, Zustand store, or React Context) separate from individual wizard logic.
- Support different types of wizards (Excel Import, Email Reminder, Supplier Creation, etc.) using the same framework.

**Desired Components & Structure:**

- **`WizardContainer` Component:**
  - **Props:** `steps` (array of step configurations), `initialData` (optional), `onComplete` (callback), `onCancel` (callback).
  - **Responsibilities:** Renders the overall wizard structure (header, progress indicators, content area, footer with navigation buttons), manages the current step display, passes data down to the active step component, and handles navigation logic based on validation.
- **Generic State Management:**
  - Manage `currentStep`, `data` across all steps, `errors`, `isComplete` status.
  - Handle transitions (`nextStep`, `previousStep`), data updates (`updateData`), step validation (`validateCurrentStep`), and potentially conditional step visibility (`updateVisibleSteps`).
- **`WizardStep` Configuration:**
  - Define a standard interface for configuring each step passed to the container:
    ```typescript
    interface WizardStep {
      id: string; // Unique identifier for the step
      title: string; // Title displayed in progress indicator
      component: React.ComponentType<StepProps>; // The React component for this step
      validate?: (stepData: any, allData: Record<string, any>) => boolean; // Optional validation function
      isVisible?: (allData: Record<string, any>) => boolean; // Optional function to determine step visibility
      // Potentially other config like isOptional, validationRules, etc.
    }
    interface StepProps {
      data: any; // Data specific to this step
      onChange: (newData: any) => void; // Callback to update step data
      allData?: Record<string, any>; // Access to all wizard data (use with caution)
    }
    ```
- **Draft Saving:**
  - Implement automatic draft saving (e.g., to `localStorage` or the database) within the generic framework to prevent data loss if the user navigates away or closes the application.

### Data Export

A feature is needed to allow users to export data from the application. While internal dashboards are planned for analysis, export provides mechanisms for external auditing, compliance verification (e.g., demonstrating GDPR adherence regarding any potentially relevant contact data), user data control, and offline archival.

**Desired Capabilities:**

- **Exportable Data:**
  - Suppliers (full list or filtered)
  - Orders (full list or filtered by supplier, date range, status, etc.)
  - Communication History (email logs)
  - Data from generated Reports
- **Supported Formats:**
  - **Excel (.xlsx):** Formatted, multi-sheet where appropriate (e.g., separate sheets for different suppliers or data types).
  - **CSV (.csv):** Simple text format, UTF-8 encoded, suitable for large datasets.
  - **PDF (.pdf):** (Optional) Formatted reports, potentially with basic branding/headers.
  - **JSON (.json):** (Optional) Structured data suitable for programmatic use.
- **User Interface:**
  - Provide an "Export" option in relevant application sections (e.g., Supplier list, Order list, Report view).
  - Implement an Export Configuration Dialog allowing users to select:
    - Data to export (e.g., current view, all suppliers, specific orders).
    - Output format (Excel, CSV, etc.).
    - Filters to apply (reuse existing application filters where possible).
    - Fields/columns to include.
    - File name and save location (using Electron's `dialog.showSaveDialog`).
- **Implementation Notes:**
  - Use appropriate libraries (e.g., `xlsx` for Excel, potentially `papaparse` for CSV).
  - Handle data fetching from `DatabaseService`.
  - Consider performance for large datasets (potential background processing, progress indication).
  - Ensure data privacy and basic sanitization.

### Security Enhancements

Several areas can be improved to further harden the application based on Electron security recommendations:

- **Enable Sandbox:** The Electron sandbox (`webPreferences: { sandbox: true }`) should be enabled if possible. This provides the strongest process isolation for the renderer. Investigate and resolve any compatibility issues (e.g., with native modules or specific Node features used inadvertently via preload) that currently prevent its use.
- **Consolidate Header Application:** Refactor the setting of security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) into a single, reliable `session.defaultSession.webRequest.onHeadersReceived` listener in the main process initialization (`app.whenReady`). This avoids potential conflicts or ordering issues from using multiple listeners.
- **Review `unsafe-inline` in CSP:** Investigate the necessity of `'unsafe-inline'` in the `style-src` directive of the Content Security Policy. If possible, remove it by refactoring CSS or using hashes/nonces for inline styles to further mitigate potential XSS risks.
- **Input Validation & Sanitization:** Conduct a thorough review of all IPC handlers and functions processing external input (user data, file contents) to ensure robust validation and sanitization are applied, preventing potential injection attacks (XSS, SQLi etc.).
- **Database Encryption:** Implement optional database encryption using a standard library like `sqlcipher` (potentially via `better-sqlite3-sqlcipher`) to protect sensitive data at rest, especially if the application handles confidential supplier or order information.
- **Secure Update Hosting:** Ensure the manual release artifacts (installers, `latest.yml`) are hosted on a secure (HTTPS) and reliable location accessible only for authorized distribution.

### Reporting Enhancements

A dedicated reporting feature is desired to provide insights into supplier performance, order status, and communication effectiveness.

**Desired Capabilities:**

- **Report Types:**
  - **Supplier Performance:** Overview, On-Time Delivery %, Response Rate, Order Volume.
  - **Order Status:** Outstanding Orders, Orders by Status/Due Date, Full Order History.
  - **Communication:** Email Summary, Reminder Effectiveness, Communication Frequency.
- **Generation & Filtering:**
  - On-demand generation.
  - Filtering by Date Range, Supplier, Order Status, etc.
  - (Optional Future) Scheduled (daily/weekly/monthly) or event-triggered reports.
- **Visualization & Interactivity:**
  - Display data using Tables and potentially Charts (Bar, Line, Pie).
  - Allow basic interactivity like sorting and filtering within the report view.
  - (Optional Future) Drill-down capabilities.
- **Data Sources:** Utilize data primarily from the `orders` and `audit_log` tables in the local SQLite database.
- **Export:** Allow exporting generated reports to common formats like Excel (.xlsx) and potentially PDF or CSV (linking to the planned Data Export feature).
- **UI:** Implement dedicated components for configuring, viewing, and interacting with reports.

### Integration Features

_(Placeholder for future integration ideas, e.g., with ERP systems)_

### Supplier Management Enhancements

Currently, supplier selection relies on static JSON data. A full supplier management feature is desired.

**Desired Capabilities:**

- **Data Storage**: Store supplier information in a dedicated `suppliers` table in the database, including:
  - Name (Primary Identifier, Unique)
  - Contact Information (Email, Phone, Contact Person - potentially in a related `contacts` table)
  - Address
  - Category (Optional)
  - Active Status
  - Creation/Update Timestamps
- **UI - List View**: Provide a dedicated screen to list all suppliers from the database with:
  - Sortable/Filterable columns (Name, Category, Status).
  - Quick search functionality.
- **UI - Detail View**: Allow viewing a single supplier's details:
  - Full profile information.
  - Associated orders (linked from `orders` table).
  - Potentially communication history (if email history tracking is enhanced).
  - Action buttons (Edit, Deactivate, etc.).
- **CRUD Operations**: Implement functionality to:
  - Create new suppliers manually via a form.
  - Edit existing supplier details.
  - Deactivate/Reactivate suppliers (soft delete).
  - (Optional) Merge duplicate supplier records.
- **Data Validation**: Enforce rules like unique supplier names, valid email formats.
- **Integration**: Update the wizard's `SupplierSelect` component to potentially use the database as a source instead of, or in addition to, the static JSON.

### User Roles & Permissions

_(Placeholder for ideas related to multi-user support or administrative controls)_

---

_Note: This document is for planning purposes. Implementation details and priorities may change._
