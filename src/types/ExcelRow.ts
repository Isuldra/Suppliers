/**
 * Type definition for data imported from Excel files
 */

export interface ExcelRow {
  reference?: string;
  supplier: string;
  orderNumber?: string;
  orderDate?: Date;
  dueDate?: Date;
  category?: string;
  description?: string;
  value?: number;
  currency?: string;
  confirmed?: boolean;
}
