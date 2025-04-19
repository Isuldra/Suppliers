# Excel Import

This document provides detailed information about the Excel import functionality in Supplier Reminder Pro.

## Overview

Excel import is a core feature that allows users to upload supplier data from Excel spreadsheets. This functionality enables seamless integration of existing supplier information into the application.

## Supported File Formats

The application supports the following file formats:

- .xlsx (Excel 2007 and newer)
- .xls (Excel 97-2003)
- .csv (Comma Separated Values)

## Required Sheets and Fields

The Excel import expects specific sheets and fields to be present in the uploaded file:

### Required Sheets

1. **Hovedliste** - Contains the main order information
2. **BP** - Contains business partner information

### Key Fields in Hovedliste

- Key/ID/Nummer - Unique identifier for the order
- Supplier/Leverandør - Name of the supplier
- PO/Purchase Order/Ordre - Purchase order number
- Order Date - Date when order was placed
- Due Date - Expected delivery date
- Value - Order value
- Description - Order description

## Import Process

1. **File Selection**: User selects or drags an Excel file into the application
2. **Validation**: The system validates the file format, required sheets, and fields
3. **Processing**: Data is parsed and transformed into the application's data model
4. **Error Handling**: Any validation errors are displayed to the user
5. **Confirmation**: User reviews and confirms the data before final import
6. **Database Storage**: Data is saved to the local database

## Validation Rules

The application performs the following validations:

1. File format check
2. Required sheets check
3. Column header identification (flexible matching with alternatives)
4. Data type validation for critical fields
5. Business rule validation (dates, values, etc.)

## Error Handling

When validation errors occur, the application:

1. Displays detailed error messages
2. Highlights problematic areas in the data
3. Provides guidance on how to fix the issues
4. Allows partial imports when possible

## Usage Example

```javascript
// React component example for file upload
const handleFileUpload = async (file) => {
  try {
    setIsLoading(true);
    const data = await parseExcelData(file);

    // Validate the data
    const validationResult = await window.electron.validateData(data);

    if (validationResult.errors.length > 0) {
      onValidationErrors(validationResult.errors);
    } else {
      onDataParsed(data);
    }
  } catch (error) {
    console.error("Error processing Excel file:", error);
    toast.error("Kunne ikke prosessere Excel-filen");
  } finally {
    setIsLoading(false);
  }
};
```

## Best Practices

1. **Prepare Your Data**: Ensure your Excel file has properly named sheets and columns
2. **Use Templates**: Whenever possible, use the provided Excel templates
3. **Data Cleaning**: Clean your data before import to avoid validation errors
4. **Test Small Batches**: For large datasets, test with a small batch first
5. **Backup**: Always backup your data before performing large imports

## Troubleshooting

Common issues and their solutions:

1. **File Not Recognized**: Ensure you're using a supported file format
2. **Missing Sheets**: Check that your file contains the required sheets
3. **Column Not Found**: Verify column headers match expected names or alternatives
4. **Data Type Errors**: Check for incorrect data types (e.g., text in number fields)
5. **Import Timeout**: For very large files, try splitting into smaller files

## Related Features

- [Supplier Management](supplier-management.md) - Managing imported supplier data
- [Order Tracking](order-tracking.md) - Tracking orders imported from Excel
