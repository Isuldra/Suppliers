import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { EmailService, EmailData } from '../services/emailService';
import { ExcelRow } from '../types/ExcelData';
import supplierData from '../data/supplierData.json';
import EmailPreviewModal from './EmailPreviewModal';
import { useICTOrder } from '../context/ICTOrderContext';

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
  language: 'no' | 'en' | 'se' | 'da' | 'fi';
  languageDisplay: string;
  country: string | null; // Country code for sender email selection (DK, NO, SE, FI)
  orderCount: number;
  orders: ExcelRow[];
  isSending: boolean;
  sendResult?: { success: boolean; error?: string };
}

// Helper function to get subject in the correct language
const getSubjectForLanguage = (
  language: 'no' | 'en' | 'se' | 'da' | 'fi',
  supplier: string
): string => {
  const subjectTemplates: Record<string, string> = {
    no: `Purring på manglende leveranser – ${supplier}`,
    en: `Reminder: Outstanding Deliveries – ${supplier}`,
    se: `Påminnelse om utestående leveranser – ${supplier}`,
    da: `Påmindelse om udestående leverancer – ${supplier}`,
    fi: `Muistutus vireillä olevista toimituksista – ${supplier}`,
  };
  return subjectTemplates[language] || subjectTemplates.no;
};

