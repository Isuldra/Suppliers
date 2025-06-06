import Handlebars from "handlebars";
import supplierData from "../data/supplierData.json";

// Register Handlebars helpers
Handlebars.registerHelper("gt", function (a, b) {
  return a > b;
});

Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

// Type for supplier data
interface SupplierInfo {
  leverandør: string;
  companyId: number;
  epost: string;
  språk: string;
  språkKode: "NO" | "ENG";
  purredag: string;
}

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
    orderRowNumber?: string;
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
<p>Hei,</p>
<p>Vi ser at følgende bestillinger fortsatt står som utestående hos dere:</p>

<table border="1" cellpadding="4" cellspacing="0" width="100%">
<tr bgcolor="#f0f0f0">
<td><b>PO-nummer</b></td>
<td><b>OneMed varenummer</b></td>
<td><b>Leverandørs artikkelnummer</b></td>
<td><b>Ordrerad</b></td>
<td><b>Utestående antall</b></td>
</tr>
{{#each orders}}
<tr>
<td>{{poNumber}}</td>
<td>{{itemNo}}</td>
<td>{{description}}</td>
<td>{{orderRowNumber}}</td>
<td><b>{{outstandingQty}}</b></td>
</tr>
{{/each}}
</table>

<p>Vi ber dere bekrefte mottak av denne meldingen og oppdatere oss på forventet leveringsstatus for de åpne ordrelinjene.</p>
<p>Med vennlig hilsen,<br>OneMed Norge AS</p>
</body>
</html>`;

    // English template - ultra-basic HTML table for maximum email client compatibility
    const enTemplate = `<!DOCTYPE html>
<html>
<body>
<p>Hello,</p>
<p>The following purchase orders are still listed as outstanding on our side:</p>

<table border="1" cellpadding="4" cellspacing="0" width="100%">
<tr bgcolor="#f0f0f0">
<td><b>PO Number</b></td>
<td><b>OneMed Item Number</b></td>
<td><b>Supplier Article Number</b></td>
<td><b>Order Row</b></td>
<td><b>Outstanding Qty</b></td>
</tr>
{{#each orders}}
<tr>
<td>{{poNumber}}</td>
<td>{{itemNo}}</td>
<td>{{description}}</td>
<td>{{orderRowNumber}}</td>
<td><b>{{outstandingQty}}</b></td>
</tr>
{{/each}}
</table>

<p>Please confirm receipt of this message and update us with the current delivery status of the outstanding order lines.</p>
<p>Kind regards,<br>OneMed Norge AS</p>
</body>
</html>`;

    this.templates = {
      no: noTemplate,
      en: enTemplate,
    };
  }

  // Get supplier info from the new structured data
  getSupplierInfo(supplierName: string): SupplierInfo | null {
    const supplier = supplierData.leverandører.find(
      (s) => s.leverandør === supplierName
    );
    return supplier
      ? {
          ...supplier,
          språkKode: supplier.språkKode as "NO" | "ENG",
        }
      : null;
  }

  // Get supplier email from the database (fallback)
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

  // Get the preferred language for a supplier
  getSupplierLanguage(supplierName: string): "no" | "en" {
    const supplierInfo = this.getSupplierInfo(supplierName);
    return supplierInfo?.språkKode === "ENG" ? "en" : "no";
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
      // Get supplier info from the new structured data
      const supplierInfo = this.getSupplierInfo(data.supplier);
      let supplierEmail: string | null = null;
      let language: "no" | "en" = "no"; // Default to Norwegian

      if (supplierInfo) {
        supplierEmail = supplierInfo.epost;
        // Set language based on supplier's preference
        language = supplierInfo.språkKode === "ENG" ? "en" : "no";
      } else {
        // Fallback to database lookup
        supplierEmail = await this.getSupplierEmail(data.supplier);
      }

      if (!supplierEmail) {
        return {
          success: false,
          error: `Ingen e-postadresse funnet for ${data.supplier}. Sjekk leverandørdata for manglende leverandør.`,
        };
      }

      // Use the language from supplier data or the provided language
      const finalLanguage = data.language || language;
      const template = this.templates[finalLanguage];
      const compiledTemplate = Handlebars.compile(template);
      const html = compiledTemplate(data);

      // Set the subject based on language
      const subject =
        finalLanguage === "no"
          ? `Purring på manglende leveranser – ${data.supplier}`
          : `Reminder: Outstanding Deliveries – ${data.supplier}`;

      // Try automatic Outlook sending first (Windows only)
      try {
        const autoResult = await window.electron.sendEmailAutomatically({
          to: supplierEmail,
          subject,
          html,
        });

        if (autoResult.success) {
          console.log("Email sent automatically via Outlook");
          return autoResult;
        } else {
          console.warn(
            "Automatic Outlook failed, falling back to .eml method:",
            autoResult.error
          );
        }
      } catch (error) {
        console.warn(
          "Automatic Outlook failed, falling back to .eml method:",
          error
        );
      }

      // Fallback to .eml file method
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
