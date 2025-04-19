# Supplier Management

This document provides detailed information about supplier management functionality in Supplier Reminder Pro.

## Overview

Supplier management is a core feature that allows users to maintain, organize, and interact with supplier information. This functionality is essential for managing supplier relationships and tracking orders with each supplier.

## Supplier Data Structure

The application stores the following information for each supplier:

- **Supplier Name**: The primary identifier for the supplier
- **Contact Information**: Email addresses, phone numbers, and contact persons
- **Address**: Physical address information
- **Category**: Optional categorization of suppliers
- **Active Status**: Whether the supplier is currently active
- **Metadata**: Creation and last update timestamps

## Key Features

### Supplier List View

The application provides a comprehensive list view of all suppliers with:

- Sortable and filterable columns
- Quick search functionality
- Bulk action capabilities
- Status indicators

### Supplier Detail View

When viewing a specific supplier, the following information and options are available:

- Complete supplier profile information
- Orders associated with the supplier
- Communication history
- Performance metrics
- Action buttons for common tasks

### Supplier Creation and Editing

The application allows users to:

- Create new suppliers manually
- Edit existing supplier information
- Merge duplicate supplier records
- Deactivate suppliers no longer in use

### Supplier Filtering and Searching

Advanced filtering options include:

- Filter by active/inactive status
- Filter by category
- Filter by order status
- Full-text search across all supplier fields

## Integration with Other Features

Supplier management is tightly integrated with other application features:

- **Excel Import**: Suppliers can be imported from Excel files
- **Order Tracking**: Orders are associated with specific suppliers
- **Email Reminders**: Reminders can be sent to selected suppliers
- **Reporting**: Reports can be generated per supplier or across suppliers

## Data Management

### Validation Rules

The application enforces the following validation rules for supplier data:

1. Supplier name is required and must be unique
2. Email addresses must be properly formatted
3. At least one contact method is required

### Data Storage

Supplier information is stored in the local SQLite database:

- Primary table: `suppliers`
- Related tables: `orders`, `contacts`, `emails_sent`

## Usage Examples

### Finding a Specific Supplier

```jsx
// React component example for supplier search
const SupplierSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    if (searchTerm.length > 2) {
      // Search suppliers using database API
      databaseAPI
        .searchSuppliers(searchTerm)
        .then((results) => setSuppliers(results))
        .catch((error) => console.error("Search error:", error));
    }
  }, [searchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search suppliers..."
      />
      <SuppliersList suppliers={suppliers} />
    </div>
  );
};
```

### Updating Supplier Information

```jsx
const updateSupplier = async (supplierId, updatedData) => {
  try {
    // Update supplier in database
    await databaseAPI.updateSupplier(supplierId, updatedData);
    toast.success("Supplier information updated successfully");
  } catch (error) {
    console.error("Failed to update supplier:", error);
    toast.error("Could not update supplier information");
  }
};
```

## Best Practices

1. **Regular Updates**: Keep supplier information up-to-date
2. **Data Consistency**: Maintain consistent naming conventions
3. **Avoid Duplicates**: Check for existing suppliers before creating new ones
4. **Categorization**: Use categories to organize suppliers effectively
5. **Archive Don't Delete**: Deactivate suppliers instead of deleting them

## Troubleshooting

Common issues and their solutions:

1. **Duplicate Suppliers**: Use the merge functionality to combine duplicate records
2. **Incorrect Contact Info**: Verify supplier contact information periodically
3. **Missing Suppliers**: Check import errors or filter settings
4. **Performance Issues**: Optimize database queries for large supplier databases

## Related Features

- [Excel Import](excel-import.md) - Importing supplier data
- [Email Reminders](email-reminders.md) - Sending reminders to suppliers
- [Order Tracking](order-tracking.md) - Tracking orders by supplier
