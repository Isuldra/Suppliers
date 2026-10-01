/** Imported order data returned by the database API. */
export interface ExcelRow {
  key: string;
  poNumber: string;
  status: string;
  itemNo: string;
  dueDate?: Date;
  supplierETA?: Date;
  producerItemNo?: string;
  supplier: string;
  description: string;
  supplierArticleNo?: string;
  specification?: string;
  note?: string;
  inventoryBalance?: number;
  orderQty: number;
  purchaser?: string;
  warehouse?: string;
  internalSupplierNumber?: string;
  productSpecification?: string;
  orderRowNumber?: string;
  receivedQty: number;
  outstandingQty?: number;
  from_restliste?: 0 | 1;
  reference?: string;
  orderDate?: Date;
  category?: string;
  value?: number;
  currency?: string;
  confirmed?: boolean;
  email_sent_at?: string | null;
}
