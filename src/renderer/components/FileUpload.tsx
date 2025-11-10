import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { ExcelData, ValidationError, ExcelRow } from '../types/ExcelData';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { parse as parseDateFns } from 'date-fns';

interface FileUploadProps {
  onDataParsed: (data: ExcelData) => void;
  onValidationErrors: (errors: ValidationError[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed, onValidationErrors }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
  } | null>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setHelpMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listen for update events
  useEffect(() => {
    const unsubscribeProgress = window.electron.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
      // Stop checking spinner when download starts
      setIsCheckingUpdates(false);

      // Clear safety timeout since download has started
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    });

    const unsubscribeDownloaded = window.electron.onUpdateDownloaded(
      (info: { version: string }) => {
        setDownloadProgress(null);
        setIsCheckingUpdates(false); // Ensure spinner is stopped
        setUpdateStatus({
          type: 'success',
          message: `Oppdatering ${info.version} er lastet ned og klar for installasjon!`,
        });
        toast.success(`Oppdatering ${info.version} er klar!`);
      }
    );

    return () => {
      unsubscribeProgress();
      unsubscribeDownloaded();

      // Clear any pending safety timeout
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);

    try {
      const result = await window.electron.checkForUpdatesWithResult();

      if (result.success) {
        if (result.updateAvailable) {
          setUpdateStatus({
            type: 'success',
            message: `Ny versjon ${result.version} er tilgjengelig! Oppdateringen lastes ned automatisk.`,
          });
          toast.success(`Ny versjon ${result.version} er tilgjengelig!`);
          // Don't stop spinner yet - let progress tracking handle it
          // setIsCheckingUpdates(false) will be called when download starts or completes

          // Safety timeout: stop spinner after 10 seconds if no download starts
          safetyTimeoutRef.current = setTimeout(() => {
            setIsCheckingUpdates(false);
            safetyTimeoutRef.current = null;
          }, 10000);
        } else {
          setUpdateStatus({
            type: 'info',
            message: 'Du har den nyeste versjonen installert.',
          });
          toast('Du har den nyeste versjonen installert.', {
            icon: 'ℹ️',
            style: {
              background: '#dbeafe',
              color: '#1e40af',
            },
          });
          // Safe to stop spinner for "no update" case
          setIsCheckingUpdates(false);
        }
      } else {
        setUpdateStatus({
          type: 'error',
          message: result.error || 'Kunne ikke sjekke for oppdateringer.',
        });
        toast.error(result.error || 'Kunne ikke sjekke for oppdateringer.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus({
        type: 'error',
        message: 'En feil oppstod ved sjekk for oppdateringer.',
      });
      toast.error('En feil oppstod ved sjekk for oppdateringer.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleHelpOptionClick = (option: string) => {
    console.log(`Help option clicked: ${option}`);
    switch (option) {
      case 'docs':
        window.electron
          .openExternalLink('https://github.com/Isuldra/Suppliers/wiki')
          .then((result) => {
            if (!result.success) {
              console.error('Failed to open documentation:', result.error);
              toast.error(t('fileUpload.errors.couldNotOpenDocs'));
            }
          })
          .catch((err) => {
            console.error('Error opening documentation:', err);
            toast.error(t('fileUpload.errors.errorOpeningDocs'));
          });
        break;

      case 'check-updates':
        console.log('Sending check-for-updates request');
        handleCheckForUpdates();
        break;

      case 'contact-support':
        window.electron
          .openExternalLink(
            'mailto:andreas.elvethun@onemed.com?subject=Supplier%20Reminder%20Pro%20Support'
          )
          .then((result) => {
            if (!result.success) {
              console.error('Failed to open email client:', result.error);
              toast.error(t('fileUpload.errors.couldNotOpenEmail'));
            }
          })
          .catch((err) => {
            console.error('Error opening email client:', err);
            toast.error(t('fileUpload.errors.errorOpeningEmail'));
          });
        break;

      case 'about':
        console.log('Sending show-about-dialog request');
        window.electron.send('show-about-dialog', {});
        break;

      case 'show-logs':
        console.log('Opening logs view');
        window.electron.send('show-logs', {});
        break;

      default:
        break;
    }
    setHelpMenuOpen(false);
  };

  const validateExcelData = (workbook: XLSX.WorkBook): ValidationError[] => {
    const errors: ValidationError[] = [];
    console.log('Validating Excel workbook sheets:', Object.keys(workbook.Sheets));

    // Check for required BP sheet
    if (!workbook.Sheets['BP']) {
      console.log('Missing BP sheet');
      errors.push({
        type: 'missingSheet',
        message: 'Filen mangler arket "BP". Vennligst velg en korrekt Excel-fil.',
      });
    }

    if (errors.length > 0) return errors;

    // In development mode, be more lenient with validation
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode - skipping detailed validation');
      return [];
    }

    try {
      // Validate BP sheet
      const bpSheet = workbook.Sheets['BP'];
      console.log('BP sheet ref:', bpSheet['!ref']);

      const range = XLSX.utils.decode_range(bpSheet['!ref'] || 'A1');
      console.log('Decoded range:', range);

      // Check if we have at least 6 rows (data starts at row 6)
      if (range.e.r < 5) {
        errors.push({
          type: 'missingColumn',
          message: 'BP-arket har ikke nok rader. Data må starte fra rad 6.',
        });
        return errors;
      }

      // Check if we have the required columns (at least up to column P)
      if (range.e.c < 15) {
        // Column P is index 15 (0-based)
        errors.push({
          type: 'missingColumn',
          message: 'BP-arket mangler nødvendige kolonner. Må ha minst kolonner A-P.',
        });
      }
    } catch (err) {
      console.error('Error during sheet validation:', err);
      errors.push({
        type: 'missingColumn',
        message: `Feil ved validering av kolonner: ${String(err)}`,
      });
    }

    return errors;
  };

