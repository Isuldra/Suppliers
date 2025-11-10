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

console.log('\nTesting Better-SQLite3 module...');
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
