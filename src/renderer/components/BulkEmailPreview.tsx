import React, { useState, useEffect, useMemo } from "react";
import { EyeIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { EmailService, EmailData } from "../services/emailService";
import { ExcelRow } from "../types/ExcelData";
import supplierData from "../data/supplierData.json";

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
  språkKode: "NO" | "ENG";
  purredag: string;
}

interface EmailPreviewData {
  supplier: string;
  email: string;
  language: "no" | "en";
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
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  // Preview functionality disabled for performance
  // const [showPreviewModal, setShowPreviewModal] = useState(false);
  // const [previewSupplier, setPreviewSupplier] = useState<string | null>(null);
  // const [previewHtml, setPreviewHtml] = useState<string>("");
  const [customEmails, setCustomEmails] = useState<Map<string, string>>(
    new Map()
  );

  const emailService = new EmailService();

  // Get supplier info from supplierData.json
  const getSupplierInfo = (supplierName: string): SupplierInfo | null => {
    const supplier = supplierData.leverandører.find(
      (s) => s.leverandør === supplierName
    );
    if (supplier) {
      const customEmail = bulkSupplierEmails?.get(supplierName);
      return {
        ...supplier,
        språkKode: supplier.språkKode as "NO" | "ENG",
        epost: customEmail !== undefined ? customEmail : supplier.epost,
      };
    }
    return null;
  };

