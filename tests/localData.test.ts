// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureLocalData } from '../scripts/ensure-local-data.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('local business data initialization', () => {
  it('creates missing files from fictional examples and never overwrites existing local data', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-data-test-'));
    temporaryDirectories.push(directory);
    for (const name of ['supplierData', 'supplyPlanners']) {
      fs.copyFileSync(
        new URL(`../src/renderer/data/${name}.example.json`, import.meta.url),
        path.join(directory, `${name}.example.json`)
      );
    }
    const original = '{"planners":[{"name":"local-only"}]}';
    fs.writeFileSync(path.join(directory, 'supplyPlanners.json'), original);

    ensureLocalData(directory);
    ensureLocalData(directory);

    expect(fs.readFileSync(path.join(directory, 'supplyPlanners.json'), 'utf8')).toBe(original);
    const supplier = JSON.parse(fs.readFileSync(path.join(directory, 'supplierData.json'), 'utf8'));
    expect(supplier.leverandører[0].epost).toBe('supplier@example.invalid');
  });
});
