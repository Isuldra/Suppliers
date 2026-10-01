export interface ExcelRow {
  key: string;
  dueDate?: Date;
  supplier: string;
  orderQty: number;
  receivedQty: number;
  poNumber: string;
  outstandingQty?: number;
  itemNo?: string;
  description?: string;
  specification?: string;
  orderRowNumber?: string;
  date?: Date;
  internalSupplierNumber?: string;
  productSpecification?: string;
  warehouse?: string;
  supplierArticleNo?: string;
  selected?: boolean;
  [key: string]: unknown;
}

export interface SupplierInfo {
  leverandor: string;
  companyId: string;
  sprak: string;
  purredag: string;
  epost: string;
}

export interface ExcelData {
  hovedliste: ExcelRow[];
  bp: ExcelRow[];
  sjekkliste?: ExcelRow[];
  leverandorer?: SupplierInfo[];
  supplier?: string;
  weekday?: string;
  validation?: {
    hovedlisteCount?: number;
    bpCount: number;
    leverandorCount?: number;
  };
}

export interface ValidationError {
  type: 'missingSheet' | 'invalidDate' | 'invalidNumber' | 'missingColumn';
  message: string;
  row?: number;
  column?: string;
}
