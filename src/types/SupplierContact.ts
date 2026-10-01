export interface SupplierContact {
  name: string;
  email: string;
  language: string;
  days: string[];
  /** Company ID from the "Leverandør" sheet. */
  number?: string;
}