  // Prepare email data for all suppliers
  useEffect(() => {
    const prepareEmailData = async () => {
      console.log("🔵 BulkEmailPreview: prepareEmailData called");
      console.log("🔵 selectedSuppliers:", selectedSuppliers);
      console.log("🔵 selectedOrders:", selectedOrders);
      setIsLoading(true);
      try {
        const allOrders = await window.electron.getAllOrders();
        const emailData: EmailPreviewData[] = [];

        for (const supplierName of selectedSuppliers) {
          const supplierInfo = getSupplierInfo(supplierName);
          const supplierOrderKeys =
            selectedOrders.get(supplierName) || new Set();
          console.log(
            `🔵 Supplier: ${supplierName}, OrderKeys:`,
            supplierOrderKeys
          );
          const orders = allOrders.filter(
            (order) =>
              order.supplier === supplierName &&
              supplierOrderKeys.has(order.key)
          );
          console.log(`🔵 Filtered orders for ${supplierName}:`, orders.length);

          if (orders.length > 0) {
            const language = supplierInfo?.språkKode === "ENG" ? "en" : "no";
            const languageDisplay = supplierInfo?.språk || "Norsk";

            emailData.push({
              supplier: supplierName,
              email: supplierInfo?.epost || "",
              language,
              languageDisplay,
              orderCount: orders.length,
              orders: orders as unknown as ExcelRow[],
              isSending: false,
            });
          }
        }

        console.log("🔵 Final emailData:", emailData);
        setEmailPreviewData(emailData);
      } catch (error) {
        console.error("Error preparing email data:", error);
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
  const getEmailForSupplier = (
    supplier: string,
    defaultEmail: string
  ): string => {
    // First check if supplier has a bulk email from BulkSupplierSelect
    if (bulkSupplierEmails?.has(supplier)) {
      return bulkSupplierEmails.get(supplier) || "";
    }
    // Then check if supplier has a custom email in this component (including empty string)
    if (customEmails.has(supplier)) {
      return customEmails.get(supplier) || "";
    }
    // Return default email only if no custom email has been set
    return defaultEmail;
  };

  // Preview email for a supplier - DISABLED for performance
  const handlePreviewEmail = async (_supplier: string) => {
    // Preview functionality disabled to improve performance
    console.log("Preview disabled for performance reasons");
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
          prev.map((s) =>
            s.supplier === supplierData.supplier ? { ...s, isSending: true } : s
          )
        );

        try {
          const recipientEmail = getEmailForSupplier(
            supplierData.supplier,
            supplierData.email
          );

          // Skip sending if no email address is provided
          if (!recipientEmail || recipientEmail.trim() === "") {
            console.warn(
              `Skipping email for ${supplierData.supplier} - no email address provided`
            );
            setEmailPreviewData((prev) =>
              prev.map((s) =>
                s.supplier === supplierData.supplier
                  ? {
                      ...s,
                      isSending: false,
                      sendResult: {
                        success: false,
                        error: "Ingen e-postadresse angitt",
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
              itemNo: order.itemNo || "",
              description: order.description || "",
              specification: order.specification || "",
              orderQty: order.orderQty,
              receivedQty: order.receivedQty,
              estReceiptDate: order.dueDate
                ? new Date(order.dueDate).toLocaleDateString("nb-NO")
                : "Ikke spesifisert",
              outstandingQty: order.outstandingQty,
              orderRowNumber: order.orderRowNumber,
            })),
            language: supplierData.language,
            subject:
              supplierData.language === "no"
                ? `Purring på manglende leveranser – ${supplierData.supplier}`
                : `Reminder: Outstanding Deliveries – ${supplierData.supplier}`,
          };

          const html = emailService.generatePreview(emailData);
          const result = await window.electron.sendEmailAutomatically({
            to: supplierData.supplier,
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
          console.error(
            `Error sending email to ${supplierData.supplier}:`,
            error
          );
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
        alert(`Alle ${successCount} e-poster ble sendt vellykket!`);
        onComplete();
      } else if (successCount > 0) {
        alert(`${successCount} e-poster sendt vellykket, ${failCount} feilet.`);
      } else {
        alert(
          `Alle ${failCount} e-poster feilet. Sjekk feilmeldingene og prøv igjen.`
        );
      }
    } catch (error) {
      console.error("Error in bulk email sending:", error);
      alert("Feil ved sending av e-poster. Prøv igjen.");
    } finally {
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalSuppliers = emailPreviewData.length;
    const totalOrders = emailPreviewData.reduce(
      (sum, s) => sum + s.orderCount,
      0
    );
    const sendingCount = emailPreviewData.filter((s) => s.isSending).length;
    const successCount = emailPreviewData.filter(
      (s) => s.sendResult?.success
    ).length;
    const failCount = emailPreviewData.filter(
      (s) => s.sendResult && !s.sendResult.success
    ).length;

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
          <span className="ml-2 text-neutral-secondary">
            Forbereder e-postdata...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with summary */}
      <div className="mb-6 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md">
        <h2 className="text-lg font-medium text-primary mb-2">
          E-post forhåndsvisning og sending
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-neutral">Leverandører:</span>{" "}
            {totals.totalSuppliers}
          </div>
          <div>
            <span className="font-medium text-neutral">Ordrelinjer:</span>{" "}
            {totals.totalOrders}
          </div>
          <div>
            <span className="font-medium text-primary">E-poster:</span>{" "}
            {totals.totalSuppliers}
          </div>
        </div>
        {hasMixedLanguages && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <strong>Info:</strong> Blandet språk oppdaget. E-poster vil sendes
            med riktig språk per leverandør.
          </div>
        )}
      </div>

      {/* Sending progress */}
      {isSending && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Sender e-poster... ({totals.sendingCount} av{" "}
              {totals.totalSuppliers})
            </span>
            <span className="text-sm text-blue-600">
              {Math.round(sendingProgress)}%
            </span>
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
            className="bg-neutral-white border border-neutral-light rounded-md p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="font-medium text-neutral">
                    {supplierData.supplier}
                  </h3>
                  <p className="text-sm text-neutral-secondary">
                    {supplierData.orderCount} ordrelinjer •{" "}
                    {supplierData.languageDisplay}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    supplierData.language === "no"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
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
                    <span className="text-sm">Sender...</span>
                  </div>
                )}

                {supplierData.sendResult && (
                  <div
                    className={`flex items-center ${
                      supplierData.sendResult.success
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {supplierData.sendResult.success ? "✓ Sendt" : "✗ Feilet"}
                    </span>
                  </div>
                )}

                {/* Preview button - DISABLED for performance */}
                <button
                  onClick={() => handlePreviewEmail(supplierData.supplier)}
                  className="btn btn-secondary btn-sm opacity-50 cursor-not-allowed"
                  disabled={true}
                  title="Forhåndsvisning deaktivert for bedre ytelse"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Forhåndsvis (deaktivert)
                </button>
              </div>
            </div>

            {/* Email address editing */}
            <div className="mt-3 pt-3 border-t border-neutral-light">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-neutral">
                  E-postadresse:
                </label>
                {(customEmails.has(supplierData.supplier) ||
                  bulkSupplierEmails?.has(supplierData.supplier)) && (
                  <button
                    onClick={() => {
                      const newCustomEmails = new Map(customEmails);
                      newCustomEmails.delete(supplierData.supplier);
                      setCustomEmails(newCustomEmails);
                    }}
                    className="text-xs text-neutral-secondary hover:text-primary"
                    disabled={
                      supplierData.isSending || supplierData.sendResult?.success
                    }
                  >
                    Tilbakestill til standard
                  </button>
                )}
              </div>
              <input
                type="email"
                value={getEmailForSupplier(
                  supplierData.supplier,
                  supplierData.email
                )}
                onChange={(e) =>
                  handleEmailChange(supplierData.supplier, e.target.value)
                }
                className={`form-control text-sm max-w-md ${
                  !getEmailForSupplier(
                    supplierData.supplier,
                    supplierData.email
                  ) ||
                  getEmailForSupplier(
                    supplierData.supplier,
                    supplierData.email
                  ).trim() === ""
                    ? "border-red-300 bg-red-50"
                    : ""
                }`}
                placeholder={supplierData.email}
                disabled={
                  supplierData.isSending || supplierData.sendResult?.success
                }
              />
              {(!getEmailForSupplier(
                supplierData.supplier,
                supplierData.email
              ) ||
                getEmailForSupplier(
                  supplierData.supplier,
                  supplierData.email
                ).trim() === "") && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Ingen e-postadresse angitt - e-post vil ikke bli sendt
                </p>
              )}
            </div>

            {/* Error message */}
            {supplierData.sendResult && !supplierData.sendResult.success && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <strong>Feil:</strong> {supplierData.sendResult.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
          disabled={isSending}
        >
          ← Tilbake til ordrevalg
        </button>

        <button
          onClick={handleSendAllEmails}
          className="btn btn-primary"
          disabled={isSending || totals.totalSuppliers === 0}
        >
          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
          {isSending
            ? "Sender..."
            : `Send alle ${totals.totalSuppliers} e-poster`}
        </button>
      </div>

      {/* Email Preview Modal - DISABLED for performance */}
    </div>
  );
};

export default BulkEmailPreview;
