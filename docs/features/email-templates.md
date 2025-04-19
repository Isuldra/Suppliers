# Email Templates

This document provides detailed information about the email templates functionality in Supplier Reminder Pro.

## Overview

Email templates provide a flexible system for creating, customizing, and managing email content for supplier communications. This feature enables users to maintain consistent messaging while allowing for personalization and customization for different communication scenarios.

## Template System

### Template Structure

Each email template consists of:

- **Metadata**: Template name, description, creation date, and category
- **Subject Line**: Customizable email subject with variable support
- **HTML Body**: Rich text content with formatting and variable placeholders
- **Plain Text Alternative**: Text-only version for email clients that don't support HTML
- **Attachments**: Optional default attachments to include with emails

### Variable Placeholders

Templates support dynamic content through variable placeholders:

- **Syntax**: Double curly braces format - `{{variableName}}`
- **Conditional Sections**: Optional content blocks shown based on data availability
- **Iteration Blocks**: Repeating sections for lists like orders or products
- **Formatting Helpers**: Functions to format dates, currency, and numbers

### Template Types

The application includes several template categories:

- **Standard Reminder**: For routine follow-up communications
- **Urgent Reminder**: For critical or overdue items
- **Confirmation Request**: For requesting order confirmations
- **Weekly Summary**: For regular status updates
- **Custom Templates**: User-defined templates for specific needs

## Default Templates

The application comes with pre-built templates:

