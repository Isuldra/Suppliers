import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { EmailService, EmailData } from '../services/emailService';
import { ExcelRow } from '../types/ExcelData';
import supplierData from '../data/supplierData.json';
import EmailPreviewModal from './EmailPreviewModal';
import { SlackService } from '../services/slackService';

interface BulkEmailPreviewProps {
  selectedSuppliers: string[];
  selectedOrders: Map<string, Set<string>>; // supplier -> selected order keys
  bulkSupplierEmails?: Map<string, string>; // supplier -> custom email
  onBack: () => void;
  onComplete: () => void;
}

interface SupplierInfo {
  leverandør: string;
  companyId: number;
  epost: string;
  språk: string;
  språkKode: 'NO' | 'ENG';
  purredag: string;
}

interface EmailPreviewData {
  supplier: string;
  email: string;
  language: 'no' | 'en';
  languageDisplay: string;
  orderCount: number;
  orders: ExcelRow[];
  isSending: boolean;
  sendResult?: { success: boolean; error?: string };
}

const BulkEmailPreview: React.FC<BulkEmailPreviewProps> = ({
  selectedSuppliers,
  selectedOrders,
  bulkSupplierEmails,
  onBack,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  // Preview functionality
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSupplier, setPreviewSupplier] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [customEmails, setCustomEmails] = useState<Map<string, string>>(new Map());

  const emailService = new EmailService();

  // Get supplier info from supplierData.json
  const getSupplierInfo = (supplierName: string): SupplierInfo | null => {
    console.log(`🔍 BulkEmailPreview: Looking for supplier: "${supplierName}"`);
    // First try exact match
    let supplier = supplierData.leverandører.find((s) => s.leverandør === supplierName);

    // If no exact match, try case-insensitive match
    if (!supplier) {
      supplier = supplierData.leverandører.find(
        (s) => s.leverandør.toLowerCase() === supplierName.toLowerCase()
      );
    }

    // If still no match, try partial match (contains)
    if (!supplier) {
      supplier = supplierData.leverandører.find(
        (s) =>
          s.leverandør.toLowerCase().includes(supplierName.toLowerCase()) ||
          supplierName.toLowerCase().includes(s.leverandør.toLowerCase())
      );
    }

    if (supplier) {
      console.log(`✅ BulkEmailPreview: Found supplier info:`, supplier);
      const customEmail = bulkSupplierEmails?.get(supplierName);
      return {
        ...supplier,
        språkKode: supplier.språkKode as 'NO' | 'ENG',
        epost: customEmail !== undefined ? customEmail : supplier.epost,
      };
    } else {
      console.log(`❌ BulkEmailPreview: Supplier not found: "${supplierName}"`);
      console.log(
        `Available suppliers:`,
        supplierData.leverandører.map((s) => s.leverandør)
      );
    }
    return null;
  };

  // Prepare email data for all suppliers
  useEffect(() => {
    const prepareEmailData = async () => {
      console.log('🔵 BulkEmailPreview: prepareEmailData called');
      console.log('🔵 selectedSuppliers:', selectedSuppliers);
      console.log('🔵 selectedOrders:', selectedOrders);
      setIsLoading(true);
      try {
        const allOrders = await window.electron.getAllOrders();
        const emailData: EmailPreviewData[] = [];

        for (const supplierName of selectedSuppliers) {
          const supplierInfo = getSupplierInfo(supplierName);
          const supplierOrderKeys = selectedOrders.get(supplierName) || new Set();
          console.log(`🔵 Supplier: ${supplierName}, OrderKeys:`, supplierOrderKeys);
          const orders = allOrders.filter(
            (order) => order.supplier === supplierName && supplierOrderKeys.has(order.key)
          );
          console.log(`🔵 Filtered orders for ${supplierName}:`, orders.length);

          if (orders.length > 0) {
            const language = supplierInfo?.språkKode === 'ENG' ? 'en' : 'no';
            const languageDisplay = supplierInfo?.språk || 'Norsk';

            emailData.push({
              supplier: supplierName,
              email: supplierInfo?.epost || '',
              language,
              languageDisplay,
              orderCount: orders.length,
              orders: orders as unknown as ExcelRow[],
              isSending: false,
            });
          }
        }

        console.log('🔵 Final emailData:', emailData);
        setEmailPreviewData(emailData);
      } catch (error) {
        console.error('Error preparing email data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedSuppliers.length > 0) {
      prepareEmailData();
    }
  }, [selectedSuppliers, selectedOrders.size, bulkSupplierEmails]);

  // Handle email editing
  const handleEmailChange = (supplier: string, email: string) => {
    setCustomEmails(new Map(customEmails.set(supplier, email)));
  };

  // Get email for supplier (custom or default)
  const getEmailForSupplier = (supplier: string, defaultEmail: string): string => {
    // First check if supplier has a bulk email from BulkSupplierSelect
    if (bulkSupplierEmails?.has(supplier)) {
      return bulkSupplierEmails.get(supplier) || '';
    }
    // Then check if supplier has a custom email in this component (including empty string)
    if (customEmails.has(supplier)) {
      return customEmails.get(supplier) || '';
    }
    // Return default email only if no custom email has been set
    return defaultEmail;
  };

  // Preview email for a supplier
  const handlePreviewEmail = async (supplier: string) => {
    const supplierData = emailPreviewData.find((s) => s.supplier === supplier);
    if (!supplierData) return;

    const emailData: EmailData = {
      supplier: supplierData.supplier,
      recipientEmail: getEmailForSupplier(supplierData.supplier, supplierData.email),
      orders: supplierData.orders.map((order) => ({
        key: order.key,
        poNumber: order.poNumber,
        itemNo: order.itemNo || '',
        description: order.supplierArticleNo || order.description || '',
        specification: order.specification || '',
        orderQty: order.orderQty,
        receivedQty: order.receivedQty,
        estReceiptDate: order.dueDate
          ? new Date(order.dueDate).toLocaleDateString('nb-NO')
          : 'Ikke spesifisert',
        outstandingQty: order.outstandingQty,
        orderRowNumber: order.orderRowNumber,
      })),
      language: supplierData.language,
      subject:
        supplierData.language === 'no'
          ? `Purring på manglende leveranser – ${supplierData.supplier}`
          : `Reminder: Outstanding Deliveries – ${supplierData.supplier}`,
    };

    const html = emailService.generatePreview(emailData);
    setPreviewHtml(html);
    setPreviewSupplier(supplier);
    setShowPreviewModal(true);
  };

  // Send all emails using optimized batch function
  const handleSendAllEmails = async () => {
    setIsSending(true);
    setSendingProgress(0);

    try {
      const totalEmails = emailPreviewData.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < emailPreviewData.length; i++) {
        const supplierData = emailPreviewData[i];

        // Update sending status
        setEmailPreviewData((prev) =>
          prev.map((s) => (s.supplier === supplierData.supplier ? { ...s, isSending: true } : s))
        );

        try {
          const recipientEmail = getEmailForSupplier(supplierData.supplier, supplierData.email);

          // Skip sending if no email address is provided
          if (!recipientEmail || recipientEmail.trim() === '') {
            console.warn(`Skipping email for ${supplierData.supplier} - no email address provided`);
            setEmailPreviewData((prev) =>
              prev.map((s) =>
                s.supplier === supplierData.supplier
                  ? {
                      ...s,
                      isSending: false,
                      sendResult: {
                        success: false,
                        error: t('bulkEmailPreview.noEmailProvided'),
                      },
                    }
                  : s
              )
            );
            continue;
          }

          const emailData: EmailData = {
            supplier: supplierData.supplier,
            recipientEmail: recipientEmail,
            orders: supplierData.orders.map((order) => ({
              key: order.key,
              poNumber: order.poNumber,
              itemNo: order.itemNo || '',
              description: order.supplierArticleNo || order.description || '',
              specification: order.specification || '',
              orderQty: order.orderQty,
              receivedQty: order.receivedQty,
              estReceiptDate: order.dueDate
                ? new Date(order.dueDate).toLocaleDateString('nb-NO')
                : 'Ikke spesifisert',
              outstandingQty: order.outstandingQty,
              orderRowNumber: order.orderRowNumber,
            })),
            language: supplierData.language,
            subject:
              supplierData.language === 'no'
                ? `Purring på manglende leveranser – ${supplierData.supplier}`
                : `Reminder: Outstanding Deliveries – ${supplierData.supplier}`,
          };

          const html = emailService.generatePreview(emailData);
          const result = await window.electron.sendEmailAutomatically({
            to: recipientEmail, // Use the manually selected email address
            subject: emailData.subject,
            html: html,
          });

          // Update result
          setEmailPreviewData((prev) =>
            prev.map((s) =>
              s.supplier === supplierData.supplier
                ? { ...s, isSending: false, sendResult: result }
                : s
            )
          );

          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error sending email to ${supplierData.supplier}:`, error);
          setEmailPreviewData((prev) =>
            prev.map((s) =>
              s.supplier === supplierData.supplier
                ? {
                    ...s,
                    isSending: false,
                    sendResult: { success: false, error: String(error) },
                  }
                : s
            )
          );
          failCount++;
        }

        // Update progress
        setSendingProgress(((i + 1) / totalEmails) * 100);
      }

      // Send Slack notification (non-blocking)
      try {
        const failures = emailPreviewData
          .filter((s) => s.sendResult && !s.sendResult.success)
          .map((s) => ({
            supplier: s.supplier,
            error: s.sendResult?.error || 'Unknown error',
          }));

        await SlackService.sendBulkEmailNotification({
          recipientCount: totalEmails,
          template: 'Standard Reminder (Norwegian/English)',
          scheduled: 'Immediate',
          successCount,
          failCount,
          failures: failures.length > 0 ? failures : undefined,
        });
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
        // Don't show error to user - Slack is optional
      }

      // Show completion message
      if (successCount === totalEmails) {
        alert(t('bulkEmailPreview.allEmailsSentSuccess', { count: successCount }));
        onComplete();
      } else if (successCount > 0) {
        alert(
          t('bulkEmailPreview.partialSuccess', {
            success: successCount,
            failed: failCount,
          })
        );
      } else {
        alert(t('bulkEmailPreview.allEmailsFailed', { count: failCount }));
      }
    } catch (error) {
      console.error('Error in bulk email sending:', error);
      alert(t('email.emailError'));
    } finally {
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalSuppliers = emailPreviewData.length;
    const totalOrders = emailPreviewData.reduce((sum, s) => sum + s.orderCount, 0);
    const sendingCount = emailPreviewData.filter((s) => s.isSending).length;
    const successCount = emailPreviewData.filter((s) => s.sendResult?.success).length;
    const failCount = emailPreviewData.filter((s) => s.sendResult && !s.sendResult.success).length;

    return {
      totalSuppliers,
      totalOrders,
      sendingCount,
      successCount,
      failCount,
    };
  }, [emailPreviewData]);

  // Check for mixed languages
  const hasMixedLanguages = useMemo(() => {
    if (emailPreviewData.length <= 1) return false;
    const languages = new Set(emailPreviewData.map((s) => s.language));
    return languages.size > 1;
  }, [emailPreviewData]);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-slate-800">{t('bulkEmailPreview.preparingData')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with summary */}
      <div className="mb-6 p-6 bg-white/50 backdrop-blur-2xl rounded-2xl border border-white/40 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-2 drop-shadow-sm">
          {t('bulkEmailPreview.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-slate-900">{t('bulkEmailPreview.suppliers')}</span>{' '}
            {totals.totalSuppliers}
          </div>
          <div>
            <span className="font-medium text-slate-900">{t('bulkEmailPreview.orderLines')}</span>{' '}
            {totals.totalOrders}
          </div>
          <div>
            <span className="font-medium text-slate-900">{t('bulkEmailPreview.emails')}</span>{' '}
            {totals.totalSuppliers}
          </div>
        </div>
        {hasMixedLanguages && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {t('bulkEmailPreview.mixedLanguageInfo')}
          </div>
        )}
      </div>

      {/* Sending progress */}
      {isSending && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              {t('bulkEmailPreview.sendingEmails', {
                current: totals.sendingCount,
                total: totals.totalSuppliers,
              })}
            </span>
            <span className="text-sm text-blue-600">{Math.round(sendingProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${sendingProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Email list */}
      <div className="space-y-4 mb-6">
        {emailPreviewData.map((supplierData) => (
          <div
            key={supplierData.supplier}
            className="bg-white/30 backdrop-blur-md border border-white/30 rounded-xl p-4 hover:bg-white/40 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="font-medium text-slate-900">{supplierData.supplier}</h3>
                  <p className="text-sm text-slate-800">
                    {supplierData.orderCount} ordrelinjer • {supplierData.languageDisplay}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    supplierData.language === 'no'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {supplierData.languageDisplay}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status indicator */}
                {supplierData.isSending && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm">{t('bulkEmailPreview.sending')}</span>
                  </div>
                )}

                {supplierData.sendResult && (
                  <div
                    className={`flex items-center ${
                      supplierData.sendResult.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {supplierData.sendResult.success
                        ? t('bulkEmailPreview.sent')
                        : t('bulkEmailPreview.failed')}
                    </span>
                  </div>
                )}

                {/* Preview button */}
                <button
                  onClick={() => handlePreviewEmail(supplierData.supplier)}
                  className="btn btn-secondary btn-sm bg-white/60 backdrop-blur-md border border-white/40 hover:bg-white/80 transition-all duration-200"
                  disabled={supplierData.isSending}
                  title={
                    supplierData.isSending
                      ? t('bulkEmailPreview.sending')
                      : t('bulkEmailPreview.preview')
                  }
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {t('bulkEmailPreview.preview')}
                </button>
              </div>
            </div>

            {/* Email address editing */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-900">
                  {t('bulkEmailPreview.emailAddress')}
                </label>
                {(customEmails.has(supplierData.supplier) ||
                  bulkSupplierEmails?.has(supplierData.supplier)) && (
                  <button
                    onClick={() => {
                      const newCustomEmails = new Map(customEmails);
                      newCustomEmails.delete(supplierData.supplier);
                      setCustomEmails(newCustomEmails);
                    }}
                    className="text-xs text-slate-700 hover:text-teal-600 transition-colors"
                    disabled={supplierData.isSending || supplierData.sendResult?.success}
                  >
                    {t('bulkEmailPreview.resetToDefault')}
                  </button>
                )}
              </div>
              <input
                type="email"
                value={getEmailForSupplier(supplierData.supplier, supplierData.email)}
                onChange={(e) => handleEmailChange(supplierData.supplier, e.target.value)}
                className={`text-sm max-w-md bg-white/50 backdrop-blur-md border border-white/30 rounded-lg shadow-inner focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/30 focus:outline-none transition-all duration-200 px-3 py-2 ${
                  !getEmailForSupplier(supplierData.supplier, supplierData.email) ||
                  getEmailForSupplier(supplierData.supplier, supplierData.email).trim() === ''
                    ? 'border-red-300 bg-red-50/60'
                    : ''
                }`}
                placeholder={supplierData.email}
                disabled={supplierData.isSending || supplierData.sendResult?.success}
              />
              {(!getEmailForSupplier(supplierData.supplier, supplierData.email) ||
                getEmailForSupplier(supplierData.supplier, supplierData.email).trim() === '') && (
                <p className="text-xs text-red-600 mt-1">{t('bulkEmailPreview.noEmailWarning')}</p>
              )}
            </div>

            {/* Error message */}
            {supplierData.sendResult && !supplierData.sendResult.success && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <strong>{t('bulkEmailPreview.error')}</strong> {supplierData.sendResult.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary bg-white/60 backdrop-blur-md border border-white/40 hover:bg-white/80 transition-all duration-200"
          disabled={isSending}
        >
          {t('bulkEmailPreview.backToOrderSelection')}
        </button>

        <button
          onClick={handleSendAllEmails}
          className="btn btn-primary bg-teal-600/90 backdrop-blur-md border border-teal-400/30 hover:bg-teal-700/95 text-white shadow-lg transition-all duration-200"
          disabled={isSending || totals.totalSuppliers === 0}
        >
          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
          {isSending ? t('bulkEmailPreview.sending') : t('bulkEmailPreview.sendAll')}
        </button>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && previewSupplier && (
        <EmailPreviewModal
          emailData={{
            supplier: previewSupplier,
            recipientEmail: getEmailForSupplier(
              previewSupplier,
              emailPreviewData.find((s) => s.supplier === previewSupplier)?.email || ''
            ),
            orders:
              emailPreviewData
                .find((s) => s.supplier === previewSupplier)
                ?.orders.map((order) => ({
                  key: order.key,
                  poNumber: order.poNumber,
                  itemNo: order.itemNo || '',
                  description: order.supplierArticleNo || order.description || '',
                  specification: order.specification || '',
                  orderQty: order.orderQty,
                  receivedQty: order.receivedQty,
                  estReceiptDate: order.dueDate
                    ? new Date(order.dueDate).toLocaleDateString('nb-NO')
                    : 'Ikke spesifisert',
                  outstandingQty: order.outstandingQty,
                  orderRowNumber: order.orderRowNumber,
                })) || [],
            language:
              emailPreviewData.find((s) => s.supplier === previewSupplier)?.language || 'no',
            subject:
              emailPreviewData.find((s) => s.supplier === previewSupplier)?.language === 'no'
                ? `Purring på manglende leveranser – ${previewSupplier}`
                : `Reminder: Outstanding Deliveries – ${previewSupplier}`,
          }}
          previewHtml={previewHtml}
          onSend={() => {
            // In bulk mode, we don't send individual emails from the preview modal
            // The user should use the "Send All" button instead
            setShowPreviewModal(false);
          }}
          onCancel={() => setShowPreviewModal(false)}
          onChangeLanguage={() => {
            // Language change not supported in bulk mode preview
          }}
          onChangeRecipient={() => {
            // Recipient change not supported in bulk mode preview
          }}
        />
      )}
    </div>
  );
};

export default BulkEmailPreview;