const BulkEmailPreview: React.FC<BulkEmailPreviewProps> = ({
  selectedSuppliers,
  selectedOrders,
  bulkSupplierEmails,
  onBack,
  onComplete,
}) => {
  const { t } = useTranslation();
  const { includeICTOrders } = useICTOrder();
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  // Preview functionality
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSupplier, setPreviewSupplier] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLanguage, setPreviewLanguage] = useState<'no' | 'en' | 'se' | 'da' | 'fi'>('no');
  const [customEmails, setCustomEmails] = useState<Map<string, string>>(new Map());
  const [customLanguages, setCustomLanguages] = useState<
    Map<string, 'no' | 'en' | 'se' | 'da' | 'fi'>
  >(new Map());

  const emailService = useMemo(() => new EmailService(), []);

  // Get supplier info from supplierData.json
  const getSupplierInfo = useCallback(
    (supplierName: string): SupplierInfo | null => {
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
    },
    [bulkSupplierEmails]
  );

  // Prepare email data for all suppliers
  const prepareEmailData = useCallback(async () => {
    console.log('🔵 BulkEmailPreview: prepareEmailData called');
    console.log('🔵 selectedSuppliers:', selectedSuppliers);
    console.log('🔵 selectedOrders:', selectedOrders);
    setIsLoading(true);
    try {
      const allOrders = await window.electron.getAllOrders(includeICTOrders);
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
          // Get language from database/country - this handles DK suppliers correctly
          const language = await emailService.getLanguageForSupplier(supplierName);

          // Get country for sender email selection
          const country = await emailService.getSupplierCountryFromDB(supplierName);

          // Map language code to display name
          const languageDisplayMap: Record<string, string> = {
            no: 'Norsk',
            en: 'English',
            se: 'Svenska',
            da: 'Dansk',
            fi: 'Suomi',
          };
          const languageDisplay = languageDisplayMap[language] || 'Norsk';

          // Get email from database if not in static JSON
          let email = supplierInfo?.epost || '';
          if (!email) {
            const emailResponse = await window.electron.getSupplierEmail(supplierName);
            email = emailResponse.success ? emailResponse.data || '' : '';
          }

          emailData.push({
            supplier: supplierName,
            email,
            language,
            languageDisplay,
            country,
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
  }, [selectedSuppliers, selectedOrders, includeICTOrders, getSupplierInfo, emailService]);

  useEffect(() => {
    if (selectedSuppliers.length > 0) {
      prepareEmailData();
    }
  }, [selectedSuppliers, prepareEmailData]);

  // Handle email editing
  const handleEmailChange = (supplier: string, email: string) => {
    setCustomEmails((prev) => {
      const next = new Map(prev);
      next.set(supplier, email);
      return next;
    });
  };

  // Get email for supplier (custom override wins, then bulk selection, then default)
  const getEmailForSupplier = (supplier: string, defaultEmail: string): string => {
    // First check if the user has overridden the email in this component (including empty string)
    if (customEmails.has(supplier)) {
      return customEmails.get(supplier) || '';
    }
    // Then check if supplier has a bulk email from BulkSupplierSelect
    if (bulkSupplierEmails?.has(supplier)) {
      return bulkSupplierEmails.get(supplier) || '';
    }
    // Return default email only if no override has been set
    return defaultEmail;
  };

  // Get language for supplier (custom or default)
  const getLanguageForSupplier = (
    supplier: string,
    defaultLanguage: 'no' | 'en' | 'se' | 'da' | 'fi'
  ): 'no' | 'en' | 'se' | 'da' | 'fi' => {
    // Check if supplier has a custom language override
    if (customLanguages.has(supplier)) {
      return customLanguages.get(supplier)!;
    }
    // Return default language
    return defaultLanguage;
  };

  // Preview email for a supplier
  const handlePreviewEmail = async (supplier: string) => {
    const supplierData = emailPreviewData.find((s) => s.supplier === supplier);
    if (!supplierData) return;

    // Use custom language if set, otherwise use default
    const currentLanguage = getLanguageForSupplier(supplier, supplierData.language);

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
      language: currentLanguage,
      subject: getSubjectForLanguage(currentLanguage, supplierData.supplier),
    };

    const html = emailService.generatePreview(emailData);
    setPreviewHtml(html);
    setPreviewSupplier(supplier);
    setPreviewLanguage(currentLanguage);
    setShowPreviewModal(true);
  };

  // Handle language change in preview modal
  const handleLanguageChange = (supplier: string, language: 'no' | 'en' | 'se' | 'da' | 'fi') => {
    // Save custom language for this supplier
    setCustomLanguages((prev) => {
      const next = new Map(prev);
      next.set(supplier, language);
      return next;
    });

    // Update preview language state
    setPreviewLanguage(language);

    // Update preview HTML immediately
    const supplierData = emailPreviewData.find((s) => s.supplier === supplier);
    if (supplierData) {
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
        language: language,
        subject: getSubjectForLanguage(language, supplierData.supplier),
      };

      const html = emailService.generatePreview(emailData);
      setPreviewHtml(html);
    }
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

          // Use custom language if set, otherwise use default
          const currentLanguage = getLanguageForSupplier(
            supplierData.supplier,
            supplierData.language
          );

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
            language: currentLanguage,
            subject: getSubjectForLanguage(currentLanguage, supplierData.supplier),
          };

          const html = emailService.generatePreview(emailData);
          const result = await window.electron.sendEmailAutomatically({
            to: recipientEmail, // Use the manually selected email address
            subject: emailData.subject,
            html: html,
            country: supplierData.country || undefined, // For sender email selection (DK uses different sender)
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
                    {supplierData.orderCount} ordrelinjer •{' '}
                    {(() => {
                      const currentLanguage = getLanguageForSupplier(
                        supplierData.supplier,
                        supplierData.language
                      );
                      const languageDisplayMap: Record<string, string> = {
                        no: 'Norsk',
                        en: 'English',
                        se: 'Svenska',
                        da: 'Dansk',
                        fi: 'Suomi',
                      };
                      return languageDisplayMap[currentLanguage] || supplierData.languageDisplay;
                    })()}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(() => {
                    const currentLanguage = getLanguageForSupplier(
                      supplierData.supplier,
                      supplierData.language
                    );
                    return (
                      {
                        no: 'bg-blue-100 text-blue-800',
                        en: 'bg-green-100 text-green-800',
                        se: 'bg-yellow-100 text-yellow-800',
                        da: 'bg-red-100 text-red-800',
                        fi: 'bg-purple-100 text-purple-800',
                      }[currentLanguage] || 'bg-blue-100 text-blue-800'
                    );
                  })()}`}
                >
                  {(() => {
                    const currentLanguage = getLanguageForSupplier(
                      supplierData.supplier,
                      supplierData.language
                    );
                    const languageDisplayMap: Record<string, string> = {
                      no: 'Norsk',
                      en: 'English',
                      se: 'Svenska',
                      da: 'Dansk',
                      fi: 'Suomi',
                    };
                    return languageDisplayMap[currentLanguage] || supplierData.languageDisplay;
                  })()}
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
            language: previewLanguage,
            subject: getSubjectForLanguage(previewLanguage, previewSupplier || ''),
          }}
          previewHtml={previewHtml}
          onSend={() => {
            // In bulk mode, we don't send individual emails from the preview modal
            // The user should use the "Send All" button instead
            setShowPreviewModal(false);
          }}
          onCancel={() => setShowPreviewModal(false)}
          onChangeLanguage={(language) => {
            if (previewSupplier) {
              handleLanguageChange(previewSupplier, language);
            }
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
