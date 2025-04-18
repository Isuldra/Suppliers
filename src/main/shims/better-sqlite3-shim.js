// Mock implementation of the better-sqlite3 module for development
const Database = class {
  constructor() {
    this.open = true;
    console.log("Using better-sqlite3 shim in development mode");
  }

  pragma() {
    return { open: true };
  }

  prepare() {
    return {
      run: (...args) => ({ changes: 0, lastInsertRowid: 1 }),
      get: (...args) => null,
      all: (...args) => [],
    };
  }

  exec() {
    return this;
  }

  close() {
    this.open = false;
    return this;
  }

  backup() {
    return Promise.resolve(true);
  }
};

// Export a function that returns a Database instance
export default (...args) => new Database(...args);
