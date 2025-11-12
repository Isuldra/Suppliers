/**
 * Type definition for data imported from Excel files and used across main/renderer.
 */

export interface ExcelRow {
  // Fields from Hovedliste / Purchase Order
  key: string; // Nøkkel (Unique Key from Hovedliste)
  poNumber: string; // Ordrenr / PO-nummer
  status: string; // Ordre status
  itemNo: string; // Varenummer
  dueDate?: Date; // Forfallsdato (Originally from Hovedliste 'Dato varen skulle kommet inn', Column F)
  supplierETA?: Date; // ETA fra leverandør (Primarily from Restliste, fallback to Hovedliste Column G)
  producerItemNo?: string; // Produsentens varenr (Hovedliste Column H)
  supplier: string; // Leverandørnavn (Hovedliste Column J, Ftgnavn)
  description: string; // Beskrivelse (Hovedliste Column K)
  supplierArticleNo?: string; // Supplier Article Number (BP Column I, stored in beskrivelse/producer_item)
  specification?: string; // Spesifikasjon (Hovedliste Column L / BP Column L - orpradtext)
  note?: string; // Merknad (Hovedliste Column M)
  inventoryBalance?: number; // Beholdning (Hovedliste Column N)
  orderQty: number; // Ordre antall (Hovedliste Column O)
  purchaser?: string; // Kjøper (Hovedliste Column P)
  orderRowNumber?: string; // Bestradnr / Order Row Number (Column Q)

  // Added fields / Calculated fields
  receivedQty: number; // Mottatt antall (This needs to be sourced or defaulted)
  outstandingQty?: number; // Kalkulert: Ordre antall - Mottatt antall

  // Internal processing flags/data
  from_restliste?: 0 | 1; // Flag indicating if the item's ETA was found in Restliste

  // Optional fields that were in the old definition, might be used by other parts or can be phased out
  reference?: string; // Could be same as 'key' or 'poNumber' depending on context
  orderDate?: Date;
  category?: string;
  value?: number;
  currency?: string;
  confirmed?: boolean;
  email_sent_at?: string | null; // For tracking email status, might be part of DbOrder instead
}
