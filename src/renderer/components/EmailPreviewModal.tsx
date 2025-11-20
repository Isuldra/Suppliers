import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EmailData, EmailService } from '../services/emailService';

interface EmailPreviewModalProps {
  emailData: EmailData;
  previewHtml: string;
  onSend: () => void;
  onCancel: () => void;
  onChangeLanguage: (language: 'no' | 'en') => void;
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
  const [editableEmail, setEditableEmail] = useState('');

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
            const email = await emailService.getSupplierEmail(emailData.supplier);
            setRecipientEmail(email);
            setEditableEmail(email || '');
          }
        }
      } catch (error) {
        console.error('Error loading supplier email:', error);
        setRecipientEmail(null);
        setEditableEmail('');
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
    if (editableEmail.trim() && editableEmail.includes('@')) {
      const trimmedEmail = editableEmail.trim();
      setRecipientEmail(trimmedEmail);
      onChangeRecipient(trimmedEmail);
      setIsEditingEmail(false);
    }
  };

  const handleEmailCancel = () => {
    setEditableEmail(recipientEmail || '');
    setIsEditingEmail(false);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={onCancel}
    >
      <div
        className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-neutral">Forhåndsvisning av e-post</h2>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1 rounded-sm transition-default ${
                  emailData.language === 'no'
                    ? 'bg-primary text-neutral-white'
                    : 'bg-neutral-light text-neutral'
                }`}
                onClick={() => onChangeLanguage('no')}
              >
                Norsk
              </button>
              <button
                className={`px-3 py-1 rounded-sm transition-default ${
                  emailData.language === 'en'
                    ? 'bg-primary text-neutral-white'
                    : 'bg-neutral-light text-neutral'
                }`}
                onClick={() => onChangeLanguage('en')}
              >
                English
              </button>
            </div>
            <button
              onClick={onCancel}
              className="text-neutral-secondary hover:text-neutral transition-colors p-2 hover:bg-neutral-light rounded-full"
              aria-label="Lukk vindu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 border-b flex-shrink-0">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Til:</span>
              <span className="text-sm text-neutral-secondary">{emailData.supplier}</span>
            </div>

            {isLoadingEmail && (
              <div className="text-neutral-secondary">Laster e-postadresse...</div>
            )}

            {!isLoadingEmail && !isEditingEmail && (
              <div className="flex items-center space-x-2">
                <span className="text-neutral-dark font-mono bg-neutral-light px-3 py-2 rounded border flex-1">
                  {recipientEmail || 'Ingen e-postadresse funnet'}
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
                  disabled={!editableEmail.trim() || !editableEmail.includes('@')}
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
                ⚠️ Ingen e-postadresse funnet. Klikk &quot;Rediger&quot; for å legge til manuelt.
              </div>
            )}
          </div>
          <div>
            <span className="font-medium">Emne:</span>{' '}
            {emailData.language === 'no'
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

        <div className="p-6 border-t flex justify-end space-x-4 flex-shrink-0">
          <button
            className="btn btn-secondary px-4 py-2 font-medium ease-in-out bg-neutral-white text-primary border border-primary hover:bg-primary-light hover:text-neutral-white"
            onClick={onCancel}
          >
            Avbryt
          </button>
          <button
            className={`btn px-4 py-2 font-medium ease-in-out ${
              !isLoadingEmail && recipientEmail
                ? 'bg-primary text-neutral-white hover:bg-primary-dark'
                : 'bg-neutral-secondary text-neutral-light cursor-not-allowed'
            }`}
            onClick={onSend}
            disabled={isLoadingEmail || !recipientEmail}
          >
            {isLoadingEmail ? 'Laster...' : 'Send e-post'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EmailPreviewModal;
