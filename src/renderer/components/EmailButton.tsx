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

  // Create order list from excel data
  const orders = useMemo(() => {
    if (!excelData?.bp || !selectedSupplier) return [];

    return excelData.bp
      .filter((row) => row.supplier === selectedSupplier)
      .map((row: ExcelRow) => ({
        key: row.key,
        poNumber: String(row.poNumber || ""),
        orderQty: Number(row.orderQty || 0),
        receivedQty: Number(row.receivedQty || 0),
        outstandingQty: Number(row.outstandingQty || 0),
        itemNo: typeof row.itemNo === "string" ? row.itemNo : undefined,
        description:
          typeof row.description === "string" ? row.description : undefined,
        orderRowNumber:
          typeof row.orderRowNumber === "string"
            ? row.orderRowNumber
            : undefined,
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
        toast.success(`E-post sendt til ${selectedSupplier}`);
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
        />
      )}
    </div>
  );
};

export default EmailButton;
