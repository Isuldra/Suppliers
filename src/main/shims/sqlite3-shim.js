// Mock implementation of the sqlite3 module
const Database = class {
  constructor() {
    this.open = false;
  }

  run() {
    return this;
  }

  get() {
    return this;
  }

  all() {
    return this;
  }

  each() {
    return this;
  }

  prepare() {
    return this;
  }

  close() {
    this.open = false;
    return this;
  }
};

// Export the mock implementation
export default {
  Database,
  verbose: () => ({ Database }),
};
