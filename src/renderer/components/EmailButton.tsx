import React, { useState, useMemo } from "react";
import { EmailService, EmailData } from "../services/emailService";
import toast from "react-hot-toast";
import EmailPreviewModal from "./EmailPreviewModal";
import { ExcelData, ExcelRow } from "../types/ExcelData";

interface EmailButtonProps {
  excelData?: ExcelData;
  selectedSupplier: string;
  onPrevious: () => void;
}

const emailService = new EmailService();

const EmailButton: React.FC<EmailButtonProps> = ({
  excelData,
  selectedSupplier,
  onPrevious,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [emailData, setEmailData] = useState<EmailData>(() => {
    const preferredLanguage = emailService.getSupplierLanguage(
      selectedSupplier || ""
    );
    return {
      supplier: selectedSupplier || "",
      orders: [],
      language: preferredLanguage, // Use supplier's preferred language
      subject: "", // Provide a default subject
    };
  });
  const [previewHtml, setPreviewHtml] = useState("");

  // Create order list from excel data with language-aware date formatting
  const orders = useMemo(() => {
    if (!excelData?.bp || !selectedSupplier) return [];

    // Get the preferred language for date formatting
    const preferredLanguage = emailService.getSupplierLanguage(
      selectedSupplier || ""
    );
    const dateLocale = preferredLanguage === "en" ? "en-GB" : "no-NO"; // Use British format for English

    return excelData.bp
      .filter((row) => row.supplier === selectedSupplier)
      .map((row: ExcelRow) => ({
        key: row.key,
        poNumber: String(row.poNumber || ""),
        itemNo: String(row.itemNo || ""),
        supplierItemNo: String(row.supplierArticleNo || row.description || ""), // Use supplier article number or fallback to description
        description: String(row.description || ""),
        specification: String(row.specification || ""),
        orderQty: Number(row.orderQty || 0),
        receivedQty: Number(row.receivedQty || 0),
        estReceiptDate: row.dueDate
          ? row.dueDate.toLocaleDateString(dateLocale)
          : "", // Format date based on supplier's language preference
        // Legacy fields for backward compatibility
        outstandingQty: Number(row.outstandingQty || 0),
        orderRowNumber: String(row.orderRowNumber || ""),
      }));
  }, [excelData, selectedSupplier]);

  // Handler to prepare and show the email preview
  const handlePreview = () => {
    // Get the preferred language for this supplier
    const preferredLanguage = emailService.getSupplierLanguage(
      selectedSupplier || ""
    );

    // Update email data with the latest supplier and orders
    const updatedData: EmailData = {
      supplier: selectedSupplier || "",
      orders,
      language: emailData.language || preferredLanguage, // Use supplier's preferred language if not already set
      subject: emailData.subject, // Carry over existing subject
    };
    setEmailData(updatedData);

    // Generate preview HTML
    const html = emailService.generatePreview(updatedData);
    setPreviewHtml(html);

    // Show the preview modal
    setShowPreview(true);
  };

  // Handle language change
  const handleLanguageChange = (language: "no" | "en") => {
    const updatedData = { ...emailData, language };
    setEmailData(updatedData);

    // Update preview with new language
    const html = emailService.generatePreview(updatedData);
    setPreviewHtml(html);
  };

  // Handle recipient email change
  const handleRecipientChange = (recipientEmail: string) => {
    const updatedData = { ...emailData, recipientEmail };
    setEmailData(updatedData);
  };

  const handleSendEmail = async () => {
    if (!selectedSupplier) {
      console.error("No supplier selected, cannot send email.");
      toast.error("Ingen leverandør valgt.");
      return;
    }
    setIsSending(true);
    try {
      const result = await emailService.sendReminder(emailData);

      if (result.success) {
        const recipientDisplay = emailData.recipientEmail || selectedSupplier;
        toast.success(`E-post sendt til ${recipientDisplay}`);
        setRetryCount(0);
        setShowPreview(false); // Close the preview modal

        try {
          // Record the email in the database
          await window.electron.recordEmailSent(
            selectedSupplier,
            emailData.supplier,
            emailData.subject,
            emailData.orders.length
          );
          console.log(`Email to ${selectedSupplier} recorded in database`);
        } catch (dbError) {
          console.error("Failed to record email in database:", dbError);
          // Don't show an error to the user - this is not critical
        }
      } else {
        throw new Error(result.error);
      }
    } catch (_error: unknown) {
      // const errorMessage = // Remove unused variable
      //  error instanceof Error ? error.message : "Ukjent feil";

      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
        toast.error(
          `Kunne ikke sende e-post. Prøver igjen om ${delay / 1000} sekunder...`
        );
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          handleSendEmail();
        }, delay);
      } else {
        toast.error(
          <span>
            Kunne ikke sende e-post. Vil du prøve igjen?{" "}
            <button
              className="ml-2 underline text-primary font-medium"
              onClick={() => {
                setRetryCount(0);
                handleSendEmail();
                toast.dismiss(); // Dismiss this toast on click
              }}
            >
              Prøv igjen
            </button>
          </span>,
          {
            duration: 10000, // Keep duration or adjust
            // Remove the invalid 'action' property
            // action: { ... },
          }
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  // 🧪 DEBUG: Handler for sending test email
  const handleSendTestEmail = async () => {
    const testEmail = emailData.recipientEmail || "andreas.elvethun@onemed.com";

    setIsSending(true);
    try {
      console.log("🧪 Sending test email to:", testEmail);
      const result = await emailService.sendTestEmail(testEmail);

      if (result.success) {
        toast.success(`🧪 Test e-post sendt til ${testEmail}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ukjent feil";
      toast.error(`🧪 Test e-post feilet: ${errorMessage}`);
      console.error("Test email failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  // 🧪 DEBUG: Handler for opening debug folder
  const handleOpenDebugFolder = async () => {
    try {
      console.log("🧪 Opening debug folder...");
      const result = await window.electron.openDebugFolder();

      if (result.success) {
        toast.success(`🧪 Debug-mappe åpnet: ${result.path}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ukjent feil";
      toast.error(`🧪 Kunne ikke åpne debug-mappe: ${errorMessage}`);
      console.error("Failed to open debug folder:", error);
    }
  };

  // 🚀 DEBUG: Handler for testing Direct Open-and-Send method
  const handleTestDirectMethod = async () => {
    const testEmail = emailData.recipientEmail || "andreas.elvethun@onemed.com";

    setIsSending(true);
    try {
      console.log(
        "🚀 Testing Direct Open-and-Send method (.eml + COM) to:",
        testEmail
      );

      // Create simple test HTML
      const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Direct Method Test</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #e8f4fd; font-family: Arial, sans-serif;">
  <div style="background-color: #ffffff; padding: 20px; border: 3px solid #0066cc; border-radius: 10px;">
    <h1 style="color: #0066cc; font-size: 28px; margin-bottom: 15px;">🚀 Direct Open-and-Send Test</h1>
    <p style="color: #333333; font-size: 18px; line-height: 1.6;">
      This email was sent using the <strong>Direct Open-and-Send method</strong> (.eml + PowerShell COM).
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #0066cc;">
      <tr style="background-color: #0066cc;">
        <th style="color: #ffffff; padding: 12px; border: 1px solid #004499; font-size: 16px;">Method</th>
        <th style="color: #ffffff; padding: 12px; border: 1px solid #004499; font-size: 16px;">Status</th>
      </tr>
      <tr style="background-color: #f0f8ff;">
        <td style="padding: 10px; border: 1px solid #cccccc; font-weight: bold;">CSS Styling</td>
        <td style="padding: 10px; border: 1px solid #cccccc; background-color: #90EE90;">✅ Should be preserved</td>
      </tr>
      <tr style="background-color: #ffffff;">
        <td style="padding: 10px; border: 1px solid #cccccc; font-weight: bold;">Automation</td>
        <td style="padding: 10px; border: 1px solid #cccccc; background-color: #90EE90;">✅ Fully automated</td>
      </tr>
    </table>
    <p style="color: #666666; font-size: 14px; margin-top: 25px; font-style: italic; border-top: 1px solid #cccccc; padding-top: 15px;">
      If you see this email with proper colors, borders, and styling, the Direct Open-and-Send method is working correctly!
    </p>
  </div>
</body>
</html>`;

      const result = await window.electron.sendEmailViaEmlAndCOM({
        to: testEmail,
        subject: "🚀 Direct Method Test - OneMed SupplyChain",
        html: testHtml,
      });

      if (result.success) {
        toast.success(`🚀 Direct test e-post sendt til ${testEmail}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ukjent feil";
      toast.error(`🚀 Direct test feilet: ${errorMessage}`);
      console.error("Direct test failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!excelData || !selectedSupplier) {
    return (
      <div className="p-6 bg-neutral-light border border-accent rounded-md shadow-sm">
        <p className="text-neutral">
          Ingen data tilgjengelig. Vennligst velg en leverandør først.
        </p>
        <button onClick={onPrevious} className="btn btn-secondary mt-4">
          Tilbake
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 text-neutral">Send e-post</h2>

      <div className="bg-primary-light bg-opacity-10 p-6 mb-6 rounded-md shadow-sm">
        <h3 className="font-medium text-primary mb-2">
          Valgt leverandør: {selectedSupplier}
        </h3>
        <p className="text-sm text-neutral-secondary">
          {orders.length} utestående ordre vil bli inkludert i e-posten.
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <button
          onClick={handlePreview}
          disabled={isSending}
          className={`btn ${
            isSending
              ? "bg-neutral-secondary cursor-not-allowed"
              : "btn-primary"
          }`}
          aria-label={`Forbered e-post til ${selectedSupplier}`}
          aria-busy={isSending}
        >
          {isSending ? "Forbereder e-post..." : "Forbered e-post"}
        </button>

        {/* 🧪 DEBUG: Test email button */}
        <button
          onClick={handleSendTestEmail}
          disabled={isSending}
          className={`btn ${
            isSending
              ? "bg-neutral-secondary cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
          aria-label="Send test e-post for CSS-debugging"
          aria-busy={isSending}
        >
          {isSending ? "Sender test..." : "🧪 Send CSS Test E-post"}
        </button>

        {/* 🚀 DEBUG: Direct method test button */}
        <button
          onClick={handleTestDirectMethod}
          disabled={isSending}
          className={`btn ${
            isSending
              ? "bg-neutral-secondary cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
          aria-label="Test Direct Open-and-Send method"
          aria-busy={isSending}
        >
          {isSending ? "Sender direct test..." : "🚀 Test Direct Method"}
        </button>

        {/* 🧪 DEBUG: Open debug folder button */}
        <button
          onClick={handleOpenDebugFolder}
          className="btn bg-purple-500 hover:bg-purple-600 text-white"
          aria-label="Åpne debug-mappe"
        >
          📁 Åpne Debug-mappe
        </button>

        <button onClick={onPrevious} className="btn btn-secondary">
          Tilbake
        </button>
      </div>

      {/* Email Preview Modal */}
      {showPreview && (
        <EmailPreviewModal
          emailData={emailData}
          previewHtml={previewHtml}
          onSend={handleSendEmail}
          onCancel={() => setShowPreview(false)}
          onChangeLanguage={handleLanguageChange}
          onChangeRecipient={handleRecipientChange}
        />
      )}
    </div>
  );
};

export default EmailButton;
