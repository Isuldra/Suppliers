import type ExcelJS from 'exceljs';

export type ProductDetails = { description: string; specification: string };
const key = (...values: string[]) => JSON.stringify(values.map((value) => value.trim()));
/** Read optional supporting sheets without substituting another warehouse's stock. */
export function workbookDetails(workbook: ExcelJS.Workbook) {
  const products = new Map<string, ProductDetails>();
  const balances = new Map<string, number>();
  const item = workbook.getWorksheet('ITEM');
  const stock = workbook.getWorksheet('ARS');
  function columns(sheet: ExcelJS.Worksheet) {
    const names = new Map<string, number>();
    sheet.getRow(5).eachCell((cell, index) => names.set(cell.text.trim().toLowerCase(), index));
    return names;
  }
  if (item) {
    const cols = columns(item);
    if (cols.has('artnr') && cols.has('artbeskr') && cols.has('foretagkod')) {
      for (let r = 6; r <= item.rowCount; r++) {
        const row = item.getRow(r);
        const text = (name: string) =>
          cols.has(name) ? row.getCell(cols.get(name)!).text.trim() : '';
        if (text('artnr'))
          products.set(key(text('foretagkod'), text('artnr')), {
            description: text('artbeskr'),
            specification: text('artbeskrspec'),
          });
      }
    }
  }
  if (stock) {
    const cols = columns(stock);
    if (
      ['foretagkod', 'artnr', 'lagstalle', 'lagsaldo', 'lagresant'].every((name) => cols.has(name))
    ) {
      for (let r = 6; r <= stock.rowCount; r++) {
        const row = stock.getRow(r);
        const text = (name: string) => row.getCell(cols.get(name)!).text.trim();
        const balance = Number(text('lagsaldo').replace(',', '.'));
        const reserved = Number(text('lagresant').replace(',', '.'));
        if (
          text('artnr') &&
          text('lagsaldo') !== '' &&
          text('lagresant') !== '' &&
          Number.isFinite(balance) &&
          Number.isFinite(reserved)
        )
          balances.set(
            key(text('foretagkod'), text('lagstalle'), text('artnr')),
            balance - reserved
          );
      }
    }
  }
  return {
    product: (company: string, itemNo: string) => products.get(key(company, itemNo)),
    available: (company: string, warehouse: string, itemNo: string) =>
      balances.get(key(company, warehouse, itemNo)),
  };
}