  /**
   * Drop header-like first row if it matches header keywords
   */
  // function skipHeaderRows(rows: ExcelRow[]): ExcelRow[] {
  //   // No longer needed since we read from fixed row positions
  //   return rows;
  // }

  const parseExcelData = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 100);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        toast.error(`Feil ved lesing av fil: ${error.toString()}`);
        reject(new Error(`FileReader error: ${error.toString()}`));
      };

      reader.onload = (e) => {
        try {
          setProcessingStage('Prosesserer Excel-fil...');
          console.log('File loaded, parsing Excel data...');
          console.log('File info:', file.name, file.type, file.size + ' bytes');

          if (!e.target?.result) {
            throw new Error('Fil-data mangler');
          }

          // Try-catch for each step to pinpoint errors
          let data;
          try {
            data = new Uint8Array(e.target.result as ArrayBuffer);
            console.log('Array buffer created successfully, size:', data.length);
          } catch (_error: unknown) {
            console.error('Buffer error:', _error);
            toast.error('Feil ved konvertering av fil-data');
            reject(
              new Error(
                `Buffer error: ${_error instanceof Error ? _error.message : String(_error)}`
              )
            );
            return;
          }

          let workbook;
          try {
            console.log('Attempting to read Excel data with XLSX...');
            workbook = XLSX.read(data, { type: 'array' });
            console.log('Workbook loaded successfully. Sheets:', workbook.SheetNames.join(', '));
          } catch (_error: unknown) {
            console.error('XLSX parsing error:', _error);
            // Spesifikk feilmelding og feilsøkingshjelp
            const errorDetail = _error instanceof Error ? _error.message : String(_error);
            const errorInfo = `
              Detaljer: ${errorDetail}
              Filtype: ${file.type}
              Filstørrelse: ${file.size} bytes
              Platform: ${navigator.platform}
              Browser: ${navigator.userAgent}
            `;
            console.error('Excel parse error details:', errorInfo);

            // Send feildetaljer til hovedprosessen for logging
            window.electron.send('log-error', {
              type: 'excel-parse-error',
              details: errorInfo,
              fileName: file.name,
            });

            // Vise en mer hjelpsom feilmelding basert på plattform
            if (navigator.platform.indexOf('Win') > -1) {
              toast.error(
                <div>
                  <p>Feil ved parsing av Excel-fil i Windows.</p>
                  <p>
                    Kontroller at filen er i riktig XLSX-format og ikke er låst av andre programmer.
                  </p>
                  <p className="text-xs mt-1">
                    Tips: Lukk Excel hvis filen er åpen der, og prøv igjen.
                  </p>
                  <button
                    className="underline text-sm text-blue-600 mt-2"
                    onClick={() => window.electron.send('show-logs', {})}
                  >
                    {t('fileUpload.showLogs')}
                  </button>
                </div>
              );
            } else {
              toast.error(
                <div>
                  <p>Feil ved parsing av Excel-fil.</p>
                  <p>Kontroller at filen er i riktig XLSX-format og ikke er skadet.</p>
                  <button
                    className="underline text-sm text-blue-600 mt-2"
                    onClick={() => window.electron.send('show-logs', {})}
                  >
                    {t('fileUpload.showLogs')}
                  </button>
                </div>
              );
            }
            reject(new Error(`XLSX error: ${errorDetail}`));
            return;
          }

          const errors = validateExcelData(workbook);
          if (errors.length > 0) {
            console.log('Validation errors:', errors);
            onValidationErrors(errors);
            reject(new Error('Validation error'));
            return;
          }

          setProcessingStage('Konverterer data...');
          console.log('Converting BP sheet to JSON...');

          // Parse BP sheet with new structure
          const parseBPSheet = (): ExcelRow[] => {
            try {
              const sheet = workbook.Sheets['BP'];
              if (!sheet) {
                console.warn('BP sheet not found during parsing');
                return [];
              }

              // Data starts from row 6 (index 5), so we skip the first 5 rows
              const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
              const startRow = 5; // Row 6 in Excel (0-based index)

              console.log(`Parsing BP sheet from row ${startRow + 1} to ${range.e.r + 1}`);

              // Read data starting from row 6
              const rawData = XLSX.utils.sheet_to_json(sheet, {
                header: 1, // Use array format to access by column index
                range: XLSX.utils.encode_range({
                  s: { r: startRow, c: 0 }, // Start from row 6, column A
                  e: { r: range.e.r, c: range.e.c }, // End at last row and column
                }),
                defval: '', // Default value for empty cells
                raw: false, // Let XLSX try type conversion
              }) as unknown[][];

              console.log(`BP raw data (first 3 rows):`, rawData.slice(0, 3));

              // Map each row to ExcelRow format using column indices
              const processedData: ExcelRow[] = rawData.map((row: unknown[], index) => {
                // Column mapping based on user specification:
                // A (0) = ignore, B (1) = ignore
                const poNumber = String(row[2] || '').trim(); // Column C = PO
                const internalSupplierNumber = String(row[3] || '').trim(); // Column D = Internal supplier number
                const warehouse = String(row[4] || '').trim(); // Column E = Warehouse
                // F (5) = ignore, G (6) = ignore
                const oneMedArticleNo = String(row[7] || '').trim(); // Column H = OneMed article number
                const supplierArticleNo = String(row[8] || '').trim(); // Column I = Supplier article number
                const etaDate1 = row[9]; // Column J = Expected ETA 1
                const etaDate2 = row[10]; // Column K = Expected ETA 2
                const erpComment = String(row[11] || '').trim(); // Column L = ERP comment
                const orderedQty = Number(row[12] || 0); // Column M = Ordered quantity
                const deliveredQty = Number(row[13] || 0); // Column N = Delivered quantity
                const outstandingQty = Number(row[14] || 0); // Column O = Outstanding quantity
                const supplierName = String(row[15] || '').trim(); // Column P = Supplier name
                const orderRowNumber = String(row[16] || '').trim(); // Column Q = Order Row Number (bestradnr)

                // Parse ETA dates (prefer J over K, both should be past dates)
                let dueDate: Date | undefined = undefined;

                // Try to parse ETA date from column J first
                if (etaDate1) {
                  dueDate = parseExcelDate(etaDate1);
                }

                // If no valid date from J, try column K
                if (!dueDate && etaDate2) {
                  dueDate = parseExcelDate(etaDate2);
                }

                // Create a unique key using PO number and OneMed article number
                const keyCandidate = `${poNumber}-${oneMedArticleNo}`;
                const key =
                  keyCandidate.trim() !== '-' && keyCandidate.trim() !== ''
                    ? keyCandidate
                    : `bp-row-${index}`;

                const processedRow: ExcelRow = {
                  key: key,
                  dueDate: dueDate,
                  supplier: supplierName,
                  orderQty: isNaN(orderedQty) ? 0 : orderedQty,
                  receivedQty: isNaN(deliveredQty) ? 0 : deliveredQty,
                  outstandingQty: isNaN(outstandingQty) ? 0 : outstandingQty,
                  poNumber: poNumber,
                  itemNo: oneMedArticleNo,
                  description: supplierArticleNo, // Using supplier article number as description
                  specification: erpComment, // Using ERP comment as comment
                  orderRowNumber: orderRowNumber, // Order row number from column Q
                  // Additional fields for the new structure
                  internalSupplierNumber: internalSupplierNumber,
                  warehouse: warehouse,
                  supplierArticleNo: supplierArticleNo,
                };

                return processedRow;
              });

              // Filter out rows with no meaningful data (empty PO and supplier)
              const filteredData = processedData.filter(
                (row) =>
                  row.poNumber &&
                  row.supplier &&
                  row.poNumber.trim() !== '' &&
                  row.supplier.trim() !== ''
              );

              console.log(`Processed ${filteredData.length} valid rows from BP sheet`);
              return filteredData;
            } catch (err) {
              console.error('Error parsing BP sheet:', err);
              toast.error('Feil ved lesing av BP-ark');
              return [];
            }
          };

          // Helper function to parse Excel dates
          const parseExcelDate = (dateValue: unknown): Date | undefined => {
            if (!dateValue) return undefined;

            let parsedDate: Date | null = null;

            if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
              parsedDate = dateValue;
            } else if (typeof dateValue === 'string') {
              try {
                const dateStr = dateValue.trim();
                // Try different date formats
                parsedDate = parseDateFns(dateStr, 'M/d/yyyy', new Date());
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = parseDateFns(dateStr, 'd/M/yyyy', new Date());
                }
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = parseDateFns(dateStr, 'M/d/yy', new Date());
                }
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = parseDateFns(dateStr, 'd/M/yy', new Date());
                }
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = new Date(dateStr);
                }
              } catch {
                /* Ignore parsing errors */
              }
            } else if (typeof dateValue === 'number') {
              // Handle Excel date serial numbers
              try {
                const d = XLSX.SSF.parse_date_code(dateValue);
                if (d && d.y != null) {
                  parsedDate = new Date(d.y, d.m - 1, d.d);
                }
              } catch {
                /* ignore */
              }
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              parsedDate.setUTCHours(0, 0, 0, 0); // Normalize
              return parsedDate;
            }

            return undefined;
          };

          // Parse the BP sheet
          const bpData = parseBPSheet();

          console.log('Parsed data counts:', {
            bpCount: bpData.length,
          });

          // Log sample data for debugging
          console.table(
            bpData.slice(0, 5).map((r) => ({
              key: r.key,
              supplier: r.supplier,
              poNumber: r.poNumber,
              dueDate: r.dueDate?.toISOString().split('T')[0] ?? 'NULL',
              orderQty: r.orderQty,
              outstandingQty: r.outstandingQty,
            }))
          );

          // Return the processed data
          resolve({
            hovedliste: [], // No longer using hovedliste
            bp: bpData, // All data comes from BP sheet now
            sjekkliste: [], // No longer using sjekkliste
            supplier: '', // Will be determined from the data
            weekday: '', // Will be determined from the data
          });
        } catch (error) {
          console.error('Error processing sheets:', error);
          toast.error('Feil ved behandling av Excel-ark. Vennligst prøv igjen.');
          reject(error);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        toast.error(t('fileUpload.errors.noFileSelected'));
        return;
      }

      const file = acceptedFiles[0];
      console.log('File dropped:', file.name);

      setIsLoading(true);
      setIsValidating(false);
      setProgress(0);
      setProcessingStage(t('fileUpload.processing.readingFile'));

      try {
        console.log('Starting Excel parsing process...');
        const parsedData = await parseExcelData(file);
        console.log('Excel data parsed successfully', {
          bpRows: parsedData.bp.length,
        });

        setProcessingStage(t('fileUpload.processing.validatingData'));
        setIsValidating(true);

        try {
          console.log('Starting data validation...');
          // Simulate/perform ODBC validation
          const validationResult = await window.electron.validateData(parsedData);

          // Add type assertion for validationResult
          const typedResult = validationResult as {
            success: boolean;
            data?: {
              bpCount: number;
            };
            error?: string;
          };

          console.log('Validation result:', typedResult);

          if (!typedResult.success) {
            console.error('Validation failed:', typedResult.error);
            toast.error(`${t('fileUpload.errors.validationError')}: ${typedResult.error}`);
            setIsLoading(false);
            setIsValidating(false);
            return;
          }

          // Update data with validation results if they exist
          if (typedResult.data) {
            // Create a new object with the validation data
            parsedData.validation = {
              bpCount: typedResult.data.bpCount,
            };
          }

          // --- Read file content for IPC ---
          let fileBuffer: ArrayBuffer;
          try {
            fileBuffer = await file.arrayBuffer();
            console.log('File read into ArrayBuffer for IPC.');
          } catch {
            console.error('Error reading file into buffer:');
            toast.error('Kunne ikke lese filinnhold.');
            setIsLoading(false);
            setIsValidating(false);
            return;
          }
          // --- End Read file content ---

          // Add this after successful ODBC validation
          try {
            console.log('Triggering database import via IPC with file buffer...');
            // Call saveOrdersToDatabase with the fileBuffer
            const dbResult = await window.electron.saveOrdersToDatabase({
              fileBuffer: fileBuffer, // Pass the buffer directly
            });
            console.log('Database import/save result:', dbResult);

            if (!dbResult.success) {
              console.warn('Database save warning:', dbResult.error);
              // Continue even if database save fails - it's not critical for the app to function
              toast.error(
                dbResult.error || t('fileUpload.errors.validationSuccessButDatabaseFailed')
              );
            } else {
              console.log('Database import/save successful.');
              // We might not need a specific count here anymore if the importer handles it
              toast.success(t('fileUpload.success.importCompleted'));

              // Debug: Log all available suppliers
              try {
                const suppliersResult = await window.electron.getAllSupplierNames();
                if (suppliersResult.success && suppliersResult.data) {
                  console.log('Available suppliers in database:', suppliersResult.data);
                  console.log('Total suppliers found:', suppliersResult.data.length);

                  // Check if Abena is in the list
                  const abenaSuppliers = suppliersResult.data.filter((s) =>
                    s.toLowerCase().includes('abena')
                  );
                  console.log('Abena-related suppliers:', abenaSuppliers);
                }
              } catch (debugError) {
                console.error('Error getting supplier names for debug:', debugError);
              }
            }
          } catch {
            console.error('Database error:');
            // Continue even if database save fails
            toast.error(t('fileUpload.errors.dataValidatedButNotSaved'));
          }

          console.log('Processing complete, calling onDataParsed');
          // Always call onDataParsed when data is successfully parsed
          onDataParsed(parsedData);
        } catch (error) {
          console.error('Validation error:', error);
          toast.error('Feil ved validering mot database');
        } finally {
          setIsLoading(false);
          setIsValidating(false);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        if (error instanceof Error) {
          if (error.message !== 'Validation error') {
            // Don't show error for validation errors that are already handled
            toast.error(`Feil ved behandling av fil: ${error.message}`);
          }
        } else {
          toast.error('Ukjent feil ved behandling av fil');
        }
        setIsLoading(false);
        setIsValidating(false);
      }
    },
    [onDataParsed, onValidationErrors]
  );

  // Add skeleton loading component
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4" role="status" aria-label="Laster inn">
      <div className="flex items-center justify-center">
        <div className="w-full h-32 bg-gray-200 rounded-md"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="sr-only">Laster inn...</div>
    </div>
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: isLoading || isValidating,
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="relative" ref={helpMenuRef}>
          <button
            onClick={() => setHelpMenuOpen(!helpMenuOpen)}
            className="flex items-center text-neutral-dark hover:text-primary transition-colors"
            aria-label={t('fileUpload.help')}
          >
            <QuestionMarkCircleIcon className="h-6 w-6 mr-1" />
            <span>{t('fileUpload.help')}</span>
          </button>

          {helpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <h3 className="font-medium text-neutral">{t('fileUpload.helpAndResources')}</h3>
                <button
                  onClick={() => setHelpMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => handleHelpOptionClick('docs')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t('fileUpload.documentation')}
                </button>
                <button
                  onClick={() => handleHelpOptionClick('check-updates')}
                  disabled={isCheckingUpdates}
                  className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                    isCheckingUpdates ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isCheckingUpdates ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sjekker for oppdateringer...
                    </span>
                  ) : (
                    t('fileUpload.checkUpdates')
                  )}
                </button>
                <button
                  onClick={() => handleHelpOptionClick('contact-support')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t('fileUpload.contactSupport')}
                </button>
                <button
                  onClick={() => handleHelpOptionClick('about')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t('fileUpload.about')}
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleHelpOptionClick('show-logs')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t('fileUpload.showLogs')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Update Status Display */}
        {updateStatus && (
          <div
            className={`mt-4 p-3 rounded-md ${
              updateStatus.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : updateStatus.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center">
              {updateStatus.type === 'success' && (
                <svg
                  className="h-5 w-5 text-green-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {updateStatus.type === 'error' && (
                <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {updateStatus.type === 'info' && (
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span
                className={`text-sm ${
                  updateStatus.type === 'success'
                    ? 'text-green-800'
                    : updateStatus.type === 'error'
                      ? 'text-red-800'
                      : 'text-blue-800'
                }`}
              >
                {updateStatus.message}
              </span>
            </div>
          </div>
        )}

        {/* Download Progress Display */}
        {downloadProgress && (
          <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-800 font-medium">Laster ned oppdatering...</span>
              <span className="text-sm text-blue-600">{downloadProgress.percent}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-blue-600">
              {downloadProgress.bytesPerSecond > 0 && (
                <>
                  {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
                  {downloadProgress.total > 0 && (
                    <> • {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB total</>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoading || isValidating ? (
        <div className="mb-6">
          <div className="mb-4 p-4 bg-neutral-light rounded-md border border-primary">
            <div className="flex items-center space-x-2">
              <svg
                className="animate-spin h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="font-medium">
                {isValidating ? t('fileUpload.processing.validatingData') : processingStage}
              </span>
            </div>

            {progress > 0 && !isValidating && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
                <p className="text-xs text-right mt-1">{Math.round(progress)}%</p>
              </div>
            )}
          </div>

          <LoadingSkeleton />
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-primary bg-primary-light bg-opacity-10'
              : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} data-testid="file-input" aria-label="Last opp Excel-fil" />
          <div className="space-y-3">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-center">
              <p className="text-lg text-neutral">
                {isDragActive ? t('fileUpload.dropFileHere') : t('fileUpload.dropFile')}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('fileUpload.fileRequirement')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 border border-neutral-light rounded-sm bg-primary-light bg-opacity-10">
        <h4 className="font-medium text-primary mb-2">{t('fileUpload.whatToDo')}</h4>
        <p className="text-sm text-neutral">{t('fileUpload.instruction1')}</p>
        <p className="text-sm text-neutral mt-1">{t('fileUpload.instruction2')}</p>
        <p className="text-sm text-neutral mt-1">{t('fileUpload.instruction3')}</p>
        <p className="text-sm text-neutral mt-1">{t('fileUpload.instruction4')}</p>
      </div>
    </div>
  );
};

export default FileUpload;
