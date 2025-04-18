// Mock implementation of the odbc module
const mockConnection = {
  query: async () => [],
  close: async () => {},
  connected: false,
  autocommit: true,
  createStatement: async () => ({}),
  callProcedure: async () => ({}),
};

// Mock the connect function
const connect = async () => mockConnection;

// Export the mock implementation
export default {
  connect,
  Connection: class {},
};
