import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const electron = require('electron');
const probe = `
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE probe (value INTEGER)');
    db.prepare('INSERT INTO probe VALUES (?)').run(42);
    if (db.prepare('SELECT value FROM probe').get().value !== 42) {
      throw new Error('SQLite round trip failed');
    }
    console.log('SQLite read/write passed under Electron ' + process.versions.electron);
  } finally {
    db.close();
  }
`;
const result = spawnSync(electron, ['-e', probe], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
