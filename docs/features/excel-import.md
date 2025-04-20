# Excel Import

This document provides detailed information about the Excel import functionality in SupplyChain OneMed.

## Overview

Excel import is a core feature that allows users to upload order and supplier status data from specific Excel spreadsheets. This functionality enables the primary workflow of loading data into the SupplyChain OneMed application for review and generating email reminders.

## Supported File Format

The application currently supports importing data only from:

- **.xlsx** (Excel 2007 and newer) files via the drag-and-drop interface.

_(Support for `.xls` or `.csv` is not currently enabled in the UI.)_

## Required Sheets and Fields

The Excel import expects specific sheets and fields to be present in the uploaded `.xlsx` file:

### Required Sheets Check

The application validates the presence of the following sheets:

1.  **Hovedliste**: Contains the main order information used throughout the wizard.
2.  **BP**: Required for the file to be accepted, but **its data is not currently processed or stored** by the application.

### Processed Sheets & Data Usage

- **Hovedliste**: Data from this sheet is parsed and used in the main wizard flow (Data Review, Email). It is likely saved to the `orders` table in the database.
  - **Key Mapped Fields**: The parser attempts to map columns to internal fields using flexible header names (e.g., `key` from 'Key'/'ID'/'Nøkkel'/'A', `supplier` from 'Supplier'/'Leverandør'/'I', `poNumber` from 'PO'/'B', `itemNo` from 'Item No.'/'E', `description` from 'Item description'/'J', `specification` from 'Specification'/'K', `orderQty` from 'OrdQtyPO'/'O').
- **Sjekkliste Leverandører \***: Any sheets starting with this name are processed _during initial database creation only_. Data (supplier, day, week, status, email) is extracted and stored in the `weekly_status` table.

## Import Process (Wizard Flow)

The import process follows these steps within the application's main wizard:

1.  **File Selection (`FileUpload.tsx`)**: User drags or selects an `.xlsx` file.
2.  **Parsing & Initial Validation (`FileUpload.tsx`)**:
    - The application parses the `.xlsx` file using the `xlsx` library.
    - It validates the file format (`.xlsx` only).
    - It validates the presence of `Hovedliste` and `BP` sheets.
    - It validates the presence of key column headers (`key`, `supplier`, `poNumber`) in `Hovedliste` using flexible matching.
    - If initial validation fails, errors are shown via toast notifications.
3.  **Wizard Progression**: If parsing and initial validation succeed, the parsed data (primarily from `Hovedliste`) is passed to the next steps of the wizard (Planner Selection, Weekday Selection, Supplier Selection).
4.  **Data Review (`DataReview.tsx`)**: User reviews the filtered order data from `Hovedliste` for the selected supplier.
5.  **Email Preparation (`EmailButton.tsx`)**: User proceeds to prepare an email reminder based on the reviewed data.
6.  **Database Storage**:
    - _Initial Import_: If the database file (`app.sqlite`) doesn't exist when the application starts, the `importAlleArk` function is called, which parses the selected Excel file and populates the `weekly_status` and `purchase_order` tables.
    - _Subsequent Imports_: The `FileUpload.tsx` component calls `window.electron.saveOrdersToDatabase` after successful parsing, likely intended to update the `orders` table (requires verification of the handler logic).

## Validation Rules

The application performs the following validations primarily within the `FileUpload.tsx` component during parsing:

1.  **File Format**: Checks if the dropped file is `.xlsx`.
2.  **Required Sheets**: Checks for the existence of `Hovedliste` and `BP` sheets.
3.  **Column Headers**: Checks for the presence of essential column headers (`key`, `supplier`, `poNumber`) in `Hovedliste` using alternative names.
4.  _(Note: The `window.electron.validateData` IPC call mentioned in previous examples performs an unrelated ODBC check and is not part of the core Excel file validation.)_

## Error Handling

When parsing or initial validation errors occur:

1.  Error messages are displayed using toast notifications.
2.  Detailed console logs may provide more information for debugging.
3.  Highlighting problematic data within the file or allowing partial imports is **not** currently supported.

## Usage Example

_(The previous code example involving `window.electron.validateData` was misleading regarding file validation and has been removed. The core logic involves the `useDropzone` hook and the internal `parseExcelData` and `validateExcelData` functions within `FileUpload.tsx`.)_

## Best Practices

1.  **Use `.xlsx` Format**: Ensure your file is saved in the `.xlsx` format.
2.  **Correct Sheets**: Verify the file contains sheets named exactly `Hovedliste` and `BP`.
3.  **Consistent Headers**: Use clear and consistent headers in `Hovedliste` that match one of the expected alternatives (e.g., 'Leverandør' or 'Supplier').
4.  **Manual Update**: **Crucially, ensure the data within the Excel file is up-to-date before uploading.** The application reads the file as-is and does not connect to external sources to refresh it.
5.  **Backup**: Keep backups of your original Excel files.

## Troubleshooting

Common issues and their solutions:

1.  **File Not Recognized**: Ensure you're uploading an `.xlsx` file.
2.  **Missing Sheets Error**: Check that sheets named `Hovedliste` and `BP` exist in your workbook.
3.  **Column Not Found Error**: Verify essential column headers (Supplier, PO Number, Key/ID) are present in `Hovedliste`.
4.  **Parsing Errors**: The file might be corrupted, password-protected, or have an unusual internal structure. Try resaving the file in Excel.

## Related Features

- [Order Tracking](order-tracking.md) - Displays data imported from the `Hovedliste` sheet.
- [Database Storage](database-storage.md) - Describes where imported data is stored.
