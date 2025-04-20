# Order Tracking

This document provides detailed information about the order tracking functionality in SupplyChain OneMed.

## Overview

Order tracking is a core feature within the SupplyChain OneMed application that allows users to monitor the status of orders placed with suppliers, primarily focusing on whether an order is confirmed and its due date relative to the current date.

## Order Data Structure (`orders` Table)

The application tracks the following information for each order in the `orders` table:

- `id`: Primary key
- `reference`: Order reference (optional)
- `supplier`: Supplier name (required)
- `orderNumber`: Order number (optional, unique per supplier)
- `orderDate`: Date order was placed (stored as text)
- `dueDate`: Expected delivery date (stored as text)
- `category`: Order category (optional)
- `description`: Order description (optional)
- `value`: Monetary value (optional)
- `currency`: Currency code (optional)
- `confirmed`: Flag indicating if the order is confirmed (0 = no, 1 = yes)
- `createdAt`: Timestamp when the record was created
- `updatedAt`: Timestamp when the record was last updated
- `email_sent_at`: Timestamp when the last reminder email was sent for this order (or related batch)

## Order Status (Display Logic)

While the database primarily tracks confirmation via the `confirmed` flag, the UI (`DataReview` component) computes a display status based on the `dueDate` relative to the current date:

1.  **Overdue**: `dueDate` is in the past.
2.  **Critical**: `dueDate` is within the next 7 days.
3.  **Normal**: `dueDate` is more than 7 days away.

The previously documented statuses (Pending, In Progress, Shipped, etc.) are **not** currently stored or used in the application logic.

## Key Features

### Order List View (`DataReview.tsx`)

The application provides an order review table with:

- **Displayed Columns**: Computed Status, Due Date, PO Number, Item Number, Description, Specification, Order Qty, Received Qty, Outstanding Qty, Date, Key.
- **Sorting**: Columns are sortable via header clicks (powered by `@tanstack/react-table`).
- **Filtering**:
  - Quick filter buttons for computed status (All, Outstanding, Critical, Overdue, This Week).
  - Date filtering component for the 'Date' column.
  - Filtering is implicitly done by Supplier/Weekday based on the preceding wizard steps.
  - Filtering by value range or full-text search is **not** currently implemented.
- **Highlighting**:
  - Status column is color-coded (Red/Orange/Green).
  - Outstanding Qty is highlighted if > 0.
- **Grouping / Bulk Actions**: Grouping rows or performing bulk actions (e.g., mark multiple as confirmed) is **not** currently implemented.

### Order Detail View

A dedicated view for showing the detailed history, notes, or attachments for a single order is **not** currently implemented.

### Order Filtering and Searching

Filtering capabilities within the `DataReview` component include:

- Filter by computed status (via quick filter buttons).
- Filter by Date Range (via `DateFilter` component).
- Filtering by supplier/weekday is determined by wizard context.
- Filtering by value range or full-text search is **not** currently implemented.

### Order Management Actions

From the context of the order data, the primary action supported is:

- **Mark as Confirmed**: Updates the `confirmed` flag for an order in the database (via `window.electron.markOrderAsConfirmed` or similar IPC call).
- **Send Reminder Emails**: This action is available _after_ the `DataReview` step in the wizard, using the filtered data, not as a direct action on a single order row typically.
- Updating to other statuses or adding notes/attachments is **not** currently implemented.

## Integration with Other Features

Order tracking integrates with other application features:

- **Excel Import**: Orders can be imported from Excel files
- **Supplier Management**: Orders are associated with specific suppliers
- **Email Reminders**: Reminders can be sent for outstanding orders
- **Reporting**: Reports can be generated based on order status and history

## Data Management

### Validation Rules

Database constraints enforce some rules (e.g., supplier required, supplier/orderNumber unique). Specific input validation for dates/values may occur during import or editing (if editing is implemented).

### Data Storage

Order information is stored in the local SQLite database:

- Primary table: `orders`.
- Related tables like `order_history` or `order_notes` are **not** currently used.

## Usage Examples

### Retrieving Orders for a Supplier

```jsx
// React component example for retrieving supplier orders
const SupplierOrders = ({ supplierName }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        // Get orders using database API
        const result = await window.electron.getOrdersBySupplier(supplierName);

        if (result.success) {
          setOrders(result.data || []);
        } else {
          console.error("Failed to load orders:", result.error);
          toast.error("Could not load supplier orders");
        }
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [supplierName]);

  return (
    <div>
      <h2>Orders for {supplierName}</h2>
      {loading ? <LoadingSpinner /> : <OrderTable orders={orders} />}
    </div>
  );
};
```

### Marking an Order as Confirmed

```jsx
// Example React code snippet
const confirmOrder = async (supplier, orderNumber) => {
  try {
    // Assumes an API function exposed via preload, e.g.:
    // window.electron.markOrderAsConfirmed(supplier, orderNumber)
    const result = await window.electron.markOrderAsConfirmed(
      supplier,
      orderNumber
    );

    if (result) {
      // Assuming the API returns true on success
      toast.success("Order marked as confirmed");
      refreshOrders(); // Function to refresh the order list
    } else {
      toast.error("Failed to update order status");
    }
  } catch (error) {
    console.error("Error confirming order:", error);
    toast.error("Could not update order status");
  }
};
```

## Best Practices

1. **Regular Updates**: Keep order status up-to-date
2. **Follow-up Schedule**: Establish a regular schedule for checking order status
3. **Documentation**: Document all communication regarding orders
4. **Clear Labeling**: Use consistent status terminology
5. **Prioritization**: Focus on orders approaching due dates

## Troubleshooting

Common issues and their solutions:

1. **Missing Orders**: Check Excel import details or the filters applied in the `DataReview` component.
2. **Incorrect Status**: The display status is calculated based on `dueDate`. Verify the `dueDate` is correct in the data. The `confirmed` flag (0 or 1) is the stored confirmation status.
3. **Duplicate Orders**: The database has a unique constraint on `(supplier, orderNumber)`. Check the source data for duplicates if import fails.
4. **Performance Issues**: Should be minimal with current implementation, but ensure database indexes are present.

## Related Features

- [Excel Import](excel-import.md) - Importing order data
- [Supplier Management](supplier-management.md) - Managing suppliers for orders
- [Email Reminders](email-reminders.md) - Sending reminders for orders
- [Reporting](reporting.md) - Generating reports on order status
