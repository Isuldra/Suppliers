export interface ExcelRow {
  key: string;
  // date: Date; // Remove or comment out old date property
  dueDate?: Date; // Add dueDate property
  supplier: string;
  orderQty: number;
  receivedQty: number;
  poNumber: string;
  outstandingQty?: number; // Add outstandingQty property
  itemNo?: string; // Explicitly add itemNo as optional string
  description?: string; // Explicitly add description as optional string
  specification?: string; // Explicitly add specification as optional string
  date?: Date; // Keep date as optional if needed for other logic
  [key: string]: unknown; // Use unknown instead of any for better type safety
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
  data?: unknown;
  validationErrors?: ValidationError[];
}
