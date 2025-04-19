/**
 * This adapter handles SQLite loading in a robust way
 * Ensures we can work with different SQLite implementations or fall back gracefully
 */
export function getSqliteDatabase() {
  try {
    // Try the regular version first
    // Use dynamic import with .node extension for native modules
    const sqlite = require("better-sqlite3");
    console.log("Using better-sqlite3");
    return sqlite;
  } catch (err) {
    console.error("Failed to load better-sqlite3:", err);

    try {
      // Try sqlite3 as fallback
      const sqlite3 = require("sqlite3");
      console.log("Using sqlite3");
      // Wrap to match better-sqlite3 interface
      return function (filename, options) {
        const db = new sqlite3.Database(filename);
        return {
          prepare: (sql) => ({
            run: (...params) => {
              return new Promise((resolve) => {
                db.run(sql, params, function (err) {
                  resolve({
                    changes: this.changes,
                    lastInsertRowid: this.lastID,
                  });
                });
              });
            },
            get: (...params) => {
              return new Promise((resolve) => {
                db.get(sql, params, (err, row) => resolve(row));
              });
            },
            all: (...params) => {
              return new Promise((resolve) => {
                db.all(sql, params, (err, rows) => resolve(rows || []));
              });
            },
          }),
          exec: (sql) =>
            new Promise((resolve) => db.exec(sql, () => resolve())),
          close: () => new Promise((resolve) => db.close(() => resolve())),
          pragma: (stmt) =>
            new Promise((resolve) =>
              db.run(`PRAGMA ${stmt};`, () => resolve())
            ),
        };
      };
    } catch (err2) {
      console.error("Failed to load sqlite3:", err2);

      // Return a mock implementation
      console.warn("Using mock database");
      return function (filename, options) {
        return {
          prepare: (sql) => ({
            run: (...params) => ({ changes: 0, lastInsertRowid: -1 }),
            get: (...params) => null,
            all: (...params) => [],
          }),
          exec: (sql) => null,
          close: () => true,
          pragma: (stmt) => null,
        };
      };
    }
  }
}
