import Handlebars from "handlebars";
import supplierData from "../data/supplierData.json";
import juice from "juice";

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
    poNumber: string; // PO-nr
    itemNo: string; // OneMed nr
    supplierItemNo: string; // Lev. art.nr
    description: string; // Beskrivelse/Description
    specification: string; // Spesifikasjon/Specification
    orderQty: number; // Bestilt ant./Order qty
    receivedQty: number; // Mottatt ant./Received qty
    estReceiptDate: string; // Forventet ETA/Expected ETA
    // Legacy fields for backward compatibility
    outstandingQty?: number;
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
    // Norwegian template - Excel-like design with maximum Outlook compatibility
    const noTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Purring på utestående ordre</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f6f6f6">
    <tr>
      <td>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 900px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 20px;">
          
          <!-- Introduksjon -->
          <tr>
            <td style="padding: 10px 10px 20px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
              <p>Hei,</p>
              <p>Vi viser til vår bestilling og ser at følgende ordrelinjer fortsatt står som utestående hos dere. Vi ber om en tilbakemelding med ny forventet leveringsdato (ETA) for hver linje.</p>
              <p>Vennligst svar på denne e-posten med den utfylte informasjonen i <b>"Ny ETA"</b>-kolonnen.</p>
            </td>
          </tr>

          <!-- Ordretabell -->
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 12px; border: 1px solid #cccccc;">

                <!-- Tabelloverskrifter -->
                <thead>
                  <tr style="background-color: #003366; color: #ffffff; text-align: left;">
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">PO-nr</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">OneMed nr</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Lev. art.nr</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Beskrivelse</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Spesifikasjon</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Bestilt ant.</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Mottatt ant.</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Forventet ETA</th>
                    <th style="padding: 8px 10px; background-color: #008000; border: 1px solid #4A7AAB;">Ny ETA</th>
                  </tr>
                </thead>

                <!-- Tabellinnhold -->
                <tbody>
                  {{#each orders}}
                  <tr style="background-color: {{#if @even}}#f7f7f7{{else}}#ffffff{{/if}}; border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; font-weight: bold;">{{poNumber}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{itemNo}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{supplierItemNo}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{description}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{specification}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; text-align: center;">{{orderQty}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; text-align: center;">{{receivedQty}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{estReceiptDate}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; background-color: #E8F5E9;">&nbsp;</td>
                  </tr>
                  {{/each}}
                </tbody>

              </table>
            </td>
          </tr>

          <!-- Avslutning -->
          <tr>
            <td style="padding: 30px 10px 10px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
              <p>Med vennlig hilsen,<br>
              <b>OneMed Norge AS</b><br>
              Supply Chain Team</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    // English template - Excel-like design with maximum Outlook compatibility
    const enTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Outstanding Orders Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f6f6f6">
    <tr>
      <td>
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 900px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 20px;">
          
          <!-- Introduction -->
          <tr>
            <td style="padding: 10px 10px 20px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
              <p>Hello,</p>
              <p>We refer to our purchase order and see that the following order lines are still outstanding on your side. We request feedback with new expected delivery date (ETA) for each line.</p>
              <p>Please reply to this email with the completed information in the <b>"New ETA"</b> column.</p>
            </td>
          </tr>

          <!-- Order table -->
          <tr>
            <td>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 12px; border: 1px solid #cccccc;">

                <!-- Table headers -->
                <thead>
                  <tr style="background-color: #003366; color: #ffffff; text-align: left;">
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">PO No.</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">OneMed No.</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Supplier Art. No.</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Description</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Specification</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Order Qty</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Received Qty</th>
                    <th style="padding: 8px 10px; border: 1px solid #4A7AAB;">Expected ETA</th>
                    <th style="padding: 8px 10px; background-color: #008000; border: 1px solid #4A7AAB;">New ETA</th>
                  </tr>
                </thead>

                <!-- Table content -->
                <tbody>
                  {{#each orders}}
                  <tr style="background-color: {{#if @even}}#f7f7f7{{else}}#ffffff{{/if}}; border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; font-weight: bold;">{{poNumber}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{itemNo}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{supplierItemNo}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{description}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{specification}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; text-align: center;">{{orderQty}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; text-align: center;">{{receivedQty}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0;">{{estReceiptDate}}</td>
                    <td style="padding: 6px 10px; border: 1px solid #e0e0e0; background-color: #E8F5E9;">&nbsp;</td>
                  </tr>
                  {{/each}}
                </tbody>

              </table>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 30px 10px 10px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
              <p>Kind regards,<br>
              <b>OneMed Norge AS</b><br>
              Supply Chain Team</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
    const rawHtml = compiledTemplate(data);

    // Inline CSS styles for preview (same as what will be sent)
    return juice(rawHtml, {
      removeStyleTags: true, // Remove <style> tags after inlining
      preserveMediaQueries: true, // Keep media queries for responsive design
      preserveFontFaces: true, // Keep @font-face declarations
      applyStyleTags: true, // Apply styles from <style> tags
      applyWidthAttributes: true, // Convert CSS widths to width attributes
      applyHeightAttributes: true, // Convert CSS heights to height attributes
      preserveImportant: true, // Keep !important declarations
    });
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
      const rawHtml = compiledTemplate(data);

      // 🔍 DEBUG: Log raw HTML before juice processing
      console.log("=== RAW HTML BEFORE JUICE ===");
      console.log(rawHtml.substring(0, 500) + "...");

      // Save raw HTML to file for debugging
      try {
        await window.electron.saveDebugHtml({
          filename: `raw-html-${Date.now()}.html`,
          content: rawHtml,
          description: "Raw HTML before juice processing",
        });
      } catch (debugError) {
        console.warn("Could not save debug HTML:", debugError);
      }

      // Inline CSS styles for better email client compatibility
      const html = juice(rawHtml, {
        removeStyleTags: true, // Remove <style> tags after inlining
        preserveMediaQueries: true, // Keep media queries for responsive design
        preserveFontFaces: true, // Keep @font-face declarations
        applyStyleTags: true, // Apply styles from <style> tags
        applyWidthAttributes: true, // Convert CSS widths to width attributes
        applyHeightAttributes: true, // Convert CSS heights to height attributes
        preserveImportant: true, // Keep !important declarations
      });

      // 🔍 DEBUG: Log processed HTML after juice
      console.log("=== PROCESSED HTML AFTER JUICE ===");
      console.log(html.substring(0, 500) + "...");

      // Save processed HTML to file for debugging
      try {
        await window.electron.saveDebugHtml({
          filename: `juiced-html-${Date.now()}.html`,
          content: html,
          description:
            "HTML after juice processing (what gets sent to PowerShell)",
        });
      } catch (debugError) {
        console.warn("Could not save debug HTML:", debugError);
      }

      // Set the subject based on language
      const subject =
        finalLanguage === "no"
          ? `Purring på manglende leveranser – ${data.supplier}`
          : `Reminder: Outstanding Deliveries – ${data.supplier}`;

      // ATTEMPT 1: sendEmailAutomatically (Primary Method - Robust HTML+COM via temp file)
      try {
        console.log(
          "ATTEMPT 1: Trying sendEmailAutomatically (Robust HTML+COM via temp file)..."
        );
        const result = await window.electron.sendEmailAutomatically({
          to: supplierEmail,
          subject,
          html,
        });

        if (result.success) {
          console.log(
            "SUCCESS: Email sent via sendEmailAutomatically (Robust HTML+COM)"
          );
          return result;
        } else {
          console.warn(
            "ATTEMPT 1 FAILED: sendEmailAutomatically failed, falling back to sendEmail:",
            result.error
          );
        }
      } catch (error) {
        console.warn(
          "ATTEMPT 1 FAILED: sendEmailAutomatically threw error, falling back to sendEmail:",
          error
        );
      }

      // ATTEMPT 2: sendEmail (Final Fallback - .eml file-open method)
      console.log("ATTEMPT 2: Trying sendEmail (.eml file-open method)...");
      const result = await window.electron.sendEmail({
        to: supplierEmail,
        subject,
        html,
      });

      if (result.success) {
        console.log("SUCCESS: Email sent via sendEmail (.eml file-open)");
      } else {
        console.error("FINAL ATTEMPT FAILED: All email sending methods failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // 🧪 DEBUG: Test method to send simple HTML with basic inline styles
  async sendTestEmail(
    recipientEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a very simple HTML email with basic inline styles
      const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f0f0f0; font-family: Arial, sans-serif;">
  <div style="background-color: #ffffff; padding: 20px; border: 2px solid #ff0000; border-radius: 8px;">
    <h1 style="color: #0066cc; font-size: 24px; margin-bottom: 10px;">Test Email</h1>
    <p style="color: #333333; font-size: 16px; line-height: 1.5;">
      This is a test email to verify if inline CSS styles work with PowerShell/Outlook.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr style="background-color: #0066cc;">
        <th style="color: #ffffff; padding: 10px; border: 1px solid #004499;">Column 1</th>
        <th style="color: #ffffff; padding: 10px; border: 1px solid #004499;">Column 2</th>
      </tr>
      <tr style="background-color: #f7f7f7;">
        <td style="padding: 8px; border: 1px solid #cccccc;">Test Data 1</td>
        <td style="padding: 8px; border: 1px solid #cccccc;">Test Data 2</td>
      </tr>
      <tr style="background-color: #ffffff;">
        <td style="padding: 8px; border: 1px solid #cccccc; background-color: #ffff99;">Highlighted Cell</td>
        <td style="padding: 8px; border: 1px solid #cccccc;">Normal Cell</td>
      </tr>
    </table>
    <p style="color: #666666; font-size: 14px; margin-top: 20px; font-style: italic;">
      If you can see colors, borders, and styling, then inline CSS works with your email client.
    </p>
  </div>
</body>
</html>`;

      console.log("🧪 Sending test email with basic inline styles");

      // Save test HTML for debugging
      try {
        await window.electron.saveDebugHtml({
          filename: `test-email-${Date.now()}.html`,
          content: testHtml,
          description: "Simple test email with basic inline styles",
        });
      } catch (debugError) {
        console.warn("Could not save test HTML:", debugError);
      }

      // TEST ATTEMPT 1: sendEmailAutomatically (Primary Method - Robust HTML+COM via temp file)
      console.log(
        "🧪 TEST ATTEMPT 1: Trying sendEmailAutomatically (Robust HTML+COM via temp file)..."
      );
      const result = await window.electron.sendEmailAutomatically({
        to: recipientEmail,
        subject: "🧪 CSS Styling Test (Robust HTML+COM) - OneMed SupplyChain",
        html: testHtml,
      });

      if (result.success) {
        console.log(
          "🧪 TEST SUCCESS: Email sent via sendEmailAutomatically (Robust HTML+COM)"
        );
      } else {
        console.error("🧪 TEST FAILED: sendEmailAutomatically failed");
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Test email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
