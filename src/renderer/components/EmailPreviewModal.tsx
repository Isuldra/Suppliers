import React, { useState, useEffect } from "react";
import { EmailData, EmailService } from "../services/emailService";

interface EmailPreviewModalProps {
  emailData: EmailData;
  previewHtml: string;
  onSend: () => void;
  onCancel: () => void;
  onChangeLanguage: (language: "no" | "en") => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  emailData,
  previewHtml,
  onSend,
  onCancel,
  onChangeLanguage,
}) => {
  const emailService = new EmailService();
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);

  // Load supplier email when component mounts or supplier changes
  useEffect(() => {
    const loadSupplierEmail = async () => {
      setIsLoadingEmail(true);
      try {
        // Try to get email from the new structured data first
        const supplierInfo = emailService.getSupplierInfo(emailData.supplier);
        if (supplierInfo) {
          setRecipientEmail(supplierInfo.epost);
        } else {
          // Fallback to database lookup
          const email = await emailService.getSupplierEmail(emailData.supplier);
          setRecipientEmail(email);
        }
      } catch (error) {
        console.error("Error loading supplier email:", error);
        setRecipientEmail(null);
      } finally {
        setIsLoadingEmail(false);
      }
    };

    loadSupplierEmail();
  }, [emailData.supplier]);

  return (
    <div className="fixed inset-0 bg-neutral bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-white rounded-md shadow-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral">
            Forhåndsvisning av e-post
          </h2>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 rounded-sm transition-default ${
                emailData.language === "no"
                  ? "bg-primary text-neutral-white"
                  : "bg-neutral-light text-neutral"
              }`}
              onClick={() => onChangeLanguage("no")}
            >
              Norsk
            </button>
            <button
              className={`px-3 py-1 rounded-sm transition-default ${
                emailData.language === "en"
                  ? "bg-primary text-neutral-white"
                  : "bg-neutral-light text-neutral"
              }`}
              onClick={() => onChangeLanguage("en")}
            >
              English
            </button>
          </div>
        </div>

        <div className="p-6 border-b">
          <div className="mb-2">
            <span className="font-medium">Til:</span> {emailData.supplier}
            {isLoadingEmail && (
              <span className="ml-2 text-neutral-secondary">
                (Laster e-postadresse...)
              </span>
            )}
            {!isLoadingEmail && recipientEmail && (
              <span className="ml-2 text-neutral-secondary">
                ({recipientEmail})
              </span>
            )}
            {!isLoadingEmail && !recipientEmail && (
              <span className="ml-2 text-accent">
                (Ingen e-postadresse funnet)
              </span>
            )}
          </div>
          <div>
            <span className="font-medium">Emne:</span>{" "}
            {emailData.language === "no"
              ? `Purring på manglende leveranser - ${emailData.supplier}`
              : `Reminder for Outstanding Orders - ${emailData.supplier}`}
          </div>
        </div>

        <div className="overflow-auto flex-1 p-6 bg-neutral-light">
          <div
            className="bg-neutral-white p-6 border rounded-md shadow-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        <div className="p-6 border-t flex justify-end space-x-4">
          <button className="btn btn-secondary" onClick={onCancel}>
            Avbryt
          </button>
          <button
            className={`btn ${
              !isLoadingEmail && recipientEmail
                ? "btn-primary"
                : "bg-neutral-secondary text-neutral-light cursor-not-allowed"
            }`}
            onClick={onSend}
            disabled={isLoadingEmail || !recipientEmail}
          >
            {isLoadingEmail ? "Laster..." : "Send e-post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
