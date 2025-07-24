import React, { useState, useEffect } from "react";
import { EmailData, EmailService } from "../services/emailService";

interface EmailPreviewModalProps {
  emailData: EmailData;
  previewHtml: string;
  onSend: () => void;
  onCancel: () => void;
  onChangeLanguage: (language: "no" | "en") => void;
  onChangeRecipient: (email: string) => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  emailData,
  previewHtml,
  onSend,
  onCancel,
  onChangeLanguage,
  onChangeRecipient,
}) => {
  const emailService = new EmailService();
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editableEmail, setEditableEmail] = useState("");

  // Load supplier email when component mounts or supplier changes
  useEffect(() => {
    const loadSupplierEmail = async () => {
      setIsLoadingEmail(true);
      try {
        // Use manually overridden email if provided
        if (emailData.recipientEmail) {
          setRecipientEmail(emailData.recipientEmail);
          setEditableEmail(emailData.recipientEmail);
        } else {
          // Try to get email from the new structured data first
          const supplierInfo = emailService.getSupplierInfo(emailData.supplier);
          if (supplierInfo) {
            setRecipientEmail(supplierInfo.epost);
            setEditableEmail(supplierInfo.epost);
          } else {
            // Fallback to database lookup
            const email = await emailService.getSupplierEmail(
              emailData.supplier
            );
            setRecipientEmail(email);
            setEditableEmail(email || "");
          }
        }
      } catch (error) {
        console.error("Error loading supplier email:", error);
        setRecipientEmail(null);
        setEditableEmail("");
      } finally {
        setIsLoadingEmail(false);
      }
    };

    loadSupplierEmail();
  }, [emailData.supplier, emailData.recipientEmail]);

  const handleEmailEdit = () => {
    setIsEditingEmail(true);
  };

  const handleEmailSave = () => {
    if (editableEmail.trim() && editableEmail.includes("@")) {
      const trimmedEmail = editableEmail.trim();
      setRecipientEmail(trimmedEmail);
      // Update the emailData with the new recipient email
      const updatedEmailData = {
        ...emailData,
        recipientEmail: trimmedEmail,
      };
      onChangeRecipient(trimmedEmail);
      setIsEditingEmail(false);
    }
  };

  const handleEmailCancel = () => {
    setEditableEmail(recipientEmail || "");
    setIsEditingEmail(false);
  };

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
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Til:</span>
              <span className="text-sm text-neutral-secondary">
                {emailData.supplier}
              </span>
            </div>

            {isLoadingEmail && (
              <div className="text-neutral-secondary">
                Laster e-postadresse...
              </div>
            )}

            {!isLoadingEmail && !isEditingEmail && (
              <div className="flex items-center space-x-2">
                <span className="text-neutral-dark font-mono bg-neutral-light px-3 py-2 rounded border flex-1">
                  {recipientEmail || "Ingen e-postadresse funnet"}
                </span>
                <button
                  onClick={handleEmailEdit}
                  className="px-3 py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                  title="Rediger e-postadresse"
                >
                  ✏️ Rediger
                </button>
              </div>
            )}

            {!isLoadingEmail && isEditingEmail && (
              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  value={editableEmail}
                  onChange={(e) => setEditableEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="skriv@epostadresse.no"
                  autoFocus
                />
                <button
                  onClick={handleEmailSave}
                  disabled={
                    !editableEmail.trim() || !editableEmail.includes("@")
                  }
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-neutral-secondary disabled:cursor-not-allowed transition-colors"
                >
                  ✓ Lagre
                </button>
                <button
                  onClick={handleEmailCancel}
                  className="px-3 py-2 text-sm bg-neutral-secondary text-neutral-dark rounded hover:bg-neutral transition-colors"
                >
                  ✕ Avbryt
                </button>
              </div>
            )}

            {!isLoadingEmail && !recipientEmail && !isEditingEmail && (
              <div className="text-accent text-sm">
                ⚠️ Ingen e-postadresse funnet. Klikk &quot;Rediger&quot; for å
                legge til manuelt.
              </div>
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
          <button
            className="btn btn-secondary px-4 py-2 font-medium ease-in-out bg-neutral-white text-primary border border-primary hover:bg-primary-light hover:text-neutral-white"
            onClick={onCancel}
          >
            Avbryt
          </button>
          <button
            className={`btn px-4 py-2 font-medium ease-in-out ${
              !isLoadingEmail && recipientEmail
                ? "bg-primary text-neutral-white hover:bg-primary-dark"
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
