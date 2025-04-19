# Email Reminders

This document provides detailed information about the email reminders functionality in Supplier Reminder Pro.

## Overview

The email reminders feature allows users to send automated or manual reminder emails to suppliers regarding outstanding orders. This functionality helps maintain communication with suppliers and track order status effectively.

## Email Reminder Types

The application supports several types of email reminders:

1. **Initial Reminders**: First communication about order status
2. **Follow-up Reminders**: Subsequent communications when no response is received
3. **Urgent Reminders**: For orders approaching or past their due dates
4. **Batch Reminders**: Combining multiple orders in a single email
5. **Custom Reminders**: User-created reminders for specific situations

## Email Template System

### Default Templates

The application includes several default email templates:

- **Standard Reminder**: General reminder for outstanding orders
- **Urgent Reminder**: For orders that are critically late
- **Weekly Summary**: Summary of all outstanding orders
- **Confirmation Request**: Specifically requesting order confirmation

### Template Variables

Templates support the following variables that are automatically replaced with actual data:

- `{{supplierName}}` - Name of the supplier
- `{{orderNumbers}}` - List of order numbers
- `{{orderDetails}}` - Detailed table of orders
- `{{dueDate}}` - Due date for orders
- `{{companyName}}` - User's company name
- `{{contactPerson}}` - Contact person's name
- `{{contactEmail}}` - Contact email address
- `{{today}}` - Current date

### Custom Templates

Users can create and save custom email templates:

1. Start with an existing template or create a new one
2. Edit the content using the rich text editor
3. Add variables using the variable selector
4. Preview the template with real data
5. Save template for future use

## Sending Process

### Manual Email Sending

1. Select one or more suppliers
2. Choose the email template
3. Review and customize the email content
4. Select which orders to include
5. Send the email

### Scheduled Reminders

Configure automatic reminders with:

1. Frequency settings (daily, weekly, etc.)
2. Template selection
3. Supplier filtering options
4. Automatic follow-up rules

## Tracking and History

All email communications are tracked in the application:

- **Sent Date/Time**: When the email was sent
- **Recipient**: Supplier email address
- **Subject**: Email subject line
- **Content**: Copy of the email content
- **Orders**: Which orders were included
- **Status**: Delivery status if available

## Email Client Integration

The application can send emails through:

1. **Default Email Client**: Opens the user's email client
2. **SMTP Server**: Direct sending through configured SMTP
3. **Email Service APIs**: Integration with email service providers

## Usage Examples

### Sending a Reminder Email

```jsx
// Example of sending a reminder email
const sendReminderEmail = async (supplier, orders) => {
  try {
    // Prepare email data
    const emailData = {
      recipient: supplier.email,
      subject: `Order Reminder: ${orders.length} Outstanding Orders`,
      template: "standard-reminder",
      templateData: {
        supplierName: supplier.name,
        orderNumbers: orders.map((o) => o.orderNumber).join(", "),
        orderDetails: generateOrderTable(orders),
        dueDate: formatDate(getLatestDueDate(orders)),
        companyName: "OneMed AS",
        contactPerson: "John Doe",
        contactEmail: "john.doe@onemed.com",
      },
    };

    // Send the email
    const result = await window.electron.sendEmail(emailData);

    if (result.success) {
      // Record that the email was sent
      await window.electron.recordEmailSent(
        supplier.name,
        supplier.email,
        emailData.subject,
        orders.length
      );
      toast.success("Reminder email sent successfully");
    } else {
      toast.error(`Failed to send email: ${result.error}`);
    }
  } catch (error) {
    console.error("Error sending reminder:", error);
    toast.error("Could not send reminder email");
  }
};
```

### Creating a Custom Template

```jsx
const saveCustomTemplate = async (templateName, templateContent) => {
  try {
    await databaseAPI.saveEmailTemplate({
      name: templateName,
      content: templateContent,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    toast.success("Email template saved successfully");
  } catch (error) {
    console.error("Failed to save template:", error);
    toast.error("Could not save email template");
  }
};
```

## Best Practices

1. **Personalization**: Always personalize emails with supplier names and specific order details
2. **Clarity**: Keep emails clear and concise, highlighting the key information
3. **Consistency**: Maintain a consistent communication schedule
4. **Professional Tone**: Use professional language and formatting
5. **Follow-up**: Establish a clear follow-up process for non-responsive suppliers

## Troubleshooting

Common issues and their solutions:

1. **Emails Not Sending**: Check SMTP settings or default email client configuration
2. **Template Variables Not Working**: Verify correct variable syntax `{{variableName}}`
3. **Missing Order Details**: Ensure orders are properly associated with suppliers
4. **Email Client Not Opening**: Check system default email client settings
5. **HTML Formatting Issues**: Use the preview function to check formatting before sending

## Related Features

- [Supplier Management](supplier-management.md) - Managing supplier contact information
- [Order Tracking](order-tracking.md) - Tracking which orders need reminders
- [Reporting](reporting.md) - Reporting on email communication effectiveness
