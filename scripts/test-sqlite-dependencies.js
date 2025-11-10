#!/usr/bin/env node

// This script tests if SQLite dependencies are working correctly
// without rebuilding, by attempting to create a test database

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('Testing SQLite dependencies...');

// Write a test script
const testScriptPath = path.join(rootDir, 'scripts', 'sqlite-test.js');
fs.writeFileSync(
  testScriptPath,
  `
const sqlite3 = require('sqlite3');
const BetterSqlite3 = require('better-sqlite3');

console.log('Testing SQLite3 module...');
try {
  const db1 = new sqlite3.Database(':memory:');
  db1.serialize(() => {
    db1.run('CREATE TABLE test (info TEXT)');
    db1.run('INSERT INTO test VALUES (?)', ['SQLite3 is working!']);
    db1.get('SELECT info FROM test', (err, row) => {
      if (err) {
        console.error('Error with SQLite3:', err);
      } else {
        console.log('SQLite3 result:', row.info);
        db1.close();
      }
    });
  });
  console.log('SQLite3 module loaded successfully!');
} catch (err) {
  console.error('Failed to load SQLite3:', err);
}

console.log('\\nTesting Better-SQLite3 module...');
try {
  const db2 = new BetterSqlite3(':memory:');
  db2.prepare('CREATE TABLE test_better (info TEXT)').run();
  db2.prepare('INSERT INTO test_better VALUES (?)').run('Better-SQLite3 is working!');
  const row = db2.prepare('SELECT info FROM test_better').get();
  console.log('Better-SQLite3 result:', row.info);
  db2.close();
  console.log('Better-SQLite3 module loaded successfully!');
} catch (err) {
  console.error('Failed to load Better-SQLite3:', err);
}
`
);

// Execute the test script
exec('node scripts/sqlite-test.js', { cwd: rootDir }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    console.error(stderr);
    console.log('\nSQLite dependencies test FAILED!');
    console.log(
      'You may need to modify the build configuration or try using `npm rebuild` with the correct tools installed.'
    );
    process.exit(1);
  }

  console.log(stdout);
  console.log('\nSQLite dependencies test PASSED!');
  console.log('You can proceed with building for your work PC.');
});
