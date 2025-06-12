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
  recipientEmail?: string; // Optional override for recipient email
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
    // Norwegian template - compact design for many order lines
    const noTemplate = `<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #333; max-width: 1000px; margin: 0 auto; padding: 15px; background-color: #f8f9fa; font-size: 13px;">
<div style="background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 6px rgba(0,0,0,0.1); overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 300;">Purring på manglende leveranser</h1>
    <div style="color: #ffffff; font-weight: bold; font-size: 14px; margin-top: 8px;">OneMed Norge AS</div>
  </div>
  
  <div style="padding: 20px;">
    <div style="font-size: 14px; margin-bottom: 15px; color: #555;">Hei,</div>
    
    <div style="font-size: 14px; margin-bottom: 20px; color: #555; background-color: #f8f9fa; padding: 12px; border-left: 3px solid #2c5aa0; border-radius: 3px;">
      Vi ser at følgende bestillinger fortsatt står som utestående hos dere. Vennligst gjennomgå listen og gi oss tilbakemelding på forventet leveringsstatus.
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white;">
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 12%;">PO-nr</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 15%;">OneMed nr</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 20%;">Lev. art.nr</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 8%;">Rad</th>
          <th style="padding: 8px 6px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 10%;">Utestående</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 35%;">Kommentar</th>
        </tr>
      </thead>
      <tbody>
        {{#each orders}}
        <tr style="background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
          <td style="padding: 6px; vertical-align: top; font-size: 11px;"><strong>{{poNumber}}</strong></td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px;">{{itemNo}}</td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px; word-break: break-word;">{{description}}</td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px;">{{orderRowNumber}}</td>
          <td style="padding: 6px; vertical-align: top; text-align: center; font-weight: bold; color: #d32f2f; font-size: 12px;">{{outstandingQty}}</td>
          <td style="padding: 6px; vertical-align: top; background-color: #fff; border: 1px dashed #ccc; border-radius: 2px; color: #999; font-style: italic; font-size: 10px; min-height: 25px;">Skriv kommentar her...</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #2c5aa0; font-size: 13px;">
      <strong>Hva trenger vi fra dere:</strong>
      <ul style="margin: 8px 0; padding-left: 18px;">
        <li>Bekreft mottak av denne meldingen</li>
        <li>Fyll ut kommentarfeltet for hver ordrelinje med forventet leveringsdato eller status</li>
        <li>Send tilbake denne e-posten med utfylte kommentarer</li>
      </ul>
    </div>

    <div style="margin-top: 20px; font-weight: 500; color: #2c5aa0; font-size: 13px;">
      Med vennlig hilsen,<br>
      <strong>OneMed Norge AS</strong><br>
      Supply Chain Team
    </div>
  </div>
</div>
</body>
</html>`;

    // English template - compact design for many order lines
    const enTemplate = `<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.4; color: #333; max-width: 1000px; margin: 0 auto; padding: 15px; background-color: #f8f9fa; font-size: 13px;">
<div style="background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 6px rgba(0,0,0,0.1); overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 300;">Outstanding Deliveries Reminder</h1>
    <div style="color: #ffffff; font-weight: bold; font-size: 14px; margin-top: 8px;">OneMed Norge AS</div>
  </div>
  
  <div style="padding: 20px;">
    <div style="font-size: 14px; margin-bottom: 15px; color: #555;">Hello,</div>
    
    <div style="font-size: 14px; margin-bottom: 20px; color: #555; background-color: #f8f9fa; padding: 12px; border-left: 3px solid #2c5aa0; border-radius: 3px;">
      The following purchase orders are still listed as outstanding on our side. Please review the list and provide us with feedback on expected delivery status.
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white;">
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 12%;">PO No.</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 15%;">OneMed No.</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 20%;">Supplier Art.No.</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 8%;">Row</th>
          <th style="padding: 8px 6px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 10%;">Outstanding</th>
          <th style="padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 35%;">Commentary</th>
        </tr>
      </thead>
      <tbody>
        {{#each orders}}
        <tr style="background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
          <td style="padding: 6px; vertical-align: top; font-size: 11px;"><strong>{{poNumber}}</strong></td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px;">{{itemNo}}</td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px; word-break: break-word;">{{description}}</td>
          <td style="padding: 6px; vertical-align: top; font-size: 11px;">{{orderRowNumber}}</td>
          <td style="padding: 6px; vertical-align: top; text-align: center; font-weight: bold; color: #d32f2f; font-size: 12px;">{{outstandingQty}}</td>
          <td style="padding: 6px; vertical-align: top; background-color: #fff; border: 1px dashed #ccc; border-radius: 2px; color: #999; font-style: italic; font-size: 10px; min-height: 25px;">Write comment here...</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #2c5aa0; font-size: 13px;">
      <strong>What we need from you:</strong>
      <ul style="margin: 8px 0; padding-left: 18px;">
        <li>Confirm receipt of this message</li>
        <li>Fill out the commentary field for each order line with expected delivery date or status</li>
        <li>Reply to this email with completed comments</li>
      </ul>
    </div>

    <div style="margin-top: 20px; font-weight: 500; color: #2c5aa0; font-size: 13px;">
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
      // Use manually overridden email if provided, otherwise get from supplier data
      let supplierEmail: string | null = data.recipientEmail || null;
      let language: "no" | "en" = "no"; // Default to Norwegian

      if (!supplierEmail) {
        // Get supplier info from the new structured data
        const supplierInfo = this.getSupplierInfo(data.supplier);

        if (supplierInfo) {
          supplierEmail = supplierInfo.epost;
          // Set language based on supplier's preference
          language = supplierInfo.språkKode === "ENG" ? "en" : "no";
        } else {
          // Fallback to database lookup
          supplierEmail = await this.getSupplierEmail(data.supplier);
        }
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

      // Try automatic PowerShell sending first (Windows only) - PRIORITIZED
      try {
        const autoResult = await window.electron.sendEmailAutomatically({
          to: supplierEmail,
          subject,
          html,
        });

        if (autoResult.success) {
          console.log("Email sent automatically via PowerShell/Outlook");
          return autoResult;
        } else {
          console.warn(
            "Automatic PowerShell sending failed, falling back to .eml method:",
            autoResult.error
          );
        }
      } catch (error) {
        console.warn(
          "Automatic PowerShell sending failed, falling back to .eml method:",
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
