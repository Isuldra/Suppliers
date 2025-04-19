# Order Tracking

This document provides detailed information about the order tracking functionality in Supplier Reminder Pro.

## Overview

Order tracking is a core feature that allows users to monitor the status of orders placed with suppliers. This functionality provides visibility into order progress, due dates, and helps identify orders requiring follow-up.

## Order Data Structure

The application tracks the following information for each order:

- **Order Number**: Unique identifier for the order
- **Supplier**: Associated supplier
- **Order Date**: When the order was placed
- **Due Date**: Expected delivery date
- **Value**: Monetary value of the order
- **Currency**: Currency of the order value
- **Description**: Order details
- **Status**: Current status of the order
- **Confirmation Status**: Whether the order has been confirmed by the supplier
- **Metadata**: Creation and update timestamps

## Order Status Types

Orders can have the following statuses:

1. **Pending**: Order placed but not yet confirmed
2. **Confirmed**: Order confirmed by supplier
3. **In Progress**: Order being processed by supplier
4. **Shipped**: Order has been shipped
5. **Delivered**: Order has been received
6. **Delayed**: Order is confirmed but delayed
7. **Canceled**: Order has been canceled
8. **On Hold**: Order is temporarily on hold

## Key Features

### Order List View

The application provides a comprehensive order list with:

- Sortable and filterable columns
- Status color coding for quick identification
- Due date highlighting (green, orange, red)
- Grouping by supplier or status
- Bulk action capabilities

### Order Detail View

When viewing a specific order, users can see:

- Complete order information
- Status history and changes
- Communication history related to the order
- Notes and comments
- Attached documents or files

### Order Filtering and Searching

Advanced filtering options include:

- Filter by status
- Filter by supplier
- Filter by date range (order date or due date)
- Filter by value range
- Full-text search across order details

### Order Management Actions

Users can perform the following actions on orders:

- Mark as confirmed
- Update status
- Add notes or comments
- Send reminder emails
- Generate reports

## Integration with Other Features

Order tracking integrates with other application features:

- **Excel Import**: Orders can be imported from Excel files
- **Supplier Management**: Orders are associated with specific suppliers
- **Email Reminders**: Reminders can be sent for outstanding orders
- **Reporting**: Reports can be generated based on order status and history

## Data Management

### Validation Rules

The application enforces the following validation rules for order data:

1. Order number is required
2. Supplier association is required
3. Order date and due date must be valid dates
4. Order value must be a valid number

### Data Storage

Order information is stored in the local SQLite database:

- Primary table: `orders`
- Related tables: `order_history`, `order_notes`

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
const confirmOrder = async (supplier, orderNumber) => {
  try {
    const result = await window.electron.markOrderAsConfirmed(
      supplier,
      orderNumber
    );

    if (result) {
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

1. **Missing Orders**: Check import errors or filter settings
2. **Incorrect Status**: Verify status update process and permissions
3. **Duplicate Orders**: Use unique order numbers and check import settings
4. **Performance Issues**: Optimize database queries for large order volumes

## Related Features

- [Excel Import](excel-import.md) - Importing order data
- [Supplier Management](supplier-management.md) - Managing suppliers for orders
- [Email Reminders](email-reminders.md) - Sending reminders for orders
- [Reporting](reporting.md) - Generating reports on order status
