import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function ensureLocalData(dataDirectory = path.join(projectRoot, 'src/renderer/data')) {
  for (const name of ['supplierData', 'supplyPlanners']) {
    try {
      fs.copyFileSync(
        path.join(dataDirectory, `${name}.example.json`),
        path.join(dataDirectory, `${name}.json`),
        fs.constants.COPYFILE_EXCL
      );
      console.log(`Created local ${name}.json from safe example data`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureLocalData();
}
