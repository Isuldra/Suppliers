import Handlebars from "handlebars";
import supplierEmailsData from "../data/supplierEmails.json";

// Type for supplier emails
type SupplierEmails = {
  [key: string]: string;
};

export interface EmailData {
  supplier: string;
  orders: Array<{
    key: string;
    poNumber: string;
    orderQty: number;
    receivedQty: number;
    outstandingQty: number;
    itemNo?: string;
    description?: string;
  }>;
  language?: "no" | "en"; // Add language option
  subject: string; // Make required
}

export class EmailService {
  private templates: {
    no: string;
    en: string;
  };

  constructor() {
    // Norwegian template
    const noTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .urgent { background-color: #ffebee; }
    </style>
</head>
<body>
    <h2>Purring på manglende leveranser</h2>
    <p>Hei {{supplier}},</p>
    <p>Dette er en påminnelse om følgende manglende leveranser:</p>
    
    <table>
        <thead>
            <tr>
                <th>PO-nummer</th>
                <th>Varenummer</th>
                <th>Beskrivelse</th>
                <th>Ordre antall</th>
                <th>Mottatt antall</th>
                <th>Utestående antall</th>
            </tr>
        </thead>
        <tbody>
            {{#each orders}}
            <tr class="{{#if (gt outstandingQty 0)}}urgent{{/if}}">
                <td>{{poNumber}}</td>
                <td>{{itemNo}}</td>
                <td>{{description}}</td>
                <td>{{orderQty}}</td>
                <td>{{receivedQty}}</td>
                <td>{{outstandingQty}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <p>Vennligst bekreft mottak av denne meldingen og oppdater leveringsstatus.</p>
    <p>Med vennlig hilsen,<br>OneMed Norge AS</p>
</body>
</html>
    `;

    // English template
    const enTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .urgent { background-color: #ffebee; }
    </style>
</head>
<body>
    <h2>Reminder for Outstanding Orders</h2>
    <p>Hello {{supplier}},</p>
    <p>This is a reminder regarding the following outstanding orders:</p>
    
    <table>
        <thead>
            <tr>
                <th>PO Number</th>
                <th>Item Number</th>
                <th>Description</th>
                <th>Order Qty</th>
                <th>Received Qty</th>
                <th>Outstanding Qty</th>
            </tr>
        </thead>
        <tbody>
            {{#each orders}}
            <tr class="{{#if (gt outstandingQty 0)}}urgent{{/if}}">
                <td>{{poNumber}}</td>
                <td>{{itemNo}}</td>
                <td>{{description}}</td>
                <td>{{orderQty}}</td>
                <td>{{receivedQty}}</td>
                <td>{{outstandingQty}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <p>Please confirm receipt of this message and provide updated delivery status.</p>
    <p>Kind regards,<br>OneMed Norge AS</p>
</body>
</html>
    `;

    this.templates = {
      no: noTemplate,
      en: enTemplate,
    };
  }

  // Get supplier email from the supplier name
  getSupplierEmail(supplierName: string): string | null {
    const emails = supplierEmailsData.supplierEmails as SupplierEmails;

    // Direct match
    if (emails[supplierName]) {
      return emails[supplierName];
    }

    // Case-insensitive match
    const supplierLower = supplierName.toLowerCase();
    for (const [name, email] of Object.entries(emails)) {
      if (name.toLowerCase() === supplierLower) {
        return email;
      }
    }

    // Try partial match
    for (const [name, email] of Object.entries(emails)) {
      if (
        name.toLowerCase().includes(supplierLower) ||
        supplierLower.includes(name.toLowerCase())
      ) {
        return email;
      }
    }

    return null;
  }

  // New method to generate email preview HTML
  generatePreview(data: EmailData): string {
    const language = data.language || "no"; // Default to Norwegian
    const template = this.templates[language];
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }

  async sendReminder(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get supplier email address
      const supplierEmail = this.getSupplierEmail(data.supplier);

      if (!supplierEmail) {
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${data.supplier}. Sjekk supplierEmails.json for manglende leverandør.`,
        };
      }

      // Generate the HTML using the appropriate language template
      const language = data.language || "no"; // Default to Norwegian
      const template = this.templates[language];
      const compiledTemplate = Handlebars.compile(template);
      const html = compiledTemplate(data);

      // Set the subject based on language
      const subject =
        language === "no"
          ? `Purring på manglende leveranser - ${data.supplier}`
          : `Reminder for Outstanding Orders - ${data.supplier}`;

      // Use the API exposed by preload to send via mailto:
      const result = await window.electron.sendEmail({
        to: supplierEmail, // Use the actual email address
        subject,
        html,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
