import Handlebars from "handlebars";
import supplierEmailsData from "../data/supplierEmails.json";

// Register Handlebars helpers
Handlebars.registerHelper("gt", function (a, b) {
  return a > b;
});

Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

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
    // Norwegian template - ultra-basic HTML table for maximum email client compatibility
    const noTemplate = `<!DOCTYPE html>
<html>
<body>
<h3>Purring på manglende leveranser</h3>
<p>Hei {{supplier}},</p>
<p>Dette er en påminnelse om følgende manglende leveranser:</p>

<table border="1" cellpadding="4" cellspacing="0" width="100%">
<tr bgcolor="#f0f0f0">
<td><b>PO-nummer</b></td>
<td><b>OneMed varenummer</b></td>
<td><b>Leverandørs artikkelnummer</b></td>
<td><b>Ordre antall</b></td>
<td><b>Mottatt antall</b></td>
<td><b>Utestående antall</b></td>
</tr>
{{#each orders}}
<tr>
<td>{{poNumber}}</td>
<td>{{itemNo}}</td>
<td>{{description}}</td>
<td>{{orderQty}}</td>
<td>{{receivedQty}}</td>
<td><b>{{outstandingQty}}</b></td>
</tr>
{{/each}}
</table>

<p>Vennligst bekreft mottak av denne meldingen og oppdater leveringsstatus.</p>
<p>Med vennlig hilsen,<br>OneMed Norge AS</p>
</body>
</html>`;

    // English template - ultra-basic HTML table for maximum email client compatibility
    const enTemplate = `<!DOCTYPE html>
<html>
<body>
<h3>Reminder for Outstanding Orders</h3>
<p>Hello {{supplier}},</p>
<p>This is a reminder regarding the following outstanding orders:</p>

<table border="1" cellpadding="4" cellspacing="0" width="100%">
<tr bgcolor="#f0f0f0">
<td><b>PO Number</b></td>
<td><b>OneMed Item Number</b></td>
<td><b>Supplier Article Number</b></td>
<td><b>Order Qty</b></td>
<td><b>Received Qty</b></td>
<td><b>Outstanding Qty</b></td>
</tr>
{{#each orders}}
<tr>
<td>{{poNumber}}</td>
<td>{{itemNo}}</td>
<td>{{description}}</td>
<td>{{orderQty}}</td>
<td>{{receivedQty}}</td>
<td><b>{{outstandingQty}}</b></td>
</tr>
{{/each}}
</table>

<p>Please confirm receipt of this message and provide updated delivery status.</p>
<p>Kind regards,<br>OneMed Norge AS</p>
</body>
</html>`;

    this.templates = {
      no: noTemplate,
      en: enTemplate,
    };
  }

  // Get supplier email from the database
  async getSupplierEmail(supplierName: string): Promise<string | null> {
    try {
      const result = await window.electron.getSupplierEmail(supplierName);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error getting supplier email from database:", error);
      return null;
    }
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
      const supplierEmail = await this.getSupplierEmail(data.supplier);

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
