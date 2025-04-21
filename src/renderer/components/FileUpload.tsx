declare global {
  interface Window {
    electron: {
      recordEmailSent: (
        supplier: string,
        recipient: string,
        subject: string,
        orderCount: number
      ) => Promise<{ success: boolean; message?: string; error?: string }>;
      validateData: (data: ExcelData) => Promise<{
        success: boolean;
        data?: {
          hovedlisteCount: number;
          bpCount: number;
        };
        error?: string;
      }>;
      sendEmail: (payload: {
        to: string;
        subject: string;
        html: string;
      }) => Promise<{ success: boolean; error?: string }>;
      getSuppliers: () => Promise<{
        success: boolean;
        data?: string[];
        error?: string;
      }>;
      parseExcel: (data: ExcelData) => void;
      onExcelValidation: (callback: (data: ExcelData) => void) => () => void;
      handleError: (error: Error) => void;
      send: (channel: string, data: unknown) => void;
      receive: (channel: string, func: (...args: unknown[]) => void) => void;
      saveOrdersToDatabase: (payload: {
        fileBuffer: ArrayBuffer;
      }) => Promise<{ success: boolean; message?: string; error?: string }>;
      openExternalLink: (
        url: string
      ) => Promise<{ success: boolean; error?: string }>;
      getOutstandingOrders: (
        supplier: string,
        beforeCurrentWeek?: boolean
      ) => Promise<{ success: boolean; data?: ExcelRow[]; error?: string }>;
      showLogs: () => Promise<{ success: boolean; error?: string }>;
      readLogTail: (
        lineCount?: number
      ) => Promise<{ success: boolean; logs?: string; error?: string }>;
      sendLogsToSupport: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { ExcelData, ValidationError, ExcelRow } from "../types/ExcelData";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { parse as parseDateFns } from "date-fns";

interface FileUploadProps {
  onDataParsed: (data: ExcelData) => void;
  onValidationErrors: (errors: ValidationError[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onDataParsed,
  onValidationErrors,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        helpMenuRef.current &&
        !helpMenuRef.current.contains(event.target as Node)
      ) {
        setHelpMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleHelpOptionClick = (option: string) => {
    console.log(`Help option clicked: ${option}`);
    switch (option) {
      case "docs":
        window.electron
          .openExternalLink("https://github.com/Isuldra/Suppliers/wiki")
          .then((result) => {
            if (!result.success) {
              console.error("Failed to open documentation:", result.error);
              toast.error("Kunne ikke åpne dokumentasjonen");
            }
          })
          .catch((err) => {
            console.error("Error opening documentation:", err);
            toast.error("Feil ved åpning av dokumentasjon");
          });
        break;

      case "check-updates":
        console.log("Sending check-for-updates request");
        window.electron.send("check-for-updates", {});
        break;

      case "contact-support":
        window.electron
          .openExternalLink(
            "mailto:andreas.elvethun@onemed.com?subject=Supplier%20Reminder%20Pro%20Support"
          )
          .then((result) => {
            if (!result.success) {
              console.error("Failed to open email client:", result.error);
              toast.error("Kunne ikke åpne e-postklient");
            }
          })
          .catch((err) => {
            console.error("Error opening email client:", err);
            toast.error("Feil ved åpning av e-postklient");
          });
        break;

      case "about":
        console.log("Sending show-about-dialog request");
        window.electron.send("show-about-dialog", {});
        break;

      case "show-logs":
        console.log("Opening logs view");
        window.electron.send("show-logs", {});
        break;

      default:
        break;
    }
    setHelpMenuOpen(false);
  };

  const validateExcelData = (workbook: XLSX.WorkBook): ValidationError[] => {
    const errors: ValidationError[] = [];
    console.log(
      "Validating Excel workbook sheets:",
      Object.keys(workbook.Sheets)
    );

    // Check for required sheets
    if (!workbook.Sheets["Hovedliste"]) {
      console.log("Missing Hovedliste sheet");
      errors.push({
        type: "missingSheet",
        message:
          'Filen mangler arket "Hovedliste". Vennligst velg en korrekt Excel-fil.',
      });
    }
    if (!workbook.Sheets["BP"]) {
      console.log("Missing BP sheet");
      errors.push({
        type: "missingSheet",
        message:
          'Filen mangler arket "BP". Vennligst velg en korrekt Excel-fil.',
      });
    }

    if (errors.length > 0) return errors;

    // In development mode, be more lenient with validation
    if (process.env.NODE_ENV === "development") {
      console.log("Running in development mode - skipping detailed validation");
      return [];
    }

    try {
      // Validate Hovedliste sheet
      const hovedliste = workbook.Sheets["Hovedliste"];
      console.log("Hovedliste sheet ref:", hovedliste["!ref"]);

      const range = XLSX.utils.decode_range(hovedliste["!ref"] || "A1");
      console.log("Decoded range:", range);

      // Try to find headers, looking at different rows since headers
      // might not be in the first row
      let headers: string[] = [];
      let foundHeaders = false;

      // Try first 3 rows to find headers
      for (let row = 0; row <= 2; row++) {
        try {
          const rowData = XLSX.utils.sheet_to_json(hovedliste, {
            header: 1,
            range: XLSX.utils.encode_range({
              s: { r: row, c: 0 },
              e: { r: row, c: range.e.c },
            }),
          })[0] as string[];

          console.log(`Headers from row ${row + 1}:`, rowData);

          if (
            rowData &&
            Array.isArray(rowData) &&
            rowData.length > 0 &&
            rowData.some((h) => h && typeof h === "string" && h.length > 0)
          ) {
            headers = rowData;
            foundHeaders = true;
            console.log(`Found headers in row ${row + 1}:`, headers);
            break;
          }
        } catch (err) {
          console.log(`Error reading headers from row ${row + 1}:`, err);
        }
      }

      if (!foundHeaders) {
        console.warn("No headers found in first 3 rows");
        // In development, we'll be lenient and continue anyway
        if (process.env.NODE_ENV !== "development") {
          errors.push({
            type: "missingColumn",
            message: "Finner ikke kolonner i de første rader av arket",
          });
          return errors;
        }
      }

      // Check for required columns with more flexible matching
      // Look for columns that might contain these values or similar
      const requiredFields = [
        {
          name: "key",
          alternatives: ["Key", "ID", "Nøkkel", "A", "ARS", "Nummer", "Nr"],
        },
        {
          name: "supplier",
          alternatives: [
            "Supplier",
            "Leverandør",
            "F",
            "Vendor",
            "Lev",
            "Navn",
          ],
        },
        {
          name: "poNumber",
          alternatives: [
            "PO",
            "Purchase Order",
            "Order",
            "OrderID",
            "I",
            "Ordre",
            "Ordrenr",
          ],
        },
      ];

      const missingColumns = requiredFields.filter((field) => {
        // Check if any of the alternatives exist in headers
        const found = field.alternatives.some((alt) =>
          headers.some(
            (header) =>
              header &&
              typeof header === "string" &&
              header.toLowerCase().includes(alt.toLowerCase())
          )
        );
        return !found;
      });

      missingColumns.forEach((col) => {
        console.log(`Missing required column: ${col.name}`);
        errors.push({
          type: "missingColumn",
          message: `Mangler kolonne ${col.name} i Hovedliste.`,
          column: col.name,
        });
      });
    } catch (err) {
      console.error("Error during sheet validation:", err);
      errors.push({
        type: "missingColumn",
        message: `Feil ved validering av kolonner: ${String(err)}`,
      });
    }

    return errors;
  };

  const parseExcelData = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 100);
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast.error(`Feil ved lesing av fil: ${error.toString()}`);
        reject(new Error(`FileReader error: ${error.toString()}`));
      };

      reader.onload = (e) => {
        try {
          setProcessingStage("Prosesserer Excel-fil...");
          console.log("File loaded, parsing Excel data...");
          console.log("File info:", file.name, file.type, file.size + " bytes");

          if (!e.target?.result) {
            throw new Error("Fil-data mangler");
          }

          // Try-catch for each step to pinpoint errors
          let data;
          try {
            data = new Uint8Array(e.target.result as ArrayBuffer);
            console.log(
              "Array buffer created successfully, size:",
              data.length
            );
          } catch (_error: unknown) {
            console.error("Buffer error:", _error);
            toast.error("Feil ved konvertering av fil-data");
            reject(
              new Error(
                `Buffer error: ${
                  _error instanceof Error ? _error.message : String(_error)
                }`
              )
            );
            return;
          }

          let workbook;
          try {
            console.log("Attempting to read Excel data with XLSX...");
            workbook = XLSX.read(data, { type: "array" });
            console.log(
              "Workbook loaded successfully. Sheets:",
              workbook.SheetNames.join(", ")
            );
          } catch (_error: unknown) {
            console.error("XLSX parsing error:", _error);

            // Spesifikk feilmelding og feilsøkingshjelp
            const errorDetail =
              _error instanceof Error ? _error.message : String(_error);
            const errorInfo = `
              Detaljer: ${errorDetail}
              Filtype: ${file.type}
              Filstørrelse: ${file.size} bytes
              Platform: ${navigator.platform}
              Browser: ${navigator.userAgent}
            `;
            console.error("Excel parse error details:", errorInfo);

            // Send feildetaljer til hovedprosessen for logging
            window.electron.send("log-error", {
              type: "excel-parse-error",
              details: errorInfo,
              fileName: file.name,
            });

            // Vise en mer hjelpsom feilmelding basert på plattform
            if (navigator.platform.indexOf("Win") > -1) {
              toast.error(
                <div>
                  <p>Feil ved parsing av Excel-fil i Windows.</p>
                  <p>
                    Kontroller at filen er i riktig XLSX-format og ikke er låst
                    av andre programmer.
                  </p>
                  <p className="text-xs mt-1">
                    Tips: Lukk Excel hvis filen er åpen der, og prøv igjen.
                  </p>
                  <button
                    className="underline text-sm text-blue-600 mt-2"
                    onClick={() => window.electron.send("show-logs", {})}
                  >
                    Vis logger
                  </button>
                </div>
              );
            } else {
              toast.error(
                <div>
                  <p>Feil ved parsing av Excel-fil.</p>
                  <p>
                    Kontroller at filen er i riktig XLSX-format og ikke er
                    skadet.
                  </p>
                  <button
                    className="underline text-sm text-blue-600 mt-2"
                    onClick={() => window.electron.send("show-logs", {})}
                  >
                    Vis logger
                  </button>
                </div>
              );
            }
            reject(new Error(`XLSX error: ${errorDetail}`));
            return;
          }

          const errors = validateExcelData(workbook);
          if (errors.length > 0) {
            console.log("Validation errors:", errors);
            onValidationErrors(errors);
            reject(new Error("Validation error"));
            return;
          }

          setProcessingStage("Konverterer data...");
          console.log("Converting sheets to JSON...");
          // Use more resilient parsing with defaults for missing data
          const parseSheet = (sheetName: string): ExcelRow[] => {
            try {
              const sheet = workbook.Sheets[sheetName];
              if (!sheet) {
                console.warn(`Sheet ${sheetName} not found during parsing`); // Changed error to warn
                return [];
              }

              // Find the header row dynamically for robustness
              let headerRowIndex = 0;
              let headers: string[] = [];
              for (let r = 0; r < 10; r++) {
                // Scan first 10 rows for headers
                const row = XLSX.utils.sheet_to_json(sheet, {
                  header: 1,
                  range: r,
                })[0] as string[];
                if (
                  row &&
                  row.length > 0 &&
                  row.some(
                    (h) =>
                      h &&
                      typeof h === "string" &&
                      (h.toLowerCase().includes("nøkkel") ||
                        h.toLowerCase().includes("ref") ||
                        h.toLowerCase().includes("est receipt date"))
                  )
                ) {
                  headers = row.map((h) => (h ? String(h).trim() : "")); // Trim headers
                  headerRowIndex = r;
                  console.log(
                    `Found header row ${r + 1} for sheet ${sheetName}:`,
                    headers
                  );
                  break;
                }
              }

              if (headers.length === 0) {
                console.error(
                  `Could not find header row in sheet ${sheetName}. Falling back to default parsing.`
                );
                // Fallback or throw error if needed
              }

              const rawData = XLSX.utils.sheet_to_json(sheet, {
                header: headers.length > 0 ? headers : "A", // Use found headers or default 'A'
                range: headerRowIndex > 0 ? headerRowIndex + 1 : 0, // Start data from row after header
                defval: "",
                raw: false, // Let XLSX try type conversion
              }) as Record<string, unknown>[];

              console.log(
                `${sheetName} raw data (first 2 rows):`,
                rawData.slice(0, 2)
              );

              // --- Mapping logic removed from here, will be done after all sheets are read ---
              return rawData as ExcelRow[]; // Return raw data for now
            } catch (err) {
              console.error(`Error parsing sheet ${sheetName}:`, err);
              toast.error(`Feil ved lesing av ark: ${sheetName}`);
              return [];
            }
          };

          // Parse required sheets into raw JSON arrays
          const hovedRaw = parseSheet("Hovedliste");
          const bpRaw = parseSheet("BP"); // Keep parsing BP if needed elsewhere
          const restRaw = parseSheet("Restliste til Leverandør");

          // --- Build Date Map from Restliste ---
          const estMap = new Map<string, Date>();
          // Define expected header names (case-insensitive matching below)
          const restNokkelHeaderKey = "ref"; // Lowercase for comparison
          const restDateHeaderKey = "est receipt date"; // Lowercase
          console.log(
            `Building Restliste map using assumed keys: Key='${restNokkelHeaderKey}', Date='${restDateHeaderKey}'`
          );

          restRaw.forEach((r: Record<string, unknown>) => {
            // Find the actual key based on expected header, case-insensitive
            const keyProp = Object.keys(r).find(
              (k) => k.trim().toLowerCase() === restNokkelHeaderKey
            );
            const dateProp = Object.keys(r).find(
              (k) => k.trim().toLowerCase() === restDateHeaderKey
            );

            if (!keyProp || !dateProp) {
              return;
            }

            const key = keyProp ? String(r[keyProp] || "").trim() : ""; // Get key value
            const rawDate = dateProp ? r[dateProp] : undefined; // Get date value
            if (!key || !rawDate) return;

            let parsedDate: Date | null = null;
            if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
              parsedDate = rawDate;
            } else if (typeof rawDate === "string") {
              try {
                parsedDate = parseDateFns(
                  rawDate.trim(),
                  "M/d/yyyy",
                  new Date()
                );
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = new Date(rawDate.trim());
                }
              } catch (_e) {
                /* Ignore parsing errors */
              }
            } else if (typeof rawDate === "number") {
              // Handle Excel date serial numbers (requires xlsx library function)
              try {
                const d = XLSX.SSF.parse_date_code(rawDate);
                if (d && d.y != null) {
                  parsedDate = new Date(d.y, d.m - 1, d.d);
                }
              } catch (_e) {
                /* ignore */
              }
            }

            if (key && parsedDate && !isNaN(parsedDate.getTime())) {
              parsedDate.setUTCHours(0, 0, 0, 0); // Normalize
              estMap.set(key, parsedDate); // Use trimmed key
            }
          });
          console.log(`Built Restliste date map with ${estMap.size} entries.`);

          // --- Process Hovedliste, Merging Dates ---
          // Define expected header names for Hovedliste (lowercase for comparison)
          const hovedNokkelHeaderKey = "nøkkel";
          const hovedDateHeaderKey = "dato varen skulle kommet inn";
          const hovedSupplierHeaderKey = "leverandør";
          const hovedPoHeaderKey = "pono."; // Matching the log output
          const hovedItemNoHeaderKey = "item no."; // Matching the log output
          const hovedDescHeaderKey = "item description";
          const hovedSpecHeaderKey = "specification";
          const hovedOrderQtyHeaderKey = "ordqtypo";

          console.log(`Processing Hovedliste using assumed keys...`);

          const processedHovedliste: ExcelRow[] = hovedRaw.map(
            (r: Record<string, unknown>, index) => {
              // Find actual keys based on expected headers, case-insensitive
              const keyProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedNokkelHeaderKey
              );
              const fallbackDateProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedDateHeaderKey
              );
              const supplierProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedSupplierHeaderKey
              );
              const poProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedPoHeaderKey
              );
              const itemNoProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedItemNoHeaderKey
              );
              const descProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedDescHeaderKey
              );
              const specProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedSpecHeaderKey
              );
              const orderQtyProp = Object.keys(r).find(
                (k) => k.trim().toLowerCase() === hovedOrderQtyHeaderKey
              );

              // Get values using found property names, provide defaults
              const key = keyProp ? String(r[keyProp] || "").trim() : "";
              const fallbackRawDate = fallbackDateProp
                ? r[fallbackDateProp]
                : undefined;
              const supplier = supplierProp
                ? String(r[supplierProp] || "")
                : "";
              const poNumber = poProp ? String(r[poProp] || "") : "";
              const itemNo = itemNoProp ? String(r[itemNoProp] || "") : "";
              const description = descProp ? String(r[descProp] || "") : "";
              const specification = specProp ? String(r[specProp] || "") : "";
              const orderQtyValue = orderQtyProp
                ? Number(r[orderQtyProp] || 0)
                : 0;

              let finalDate: Date | undefined = undefined;
              const dateFromMap = key ? estMap.get(key) : undefined; // Use trimmed key for lookup

              if (dateFromMap) {
                finalDate = dateFromMap;
              } else if (fallbackRawDate) {
                let parsedFallback: Date | null = null;
                if (
                  fallbackRawDate instanceof Date &&
                  !isNaN(fallbackRawDate.getTime())
                ) {
                  parsedFallback = fallbackRawDate;
                } else if (typeof fallbackRawDate === "string") {
                  try {
                    parsedFallback = parseDateFns(
                      fallbackRawDate.trim(),
                      "M/d/yyyy",
                      new Date()
                    );
                    if (isNaN(parsedFallback.getTime())) {
                      parsedFallback = new Date(fallbackRawDate.trim());
                    }
                  } catch (_e) {
                    /* Ignore parsing errors */
                  }
                } else if (typeof fallbackRawDate === "number") {
                  // Handle Excel date serial numbers (requires xlsx library function)
                  try {
                    const d = XLSX.SSF.parse_date_code(fallbackRawDate);
                    if (d && d.y != null) {
                      parsedFallback = new Date(d.y, d.m - 1, d.d);
                    }
                  } catch (_e) {
                    /* ignore */
                  }
                }
                if (parsedFallback && !isNaN(parsedFallback.getTime())) {
                  parsedFallback.setUTCHours(0, 0, 0, 0); // Normalize
                  finalDate = parsedFallback;
                }
              }

              const processedRow: ExcelRow = {
                key: key || `row-${index}`, // Ensure key is always a string
                dueDate: finalDate, // Assign the final merged and parsed date
                supplier: supplier,
                orderQty: orderQtyValue,
                receivedQty: 0, // Assuming 0
                poNumber: poNumber,
                itemNo: itemNo,
                description: description,
                specification: specification,
                outstandingQty: orderQtyValue, // Default outstanding
              };

              // Ensure orderQty is a non-NaN number
              processedRow.orderQty = isNaN(processedRow.orderQty)
                ? 0
                : processedRow.orderQty;

              // Ensure outstandingQty is a number (treat undefined as 0) and not NaN
              const outQty = processedRow.outstandingQty ?? 0;
              processedRow.outstandingQty = isNaN(outQty) ? 0 : outQty;

              return processedRow;
            }
          );

          // Sanity check log
          console.table(
            processedHovedliste.slice(0, 10).map((r) => ({
              key: r.key,
              supplier: r.supplier,
              dueDate: r.dueDate?.toISOString().split("T")[0] ?? "NULL",
            }))
          );
          console.log(
            "Logged first 10 processed Hovedliste rows (check console). dueDate should have values."
          );

          // Try to parse the supplier checklist sheet if available
          let sjekklisteRaw: ExcelRow[] = [];
          try {
            // Sheet name might vary slightly, use find
            const sjekklisteSheetName = workbook.SheetNames.find((name) =>
              name.toLowerCase().startsWith("sjekkliste leverandører")
            );
            if (sjekklisteSheetName && workbook.Sheets[sjekklisteSheetName]) {
              console.log(
                `Found sjekkliste sheet: ${sjekklisteSheetName}, parsing...`
              );
              sjekklisteRaw = parseSheet(sjekklisteSheetName);
              console.log("Sjekkliste parsed, rows:", sjekklisteRaw.length);
            } else {
              console.warn("Sjekkliste Leverandører sheet not found.");
            }
          } catch (err) {
            console.warn("Error parsing Sjekkliste Leverandører sheet:", err);
          }

          console.log("Parsed data counts:", {
            hovedlisteCount: processedHovedliste.length,
            bpCount: bpRaw.length, // Using raw BP data count
            sjekklisteCount: sjekklisteRaw.length, // Using raw Sjekkliste data count
          });

          // Resolve with the processed Hovedliste data and raw BP/Sjekkliste data
          resolve({
            hovedliste: processedHovedliste,
            bp: bpRaw,
            sjekkliste: sjekklisteRaw,
          });
        } catch (error) {
          console.error("Error processing sheets:", error);
          toast.error(
            "Feil ved behandling av Excel-ark. Vennligst prøv igjen."
          );
          reject(error);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const generateMockData = (): ExcelData => {
    // Generate some mock data for testing - use real-looking supplier names
    const suppliers = [
      "Abena Norge AS",
      "VERNACARE LTD",
      "ICU Medical BV",
      "Smith & Nephew AS",
      "Mediq Norge AS",
      "ConvaTec Norway AS",
    ];

    const mockHovedliste: ExcelRow[] = Array.from({ length: 30 }, (_, i) => {
      const supplierIndex = i % suppliers.length;
      return {
        key: `H${i + 1000}`,
        date: new Date(),
        supplier: suppliers[supplierIndex],
        Leverandør: suppliers[supplierIndex], // Add Norwegian field name
        __EMPTY_8: suppliers[supplierIndex], // Add Excel-specific field
        orderQty: 100 + i * 10,
        receivedQty: i * 5,
        poNumber: `PO-${2023 + i}`,
        itemNo: `ITEM-${1000 + i}`,
        description: `Test product ${i}`,
      };
    });

    const mockBP: ExcelRow[] = Array.from({ length: 15 }, (_, i) => {
      const supplierIndex = i % suppliers.length;
      return {
        key: `BP${i + 2000}`,
        date: new Date(),
        supplier: suppliers[supplierIndex],
        Leverandør: suppliers[supplierIndex],
        __EMPTY_8: suppliers[supplierIndex],
        orderQty: 50 + i * 5,
        receivedQty: i * 2,
        poNumber: `PO-BP-${1000 + i}`,
        itemNo: `ITEM-BP-${2000 + i}`,
        description: `BP test product ${i}`,
      };
    });

    // Create mock sjekkliste that resembles the real data
    const mockSjekkliste: ExcelRow[] = [
      {
        key: "Mandag",
        Leverandør: "Mandag",
        __EMPTY_1: "Uke 46",
        __EMPTY_2: "Uke 47",
        date: new Date(),
        supplier: "N/A", // Add required fields
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier1",
        Leverandør: "Abena Norge AS",
        __EMPTY_1: "Purret",
        __EMPTY_2: "Avvent",
        date: new Date(),
        supplier: "Abena Norge AS",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier2",
        Leverandør: "VERNACARE LTD",
        __EMPTY_1: "Ingen Backorders",
        __EMPTY_2: "Purret",
        date: new Date(),
        supplier: "VERNACARE LTD",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "Tirsdag",
        Leverandør: "Tirsdag",
        __EMPTY_1: "Uke 46",
        __EMPTY_2: "Uke 47",
        date: new Date(),
        supplier: "N/A",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier3",
        Leverandør: "ICU Medical BV",
        __EMPTY_1: "Purret",
        __EMPTY_2: "Avvent",
        date: new Date(),
        supplier: "ICU Medical BV",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier4",
        Leverandør: "Smith & Nephew AS",
        __EMPTY_1: "Purret",
        __EMPTY_2: "Purret",
        date: new Date(),
        supplier: "Smith & Nephew AS",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "Onsdag",
        Leverandør: "Onsdag",
        __EMPTY_1: "Uke 46",
        __EMPTY_2: "Uke 47",
        date: new Date(),
        supplier: "N/A",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier5",
        Leverandør: "Mediq Norge AS",
        __EMPTY_1: "Ingen Backorders",
        __EMPTY_2: "Ingen Backorders",
        date: new Date(),
        supplier: "Mediq Norge AS",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
      {
        key: "supplier6",
        Leverandør: "ConvaTec Norway AS",
        __EMPTY_1: "Ingen Backorders",
        __EMPTY_2: "Purret",
        date: new Date(),
        supplier: "ConvaTec Norway AS",
        orderQty: 0,
        receivedQty: 0,
        poNumber: "",
      },
    ];

    return {
      hovedliste: mockHovedliste,
      bp: mockBP,
      sjekkliste: mockSjekkliste,
    };
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        toast.error("Ingen fil valgt eller filtypen er ugyldig.");
        return;
      }

      const file = acceptedFiles[0];
      console.log("File dropped:", file.name);

      setIsLoading(true);
      setIsValidating(false);
      setProgress(0);
      setProcessingStage("Leser fil...");

      try {
        console.log("Starting Excel parsing process...");
        const parsedData = await parseExcelData(file);
        console.log("Excel data parsed successfully", {
          hovedlisteRows: parsedData.hovedliste.length,
          bpRows: parsedData.bp.length,
          sjekklisteRows: parsedData.sjekkliste?.length || 0,
        });

        setProcessingStage("Validerer data mot database...");
        setIsValidating(true);

        try {
          console.log("Starting data validation...");
          // Simulate/perform ODBC validation
          const validationResult = await window.electron.validateData(
            parsedData
          );

          // Add type assertion for validationResult
          const typedResult = validationResult as {
            success: boolean;
            data?: {
              hovedlisteCount: number;
              bpCount: number;
            };
            error?: string;
          };

          console.log("Validation result:", typedResult);

          if (!typedResult.success) {
            console.error("Validation failed:", typedResult.error);
            toast.error(`Valideringsfeil: ${typedResult.error}`);
            setIsLoading(false);
            setIsValidating(false);
            return;
          }

          // Update data with validation results if they exist
          if (typedResult.data) {
            // Create a new object with the validation data
            parsedData.validation = {
              hovedlisteCount: typedResult.data.hovedlisteCount,
              bpCount: typedResult.data.bpCount,
            };
          }

          // --- Read file content for IPC ---
          let fileBuffer: ArrayBuffer;
          try {
            fileBuffer = await file.arrayBuffer();
            console.log("File read into ArrayBuffer for IPC.");
          } catch (__error: unknown) {
            // Prefix unused error
            console.error("Error reading file into buffer:", __error);
            toast.error("Kunne ikke lese filinnhold.");
            setIsLoading(false);
            setIsValidating(false);
            return;
          }
          // --- End Read file content ---

          // Add this after successful ODBC validation
          try {
            console.log(
              "Triggering database import via IPC with file buffer..."
            );
            // Call saveOrdersToDatabase with the fileBuffer
            const dbResult = await window.electron.saveOrdersToDatabase({
              fileBuffer: fileBuffer, // Pass the buffer directly
            });
            console.log("Database import/save result:", dbResult);

            if (!dbResult.success) {
              console.warn("Database save warning:", dbResult.error);
              // Continue even if database save fails - it's not critical for the app to function
              toast.error(
                dbResult.error ||
                  "Data validert, men lagring til database feilet"
              );
            } else {
              console.log("Database import/save successful.");
              // We might not need a specific count here anymore if the importer handles it
              toast.success(`Import vellykket og data lagret i databasen.`);
            }
          } catch (__error: unknown) {
            // Prefix unused error
            console.error("Database error:", __error);
            // Continue even if database save fails
            toast.error("Data validated but not saved to local database");
          }

          console.log("Processing complete, calling onDataParsed");
          // Always call onDataParsed when data is successfully parsed
          onDataParsed(parsedData);
        } catch (error) {
          console.error("Validation error:", error);
          toast.error("Feil ved validering mot database");
        } finally {
          setIsLoading(false);
          setIsValidating(false);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        if (error instanceof Error) {
          if (error.message !== "Validation error") {
            // Don't show error for validation errors that are already handled
            toast.error(`Feil ved behandling av fil: ${error.message}`);
          }
        } else {
          toast.error("Ukjent feil ved behandling av fil");
        }
        setIsLoading(false);
        setIsValidating(false);
      }
    },
    [onDataParsed, onValidationErrors]
  );

  // Add skeleton loading component
  const LoadingSkeleton = () => (
    <div
      className="animate-pulse space-y-4"
      role="status"
      aria-label="Laster inn"
    >
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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: isLoading || isValidating,
  });

  const loadMockData = () => {
    if (process.env.NODE_ENV === "development") {
      const mockData = generateMockData();
      onDataParsed(mockData);
      toast.success("Testdata ble lastet");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-neutral">Last opp Excel-fil</h2>

        <div className="relative" ref={helpMenuRef}>
          <button
            onClick={() => setHelpMenuOpen(!helpMenuOpen)}
            className="flex items-center text-neutral-dark hover:text-primary transition-colors"
            aria-label="Hjelp"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 mr-1" />
            <span>Hjelp</span>
          </button>

          {helpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <h3 className="font-medium text-neutral">Hjelp og ressurser</h3>
                <button
                  onClick={() => setHelpMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => handleHelpOptionClick("docs")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dokumentasjon
                </button>
                <button
                  onClick={() => handleHelpOptionClick("check-updates")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sjekk for oppdateringer
                </button>
                <button
                  onClick={() => handleHelpOptionClick("contact-support")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Kontakt support
                </button>
                <button
                  onClick={() => handleHelpOptionClick("about")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Om OneMed SupplyChain
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleHelpOptionClick("show-logs")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Vis logger (feilsøking)
                </button>
              </div>
            </div>
          )}
        </div>
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
                {isValidating ? "Validerer mot database..." : processingStage}
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
                <p className="text-xs text-right mt-1">
                  {Math.round(progress)}%
                </p>
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
              ? "border-primary bg-primary-light bg-opacity-10"
              : "border-gray-300 hover:border-primary"
          }`}
        >
          <input
            {...getInputProps()}
            data-testid="file-input"
            aria-label="Last opp Excel-fil"
          />
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
                {isDragActive
                  ? "Slipp filen her..."
                  : "Dra og slipp Excel-filen her, eller klikk for å velge fil"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Filen må inneholde arkene &quot;Hovedliste&quot; og
                &quot;BP&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMockData}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Bruk testdata (kun i utviklingsmodus)
          </button>
        </div>
      )}

      <div className="mt-4 p-4 border border-neutral-light rounded-sm bg-primary-light bg-opacity-10">
        <h4 className="font-medium text-primary mb-2">Hva må jeg gjøre?</h4>
        <p className="text-sm text-neutral">
          Last ned den nyeste versjonen av &quot;Hovedliste&quot; fra Qlik
          Sense.
        </p>
        <p className="text-sm text-neutral mt-1">
          Pass på at du eksporterer &quot;Hovedliste&quot;-arket som en
          .xlsx-fil.
        </p>
        <p className="text-sm text-neutral mt-1">
          Dra og slipp filen her, eller klikk for å velge den.
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
