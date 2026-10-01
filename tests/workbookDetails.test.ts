// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { workbookDetails } from '../src/main/workbookDetails';
import { COLUMN_MAPPINGS, resolveHeaderMapping } from '../src/config/columnMappings';

describe('Design data from the purchasing workbook', () => {
  it('uses ERP headers when a Nøkkel column shifts company and order type columns', () => {
    const mapping = resolveHeaderMapping(COLUMN_MAPPINGS.NO, [
      'Nøkkel',
      'foretagkod',
      'bestnr',
      'ftgnr',
      'lagstalle',
      'beststatkod',
      'besttyp',
      'artnr',
      'artnrlev',
      'bestberlevdat',
      'bestlovlevdat',
      'orpradtext',
      'bestant',
      'bestlevant',
      'bestrestant',
      'ftgnamn',
      'bestradnr',
    ]);
    expect(mapping.companyCode).toBe(1);
    expect(mapping.besttyp).toBe(6);
    expect(mapping.poNumber).toBe(2);
    expect(resolveHeaderMapping(COLUMN_MAPPINGS.DK, []).poNumber).toBe(1);
  });
  it('reads real descriptions and calculates available stock for the matching company and warehouse', () => {
    const wb = new ExcelJS.Workbook();
    const item = wb.addWorksheet('ITEM');
    item.getRow(5).values = ['foretagkod', 'artnr', 'artbeskr', 'artbeskrspec'];
    item.getRow(6).values = [40, 'TEST-1', 'Test gloves', 'Size M'];
    const stock = wb.addWorksheet('ARS');
    stock.getRow(5).values = ['foretagkod', 'artnr', 'lagstalle', 'lagsaldo', 'lagresant'];
    stock.getRow(6).values = [40, 'TEST-1', '40', 12, 30];
    stock.getRow(7).values = [80, 'TEST-1', '80', 100, 10];
    stock.getRow(8).values = [40, 'TEST-2', '40', null, 30];
    const details = workbookDetails(wb);
    expect(details.product('40', 'TEST-1')).toEqual({
      description: 'Test gloves',
      specification: 'Size M',
    });
    expect(details.available('40', '40', 'TEST-1')).toBe(-18);
    expect(details.available('80', '80', 'TEST-1')).toBe(90);
    expect(details.available('40', '80', 'TEST-1')).toBeUndefined();
    expect(details.available('40', '40', 'TEST-2')).toBeUndefined();
  });
  it('keeps missing supporting sheets unknown instead of claiming zero stock', () => {
    const details = workbookDetails(new ExcelJS.Workbook());
    expect(details.product('40', 'TEST-1')).toBeUndefined();
    expect(details.available('40', '40', 'TEST-1')).toBeUndefined();
  });
});
