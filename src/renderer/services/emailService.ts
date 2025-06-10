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
    // Norwegian template - inline CSS for Outlook compatibility
    const noTemplate = `<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
<div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Forhåndsvisning av e-post</h1>
    <div style="color: #ffffff; font-weight: bold; font-size: 18px; margin-top: 10px;">OneMed Norge AS</div>
  </div>
  
  <div style="padding: 30px;">
    <div style="font-size: 16px; margin-bottom: 20px; color: #555;">Hei,</div>
    
    <div style="font-size: 16px; margin-bottom: 25px; color: #555; background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2c5aa0; border-radius: 4px;">
      Vi ser at følgende bestillinger fortsatt står som utestående hos dere. Vennligst gjennomgå listen og gi oss tilbakemelding på forventet leveringsstatus.
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white;">
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">PO-nummer</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">OneMed varenummer</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Leverandørs artikkelnummer</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Ordrerad</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Utestående antall</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Kommentar</th>
        </tr>
      </thead>
      <tbody>
        {{#each orders}}
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;"><strong>{{poNumber}}</strong></td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{itemNo}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{description}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{orderRowNumber}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top; font-weight: bold; color: #d32f2f; font-size: 15px;">{{outstandingQty}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top; background-color: #fff; border: 2px dashed #ddd; border-radius: 4px; color: #999; font-style: italic; min-height: 40px;">Skriv kommentar her...</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #2c5aa0;">
      <strong>Hva trenger vi fra dere:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Bekreft mottak av denne meldingen</li>
        <li>Fyll ut kommentarfeltet for hver ordrelinje med forventet leveringsdato eller status</li>
        <li>Send tilbake denne e-posten med utfylte kommentarer</li>
      </ul>
    </div>

    <div style="margin-top: 25px; font-weight: 500; color: #2c5aa0;">
      Med vennlig hilsen,<br>
      <strong>OneMed Norge AS</strong><br>
      Supply Chain Team
    </div>
  </div>
</div>
</body>
</html>`;

    // English template - inline CSS for Outlook compatibility
    const enTemplate = `<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
<div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Email Preview</h1>
    <div style="color: #ffffff; font-weight: bold; font-size: 18px; margin-top: 10px;">OneMed Norge AS</div>
  </div>
  
  <div style="padding: 30px;">
    <div style="font-size: 16px; margin-bottom: 20px; color: #555;">Hello,</div>
    
    <div style="font-size: 16px; margin-bottom: 25px; color: #555; background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2c5aa0; border-radius: 4px;">
      The following purchase orders are still listed as outstanding on our side. Please review the list and provide us with feedback on expected delivery status.
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white;">
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">PO Number</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">OneMed Item Number</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Supplier Article Number</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Order Row</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Outstanding Qty</th>
          <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Commentary</th>
        </tr>
      </thead>
      <tbody>
        {{#each orders}}
        <tr style="background-color: #f8f9fa;">
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;"><strong>{{poNumber}}</strong></td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{itemNo}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{description}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top;">{{orderRowNumber}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top; font-weight: bold; color: #d32f2f; font-size: 15px;">{{outstandingQty}}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; vertical-align: top; background-color: #fff; border: 2px dashed #ddd; border-radius: 4px; color: #999; font-style: italic; min-height: 40px;">Write comment here...</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #2c5aa0;">
      <strong>What we need from you:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Confirm receipt of this message</li>
        <li>Fill out the commentary field for each order line with expected delivery date or status</li>
        <li>Reply to this email with completed comments</li>
      </ul>
    </div>

    <div style="margin-top: 25px; font-weight: 500; color: #2c5aa0;">
      Kind regards,<br>
      <strong>OneMed Norge AS</strong><br>
      Supply Chain Team
    </div>
  </div>
</div>
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
