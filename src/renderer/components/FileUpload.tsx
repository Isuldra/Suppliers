declare global {
  interface Window {
    electron: {
      validateData: (data: any) => Promise<any>;
      sendEmail: (
        payload: any
      ) => Promise<{ success: boolean; error?: string }>;
      getSuppliers: () => Promise<{
        success: boolean;
        data?: string[];
        error?: string;
      }>;
      parseExcel: (data: any) => void;
      onExcelValidation: (callback: (data: any) => void) => () => void;
      handleError: (error: Error) => void;
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      saveOrdersToDatabase: (
        data: ExcelData
      ) => Promise<{ success: boolean; message?: string; error?: string }>;
      openExternalLink: (
        url: string
      ) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { ExcelData, ValidationError, ExcelRow } from "../types/ExcelData";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

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

      reader.onload = (e) => {
        try {
          setProcessingStage("Prosesserer Excel-fil...");
          console.log("File loaded, parsing Excel data...");
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          console.log("Workbook loaded, sheets:", workbook.SheetNames);

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
                console.error(`Sheet ${sheetName} not found`);
                return [];
              }

              // Different parsing options based on sheet
              let options: XLSX.Sheet2JSONOpts = {
                defval: "", // Default value for empty cells
                raw: false, // Convert values to string/number types as appropriate
              };

              // Special handling for Hovedliste which has a specific format
              if (sheetName === "Hovedliste") {
                // Try to determine if the sheet has a header row
                const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
                let headerRow = 0;

                // Look at first few rows to find the row with column headers
                for (let r = 0; r <= Math.min(5, range.e.r); r++) {
                  const rowData = XLSX.utils.sheet_to_json(sheet, {
                    header: 1,
                    range: XLSX.utils.encode_range({
                      s: { r, c: 0 },
                      e: { r, c: range.e.c },
                    }),
                  })[0] as any[];

                  if (rowData && Array.isArray(rowData)) {
                    const hasHeaders = rowData.some(
                      (cell) =>
                        cell &&
                        typeof cell === "string" &&
                        (cell.includes("Nøkkel") ||
                          cell.includes("Leverandør") ||
                          cell.includes("Item") ||
                          cell.includes("PO") ||
                          cell.includes("Order"))
                    );

                    if (hasHeaders) {
                      console.log(
                        `Found headers in Hovedliste at row ${r}:`,
                        rowData
                      );
                      headerRow = r;
                      break;
                    }
                  }
                }

                // Set options to use the detected header row
                options = {
                  ...options,
                  range: headerRow > 0 ? headerRow : undefined,
                  header: "A",
                };
              }

              const rawData = XLSX.utils.sheet_to_json(
                sheet,
                options
              ) as Record<string, any>[];
              console.log(
                `${sheetName} raw data (sample):`,
                rawData.slice(0, 2)
              );

              // Log all column names from first row to debug
              if (rawData.length > 0) {
                console.log(
                  `${sheetName} column names:`,
                  Object.keys(rawData[0] as object)
                );
              }

              // Look at the actual structure in the Hovedliste sheet
              if (sheetName === "Hovedliste") {
                // Examine a few rows to understand structure
                rawData.slice(0, 3).forEach((row, idx) => {
                  console.log(`Hovedliste row ${idx} full data:`, row);
                });

                // Try to find supplier column based on values
                const possibleSupplierColumns = Object.keys(
                  rawData[0] as object
                ).filter((key) => {
                  const values = rawData
                    .slice(0, 10)
                    .map((row) => (row as any)[key]);
                  const uniqueValues = [
                    ...new Set(
                      values.filter((v) => v && typeof v === "string")
                    ),
                  ];
                  console.log(`Column ${key} unique values:`, uniqueValues);

                  // Check if any values match known supplier names
                  const potentialSuppliers = uniqueValues.filter(
                    (v) =>
                      typeof v === "string" &&
                      (v.includes("Norge") ||
                        v.includes("LTD") ||
                        v.includes("AS"))
                  );

                  return potentialSuppliers.length > 0;
                });

                console.log(
                  "Potential supplier columns:",
                  possibleSupplierColumns
                );
              }

              // Map and provide defaults for missing properties
              return rawData.map((row: any, index) => {
                // For specific excel format, map the known column names
                // Based on the console logs, we can see these column names:
                // 'A' = 'Nøkkel', 'B' = 'PONo.', 'C' = 'Ordre status', 'D' = 'Ordrestatus',
                // 'E' = 'Item No.', 'I' = 'Leverandør', 'J' = 'Item description', 'K' = 'Specification'
                // 'O' = 'OrdQtyPO' - This is the primary source for order quantity

                // Use Record<string, any> to allow for dynamic property assignment
                const processedRow: Record<string, any> = {
                  key:
                    row.key ||
                    row.Key ||
                    row.ID ||
                    row.A ||
                    row.Nøkkel ||
                    `row-${index}`,
                  date: new Date(), // Default date since date conversion can be complex
                  supplier:
                    row.supplier ||
                    row.Supplier ||
                    row.Leverandør ||
                    row.I ||
                    "",
                  // Prioritize the O column (OrdQtyPO) for order quantity
                  // and ensure it's properly converted to a number
                  orderQty: Number(
                    row.O || row.OrdQtyPO || row.orderQty || row.OrderQty || 0
                  ),
                  receivedQty: Number(0), // We don't have received quantity in the raw data
                  poNumber:
                    row.poNumber || row.PO || row.B || row["PONo."] || "",
                  itemNo: row.itemNo || row.E || row["Item No."] || "",
                  description:
                    row.description || row.J || row["Item description"] || "",
                  specification: row.K || row.Specification || "",
                  outstandingQty: 0,
                };

                // Try to extract proper date if available
                if (row.F && typeof row.F === "string") {
                  // Handle date format like '9/9/24'
                  const dateMatch = row.F.match(/(\d+)\/(\d+)\/(\d+)/);
                  if (dateMatch) {
                    const [_, month, day, year] = dateMatch;
                    const fullYear = year.length === 2 ? "20" + year : year;
                    processedRow.date = new Date(`${fullYear}-${month}-${day}`);
                  }
                } else if (row.G && typeof row.G === "string") {
                  // Try alternate date field (ETA from supplier)
                  const dateMatch = row.G.match(/(\d+)\/(\d+)\/(\d+)/);
                  if (dateMatch) {
                    const [_, month, day, year] = dateMatch;
                    const fullYear = year.length === 2 ? "20" + year : year;
                    processedRow.date = new Date(`${fullYear}-${month}-${day}`);
                  }
                }

                // Map all original raw columns to ensure we have all data
                Object.keys(row).forEach((key) => {
                  processedRow[key] = row[key];
                });

                // Direct field mapping for better matching
                // Based on column analysis from logs
                if (row.A) processedRow.key = row.A;
                if (row.B) processedRow.poNumber = row.B;
                if (row.E) processedRow.itemNo = row.E;
                if (row.I) processedRow.supplier = row.I;
                if (row.J) processedRow.description = row.J;
                if (row.K) processedRow.specification = row.K;
                // Remove this line as it overwrites orderQty with 0 if row.O is empty
                // if (row.O) processedRow.orderQty = Number(row.O || 0);

                // Ensure orderQty is always a number (avoiding NaN)
                processedRow.orderQty = isNaN(processedRow.orderQty)
                  ? 0
                  : processedRow.orderQty;

                // Calculate outstandingQty based on orderQty
                processedRow.outstandingQty =
                  processedRow.orderQty - processedRow.receivedQty;

                // Special case for Hovedliste based on examining the structure
                if (sheetName === "Hovedliste" && index < 5) {
                  console.log(
                    `Processed Hovedliste row ${index}:`,
                    processedRow
                  );
                }

                return processedRow as ExcelRow;
              });
            } catch (err) {
              console.error(`Error parsing sheet ${sheetName}:`, err);
              return [];
            }
          };

          const hovedliste = parseSheet("Hovedliste");
          const bp = parseSheet("BP");

          // Try to parse the supplier checklist sheet if available
          let sjekkliste: ExcelRow[] = [];
          try {
            if (workbook.Sheets["Sjekkliste Leverandører"]) {
              console.log("Found Sjekkliste Leverandører sheet, parsing...");
              sjekkliste = parseSheet("Sjekkliste Leverandører");
              console.log("Sjekkliste parsed, rows:", sjekkliste.length);
            }
          } catch (err) {
            console.warn("Error parsing Sjekkliste Leverandører sheet:", err);
          }

          console.log("Parsed data:", {
            hovedlisteCount: hovedliste.length,
            bpCount: bp.length,
            sjekklisteCount: sjekkliste.length,
          });

          resolve({ hovedliste, bp, sjekkliste });
        } catch (error) {
          console.error("Error parsing file:", error);
          toast.error("Feil ved analysering av filen. Vennligst prøv igjen.");
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast.error("Kunne ikke lese filen. Vennligst prøv igjen.");
        reject(error);
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
        return;
      }

      const file = acceptedFiles[0];
      console.log("File dropped:", file.name);
      if (
        file.type !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        toast.error("Vennligst last opp en Excel-fil (.xlsx)");
        return;
      }

      setIsLoading(true);
      setProgress(0);
      setProcessingStage("Leser fil...");

      try {
        const parsedData = await parseExcelData(file);
        console.log("Excel data parsed successfully");

        setProcessingStage("Validerer data mot database...");
        setIsValidating(true);

        try {
          // Simulate/perform ODBC validation
          const validationResult = await window.electron.validateData(
            parsedData
          );

          if (!validationResult.success) {
            toast.error(`Valideringsfeil: ${validationResult.error}`);
            setIsLoading(false);
            setIsValidating(false);
            return;
          }

          // Update data with validation results if they exist
          if (validationResult.data) {
            // Create a new object with the validation data
            parsedData.validation = {
              hovedlisteCount: validationResult.data.hovedlisteCount,
              bpCount: validationResult.data.bpCount,
            };
          }

          // Add this after successful ODBC validation
          try {
            // Save to database if validation was successful
            const dbResult = await window.electron.saveOrdersToDatabase(
              parsedData
            );

            if (!dbResult.success) {
              console.warn("Database save warning:", dbResult.error);
              // Continue even if database save fails - it's not critical for the app to function
              toast.error("Data validated but not saved to local database");
            } else {
              console.log("Database save result:", dbResult);
              toast.success(
                `Saved ${
                  parsedData.hovedliste.length + parsedData.bp.length
                } orders to database`
              );
            }
          } catch (dbError) {
            console.error("Database error:", dbError);
            // Continue even if database save fails
            toast.error("Data validated but not saved to local database");
          }

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
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => handleHelpOptionClick("about")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Om OneMed SupplyChain
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
                Filen må inneholde arkene "Hovedliste" og "BP"
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
    </div>
  );
};

export default FileUpload;
