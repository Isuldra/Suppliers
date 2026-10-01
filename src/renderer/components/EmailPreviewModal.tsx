import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LANGUAGES, validRecipients, type Language } from '../workspace/model';
import { reminderSubject } from '../workspace/reminder';

interface EmailData {
  supplier: string;
  recipientEmail?: string;
  language?: Language;
}

interface EmailPreviewModalProps {
  emailData: EmailData;
  previewHtml: string;
  onSend: () => void;
  onCancel: () => void;
  onChangeLanguage: (language: 'no' | 'en' | 'se' | 'da' | 'fi') => void;
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
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editableEmail, setEditableEmail] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement;
    const focusDialog = () => (closeRef.current || dialog).focus();
    const containFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusDialog();
    };
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]'
        ),
      ].filter((element) => {
        const style = getComputedStyle(element);
        return (
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[hidden], [inert]') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    focusDialog();
    document.addEventListener('focusin', containFocus);
    document.addEventListener('keydown', trapTab);
    return () => {
      document.removeEventListener('focusin', containFocus);
      document.removeEventListener('keydown', trapTab);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsEditingEmail(false);
    const loadSupplierEmail = async () => {
      setIsLoadingEmail(true);
      try {
        if (emailData.recipientEmail) {
          setRecipientEmail(emailData.recipientEmail);
          setEditableEmail(emailData.recipientEmail);
        } else {
          const result = await window.electron.getSupplierEmail(emailData.supplier);
          if (!active) return;
          if (!result.success) throw new Error(result.error || 'Could not load supplier email');
          setRecipientEmail(result.data || null);
          setEditableEmail(result.data || '');
        }
      } catch (error) {
        if (!active) return;
        console.error('Error loading supplier email:', error);
        setRecipientEmail(null);
        setEditableEmail('');
      } finally {
        if (active) setIsLoadingEmail(false);
      }
    };

    loadSupplierEmail();
    return () => {
      active = false;
    };
  }, [emailData.supplier, emailData.recipientEmail]);

  const handleEmailEdit = () => {
    setIsEditingEmail(true);
  };

  const handleEmailSave = () => {
    if (validRecipients(editableEmail)) {
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

  const subject = reminderSubject({
    supplier: emailData.supplier,
    recipient: recipientEmail || '',
    language: emailData.language || 'no',
    lines: [],
  });
  const languageButtons = Object.entries(LANGUAGES) as [Language, string][];

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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-preview-title"
        className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl w-full max-w-7xl max-h-[90vh] min-w-0 overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <div className="p-4 sm:p-6 border-b flex flex-wrap justify-between items-start gap-3 flex-shrink-0">
          <h2
            id="email-preview-title"
            className="text-xl font-bold text-neutral min-w-0 break-words"
          >
            Forhåndsvisning av e-post
          </h2>
          <div className="flex min-w-0 max-w-full items-start gap-3">
            <div className="flex min-w-0 flex-wrap gap-1">
              {languageButtons.map(([code, label]) => (
                <button
                  key={code}
                  className={`px-3 py-1 rounded-sm transition-default text-sm ${
                    emailData.language === code
                      ? 'bg-primary text-neutral-white'
                      : 'bg-neutral-light text-neutral hover:bg-neutral-200'
                  }`}
                  onClick={() => onChangeLanguage(code)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              ref={closeRef}
              onClick={onCancel}
              className="text-neutral-secondary hover:text-neutral transition-colors p-2 shrink-0 hover:bg-neutral-light rounded-full"
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

        <div className="p-4 sm:p-6 border-b flex-shrink-0 [overflow-wrap:anywhere]">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="shrink-0 font-medium">Til:</span>
              <span className="min-w-0 text-right text-sm text-neutral-secondary">
                {emailData.supplier}
              </span>
            </div>

            {isLoadingEmail && (
              <div className="text-neutral-secondary">Laster e-postadresse...</div>
            )}

            {!isLoadingEmail && !isEditingEmail && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-dark font-mono bg-neutral-light px-3 py-2 rounded border flex-1 min-w-0 break-all">
                  {recipientEmail || 'Ingen e-postadresse funnet'}
                </span>
                <button
                  onClick={handleEmailEdit}
                  className="px-3 py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                  title="Rediger e-postadresse"
                >
                  Rediger
                </button>
              </div>
            )}

            {!isLoadingEmail && isEditingEmail && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={editableEmail}
                  onChange={(e) => setEditableEmail(e.target.value)}
                  className="w-full min-w-0 sm:flex-1 px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="skriv@epostadresse.no"
                  autoFocus
                />
                <button
                  onClick={handleEmailSave}
                  disabled={!validRecipients(editableEmail)}
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
                Ingen e-postadresse funnet. Klikk &quot;Rediger&quot; for å legge til manuelt.
              </div>
            )}
          </div>
          <div>
            <span className="font-medium">Emne:</span> {subject}
          </div>
        </div>

        <div className="overflow-x-auto flex-shrink-0 p-6 bg-neutral-light">
          <div
            className="bg-neutral-white p-6 border rounded-md shadow-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        <div className="p-4 sm:p-6 border-t flex flex-wrap justify-end gap-3 flex-shrink-0">
          <button
            className="btn btn-secondary px-4 py-2 font-medium ease-in-out bg-neutral-white text-primary border border-primary hover:bg-primary-light hover:text-neutral-white"
            onClick={onCancel}
          >
            Avbryt
          </button>
          <button
            className={`btn px-4 py-2 font-medium ease-in-out ${
              !isLoadingEmail && validRecipients(recipientEmail || '')
                ? 'bg-primary text-neutral-white hover:bg-primary-dark'
                : 'bg-neutral-secondary text-neutral-light cursor-not-allowed'
            }`}
            onClick={onSend}
            disabled={isLoadingEmail || !validRecipients(recipientEmail || '')}
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
