/* eslint-disable */
/* @ts-nocheck */
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
// @ts-ignore
import { minify } from 'html-minifier-terser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const srcPath = path.resolve(__dirname, '../src/services/emailTemplates/reminder.hbs');
  const templateSource = fs.readFileSync(srcPath, 'utf-8');
  const minified = await minify(templateSource, {
    collapseWhitespace: true,
    removeComments: false,
    keepClosingSlash: true,
  });

  // Register helpers at build time
  Handlebars.registerHelper('eq', (a: unknown, b: unknown): boolean => a === b);
  Handlebars.registerHelper('gt', (a: number, b: number): boolean => a > b);

  // Build the TS module content
  const output = `import Handlebars from 'handlebars';

// Register helpers at build time
Handlebars.registerHelper('eq', (a: unknown, b: unknown): boolean => a === b);
Handlebars.registerHelper('gt', (a: number, b: number): boolean => a > b);

/* eslint-disable max-len */
const rawTemplate = ${JSON.stringify(minified)};
/* eslint-enable max-len */

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
`;

  // Ensure output directory exists
  const outDir = path.resolve(__dirname, '../src/generated');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.resolve(outDir, 'emailTemplateCompiled.ts');
  fs.writeFileSync(outPath, output, 'utf-8');
  console.log(`Generated ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
