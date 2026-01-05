import React, { useState, useMemo, useEffect } from 'react';
import { EmailService, EmailData } from '../services/emailService';
import toast from 'react-hot-toast';
import EmailPreviewModal from './EmailPreviewModal';
import { ExcelData, ExcelRow } from '../types/ExcelData';

interface EmailButtonProps {
  excelData?: ExcelData;
  selectedSupplier: string;
  onPrevious?: () => void;
}

const emailService = new EmailService();

const EmailButton: React.FC<EmailButtonProps> = ({
  excelData,
  selectedSupplier,
  onPrevious: _onPrevious,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [supplierLanguage, setSupplierLanguage] = useState<'no' | 'en' | 'se' | 'da' | 'fi'>('no');
  const [emailData, setEmailData] = useState<EmailData>({
    supplier: selectedSupplier || '',
    orders: [],
    language: 'no', // Will be updated by useEffect
    subject: '',
  });
  const [previewHtml, setPreviewHtml] = useState('');

  // Fetch supplier language from database/country when supplier changes
  useEffect(() => {
    const fetchLanguage = async () => {
      if (!selectedSupplier) return;

      try {
        const language = await emailService.getLanguageForSupplier(selectedSupplier);
        console.log(`EmailButton: Fetched language for ${selectedSupplier}: ${language}`);
        setSupplierLanguage(language);
        setEmailData((prev) => ({ ...prev, language }));
      } catch (error) {
        console.error('Failed to fetch supplier language:', error);
        // Keep the default 'no' language
      }
    };

    fetchLanguage();
  }, [selectedSupplier]);

  // Create order list from excel data with language-aware date formatting
  const orders = useMemo(() => {
    if (!excelData?.bp || !selectedSupplier) return [];

    // Use the fetched language for date formatting
    const dateLocale =
      supplierLanguage === 'en'
        ? 'en-GB'
        : supplierLanguage === 'da'
          ? 'da-DK'
          : supplierLanguage === 'se'
            ? 'sv-SE'
            : supplierLanguage === 'fi'
              ? 'fi-FI'
              : 'no-NO';

    return excelData.bp
      .filter((row) => row.supplier === selectedSupplier)
      .map((row: ExcelRow) => ({
        key: row.key,
        poNumber: String(row.poNumber || ''),
        itemNo: String(row.itemNo || ''),
        description: String(row.supplierArticleNo || row.description || ''),
        specification: String(row.specification || ''),
        orderQty: Number(row.orderQty || 0),
        receivedQty: Number(row.receivedQty || 0),
        estReceiptDate: row.dueDate ? row.dueDate.toLocaleDateString(dateLocale) : '',
        outstandingQty: Number(row.outstandingQty || 0),
        orderRowNumber: String(row.orderRowNumber || ''),
      }));
  }, [excelData, selectedSupplier, supplierLanguage]);

  // Handler to prepare and show the email preview
  const handlePreview = () => {
    // Update email data with the latest supplier, orders, and language
    const updatedData: EmailData = {
      supplier: selectedSupplier || '',
      orders,
      language: emailData.language || supplierLanguage,
      subject: emailData.subject,
    };
    setEmailData(updatedData);

    // Generate preview HTML
    const html = emailService.generatePreview(updatedData);
    setPreviewHtml(html);

    // Show the preview modal
    setShowPreview(true);
  };

  // Handle language change
  const handleLanguageChange = (language: 'no' | 'en' | 'se' | 'da' | 'fi') => {
    const updatedData = { ...emailData, language };
    setEmailData(updatedData);

    // Update preview with new language
    const html = emailService.generatePreview(updatedData);
    setPreviewHtml(html);
  };

  // Handle recipient email change
  const handleRecipientChange = (recipientEmail: string) => {
    console.log('EmailButton: handleRecipientChange called with:', recipientEmail);
    const updatedData = { ...emailData, recipientEmail };
    setEmailData(updatedData);
    console.log('EmailButton: Updated emailData:', updatedData);
  };

  const handleSendEmail = async () => {
    if (!selectedSupplier) {
      console.error('No supplier selected, cannot send email.');
      toast.error('Ingen leverandør valgt.');
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
          console.error('Failed to record email in database:', dbError);
          // Don't show an error to the user - this is not critical
        }
      } else {
        throw new Error(result.error);
      }
    } catch {
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 500; // Exponential backoff
        toast.error(`Kunne ikke sende e-post. Prøver igjen om ${delay / 1000} sekunder...`);
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          handleSendEmail();
        }, delay);
      } else {
        toast.error(
          <span>
            Kunne ikke sende e-post. Vil du prøve igjen?{' '}
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
            duration: 10000,
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
        <p className="text-neutral">Ingen data tilgjengelig. Vennligst velg en leverandør først.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 text-neutral">Send e-post</h2>

      <div className="bg-primary-light bg-opacity-10 p-6 mb-6 rounded-md shadow-sm w-full">
        <h3 className="font-medium text-primary mb-2">Valgt leverandør: {selectedSupplier}</h3>
        <p className="text-sm text-neutral-secondary">
          {orders.length} utestående ordre vil bli inkludert i e-posten.
        </p>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <button
          onClick={handlePreview}
          disabled={isSending}
          className={`btn px-4 py-2 font-medium ease-in-out ${
            isSending
              ? 'bg-neutral-secondary cursor-not-allowed'
              : 'bg-primary text-neutral-white hover:bg-primary-dark'
          }`}
          aria-label={`Forbered e-post til ${selectedSupplier}`}
          aria-busy={isSending}
        >
          {isSending ? 'Forbereder e-post...' : 'Forbered e-post'}
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
