export interface ExcelRow {
  key: string;
  date: Date;
  supplier: string;
  orderQty: number;
  receivedQty: number;
  poNumber: string;
  [key: string]: any; // For other columns we might need
}

export interface ExcelData {
  hovedliste: ExcelRow[];
  bp: ExcelRow[];
  sjekkliste?: ExcelRow[]; // Added to support Sjekkliste Leverandører sheet
  supplier?: string; // Current selected supplier
  weekday?: string; // Current selected weekday
  validation?: {
    hovedlisteCount: number;
    bpCount: number;
  }; // Validation data from ODBC check
}

export interface ValidationError {
  type: "missingSheet" | "invalidDate" | "invalidNumber" | "missingColumn";
  message: string;
  row?: number;
  column?: string;
}

export type WizardStep =
  | "upload"
  | "planner"
  | "weekday"
  | "supplier"
  | "review"
  | "email";

export interface WizardState {
  currentStep: WizardStep;
  excelData?: ExcelData;
  selectedPlanner?: string;
  selectedWeekday?: string;
  selectedSupplier?: string;
  validationErrors: ValidationError[];
  isLoading: boolean;
  progress: number;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: {
    hovedlisteCount: number;
    bpCount: number;
  };
}
