import Handlebars from 'handlebars';

// Register helpers at build time
Handlebars.registerHelper('eq', (a: unknown, b: unknown): boolean => a === b);
Handlebars.registerHelper('gt', (a: number, b: number): boolean => a > b);

const rawTemplate = "<!DOCTYPE html><html><head><style>body { font-family: Arial, sans-serif; }\n        table { border-collapse: collapse; width: 100%; }\n        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }\n        th { background-color: #f2f2f2; }\n        .urgent { background-color: #ffebee; }</style></head><body><h1>Purring på manglende leveranser</h1><p>Hei,</p><p>Dette er en påminnelse om følgende manglende leveranser:</p><table><thead><tr><th>Nøkkel</th><th>PO-nummer</th><th>Ordrerad</th><th>Utestående antall</th></tr></thead><tbody>{{#each orders}}<tr class=\"{{#if (gt outstandingQty 0)}}urgent{{/if}}\"><td>{{key}}</td><td>{{poNumber}}</td><td>{{orderRowNumber}}</td><td>{{outstandingQty}}</td></tr>{{/each}}</tbody></table><p>Vennligst bekreft mottak av denne meldingen og oppdater leveringsstatus.</p><p>Med vennlig hilsen,<br>Pulse</p></body></html>";

const compiledEmail = Handlebars.compile(rawTemplate);

export interface OrderData {
  poNumber: string;
  itemNo: string;
  description: string;
  orderRowNumber?: string;
  outstandingQty: number;
}

export interface EmailData {
  language?: 'en' | 'no';
  supplier: string;
  orders: OrderData[];
}

export function generateEmailContent(data: EmailData): string {
  return compiledEmail({
    language: data.language ?? 'no',
    supplier: data.supplier,
    orders: data.orders,
  });
}