### Basic Reminder Template

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #333;
      }
      .header {
        background-color: #497886;
        color: white;
        padding: 20px;
      }
      .content {
        padding: 20px;
      }
      .footer {
        font-size: 12px;
        color: #666;
        padding: 20px;
        border-top: 1px solid #eee;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Order Reminder</h2>
    </div>
    <div class="content">
      <p>Dear {{supplierName}},</p>

      <p>
        We would like to follow up on the following order(s) that we have placed
        with your company:
      </p>

      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Order Date</th>
            <th>Due Date</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {{#each orders}}
          <tr>
            <td>{{orderNumber}}</td>
            <td>{{formatDate orderDate}}</td>
            <td>{{formatDate dueDate}}</td>
            <td>{{description}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <p>
        Please confirm receipt of this email and provide an update on the status
        of these orders.
      </p>

      <p>Thank you for your prompt attention to this matter.</p>

      <p>
        Best regards,<br />
        {{contactPerson}}<br />
        {{companyName}}
      </p>
    </div>
    <div class="footer">
      <p>
        This is an automated message from OneMed SupplyChain. If you have any
        questions, please contact {{contactEmail}}.
      </p>
    </div>
  </body>
</html>
```

### Urgent Reminder Template

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #333;
      }
      .header {
        background-color: #e63946;
        color: white;
        padding: 20px;
      }
      .content {
        padding: 20px;
      }
      .urgent {
        color: #e63946;
        font-weight: bold;
      }
      .footer {
        font-size: 12px;
        color: #666;
        padding: 20px;
        border-top: 1px solid #eee;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>URGENT Order Reminder</h2>
    </div>
    <div class="content">
      <p>Dear {{supplierName}},</p>

      <p class="urgent">
        URGENT: We require immediate attention to the following orders that are
        past due or approaching their deadline:
      </p>

      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Order Date</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {{#each orders}}
          <tr>
            <td>{{orderNumber}}</td>
            <td>{{formatDate orderDate}}</td>
            <td>{{formatDate dueDate}}</td>
            <td>{{daysOverdue}}</td>
            <td>{{description}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <p>
        Please provide an immediate update on these orders as they are critical
        to our operations.
      </p>

      <p>
        If there are any issues preventing fulfillment, please contact us
        immediately.
      </p>

      <p>
        Best regards,<br />
        {{contactPerson}}<br />
        {{companyName}}<br />
        {{contactEmail}}<br />
        {{contactPhone}}
      </p>
    </div>
    <div class="footer">
      <p>
        This is an automated message from OneMed SupplyChain. If you have any
        questions, please contact {{contactEmail}}.
      </p>
    </div>
  </body>
</html>
```

## Template Management

### Creation and Editing

Users can create and edit templates through the template editor:

- **Rich Text Editor**: WYSIWYG interface for formatting
- **HTML Editor**: Direct HTML editing for advanced users
- **Variable Insertion**: UI for inserting available variables
- **Preview Mode**: Live preview with sample data
- **Version History**: Track changes with ability to revert

### Storage and Retrieval

Templates are stored in the application database:

- **Templates Table**: Stores template metadata and content
- **Template Categories**: Organizes templates by purpose
- **Search and Filter**: Quick access to relevant templates
- **Import/Export**: Share templates between installations

## Template Variables

### Standard Variables

The following standard variables are available in all templates:

| Variable            | Description           | Example               |
| ------------------- | --------------------- | --------------------- |
| `{{supplierName}}`  | Name of the supplier  | "Acme Supplies, Inc." |
| `{{companyName}}`   | Your company name     | "OneMed AS"           |
| `{{contactPerson}}` | Your contact person   | "John Doe"            |
| `{{contactEmail}}`  | Contact email address | "john.doe@onemed.com" |
| `{{contactPhone}}`  | Contact phone number  | "+47 12345678"        |
| `{{today}}`         | Current date          | "2023-05-15"          |

### Order Variables

When including order information:

| Variable          | Description                          | Example            |
| ----------------- | ------------------------------------ | ------------------ |
| `{{orders}}`      | Collection of orders (for iteration) | -                  |
| `{{orderNumber}}` | Order reference number               | "PO-12345"         |
| `{{orderDate}}`   | Date order was placed                | "2023-04-01"       |
| `{{dueDate}}`     | Expected delivery date               | "2023-05-15"       |
| `{{description}}` | Order description                    | "Medical supplies" |
| `{{value}}`       | Order value                          | 1250.50            |
| `{{currency}}`    | Currency code                        | "NOK"              |
| `{{daysOverdue}}` | Days past due date                   | 5                  |

### Helper Functions

Format data with helper functions:

| Function                              | Description     | Example                 |
| ------------------------------------- | --------------- | ----------------------- |
| `{{formatDate date}}`                 | Format date     | "15.05.2023"            |
| `{{formatCurrency amount currency}}`  | Format currency | "kr 1,250.50"           |
| `{{pluralize count singular plural}}` | Pluralization   | "1 order" or "5 orders" |

## Implementation Details

### Template Engine

The application uses Handlebars.js for template processing:

```typescript
// Example of template rendering implementation
import Handlebars from "handlebars";
import { format } from "date-fns";

// Register helper functions
Handlebars.registerHelper("formatDate", function (date) {
  if (!date) return "";
  return format(new Date(date), "dd.MM.yyyy");
});

Handlebars.registerHelper("formatCurrency", function (value, currency) {
  if (value === undefined || value === null) return "";

  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: currency || "NOK",
  }).format(value);
});

Handlebars.registerHelper("pluralize", function (count, singular, plural) {
  return count === 1 ? singular : plural;
});

// Template rendering function
export function renderEmailTemplate(
  templateHtml: string,
  data: Record<string, any>
) {
  try {
    // Compile the template
    const template = Handlebars.compile(templateHtml);

    // Render with data
    return template(data);
  } catch (error) {
    console.error("Template rendering error:", error);
    throw new Error(`Failed to render email template: ${error.message}`);
  }
}
```

### Template Editor Component

```jsx
// React component example for template editor
const TemplateEditor = ({ template, onSave }) => {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [htmlContent, setHtmlContent] = useState(template?.htmlContent || "");
  const [previewData, setPreviewData] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Load sample data for preview
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const result = await window.electron.getSampleTemplateData();
        if (result.success) {
          setPreviewData(result.data);
        }
      } catch (error) {
        console.error("Failed to load sample data:", error);
        toast.error("Could not load sample data for preview");
      }
    };

    loadSampleData();
  }, []);

  const handleSave = async () => {
    try {
      const result = await window.electron.saveEmailTemplate({
        id: template?.id,
        name,
        subject,
        htmlContent,
        plainTextContent: convertToPlainText(htmlContent),
        updatedAt: new Date().toISOString(),
      });

      if (result.success) {
        toast.success("Template saved successfully");
        onSave(result.data);
      } else {
        toast.error(`Failed to save template: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Could not save email template");
    }
  };

  const insertVariable = (variable) => {
    // Insert variable at cursor position in rich text editor
    setHtmlContent((current) => {
      // Logic to insert at cursor position
      return insertAtCursor(current, `{{${variable}}}`);
    });
  };

  return (
    <div className="template-editor">
      <div className="editor-header">
        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter template name"
          />
        </div>

        <div className="form-group">
          <label>Email Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
          />
        </div>
      </div>

      <div className="editor-toolbar">
        <button onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? "Edit Template" : "Preview Template"}
        </button>

        {!previewMode && (
          <div className="variable-selector">
            <select onChange={(e) => insertVariable(e.target.value)}>
              <option value="">Insert Variable...</option>
              <option value="supplierName">Supplier Name</option>
              <option value="companyName">Company Name</option>
              {/* More variables */}
            </select>
          </div>
        )}
      </div>

      {previewMode ? (
        <div className="template-preview">
          <h3>Subject: {renderEmailTemplate(subject, previewData || {})}</h3>
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{
              __html: renderEmailTemplate(htmlContent, previewData || {}),
            }}
          />
        </div>
      ) : (
        <RichTextEditor value={htmlContent} onChange={setHtmlContent} />
      )}

      <div className="editor-actions">
        <button
          onClick={handleSave}
          disabled={!name || !subject || !htmlContent}
        >
          Save Template
        </button>
      </div>
    </div>
  );
};
```

## Usage Examples

### Sending an Email with a Template

```jsx
// Example of using a template to send an email
const sendEmail = async (supplier, orders, templateId) => {
  try {
    // Get the template
    const templateResult = await window.electron.getEmailTemplate(templateId);

    if (!templateResult.success) {
      throw new Error(`Could not load template: ${templateResult.error}`);
    }

    const template = templateResult.data;

    // Prepare data for template
    const templateData = {
      supplierName: supplier.name,
      companyName: "OneMed AS",
      contactPerson: "John Doe",
      contactEmail: "john.doe@onemed.com",
      contactPhone: "+47 12345678",
      today: new Date().toISOString(),
      orders: orders.map((order) => ({
        ...order,
        daysOverdue: calculateDaysOverdue(order.dueDate),
      })),
    };

    // Render subject and body
    const subject = renderEmailTemplate(template.subject, templateData);
    const htmlBody = renderEmailTemplate(template.htmlContent, templateData);

    // Send the email
    const result = await window.electron.sendEmail({
      to: supplier.email,
      subject,
      html: htmlBody,
      supplier: supplier.name,
      orderCount: orders.length,
    });

    if (result.success) {
      toast.success("Email sent successfully");
      return true;
    } else {
      toast.error(`Failed to send email: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    toast.error("Could not send email");
    return false;
  }
};
```

## Best Practices

1. **Clear Structure**: Use consistent structure for all templates
2. **Mobile Friendly**: Ensure templates display well on mobile devices
3. **Plain Text Alternative**: Always include plain text versions
4. **Variable Validation**: Validate all variables are available before sending
5. **Error Handling**: Gracefully handle missing variables

## Troubleshooting

Common issues and their solutions:

1. **Missing Variables**: Ensure all required variables are provided
2. **Formatting Issues**: Check HTML structure and CSS for rendering problems
3. **Performance Problems**: Optimize templates with many iteration blocks
4. **Email Client Compatibility**: Test templates in various email clients
5. **Image Display**: Use appropriate image handling for email clients

## Related Features

- [Email Reminders](email-reminders.md) - Uses email templates for communications
- [Supplier Management](supplier-management.md) - Provides contact data for templates
- [Order Tracking](order-tracking.md) - Supplies order data for templates
