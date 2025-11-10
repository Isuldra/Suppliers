/**
 * Example usage of the database API
 * This file shows how to use the database API from both the main process and renderer process
 */

// Main process example (in Electron main)
import { databaseService } from '../services/databaseService';
import { ExcelRow } from '../types/ExcelRow';

// Example data
const sampleOrders: ExcelRow[] = [
  {
    key: 'sample-1',
    supplier: 'Acme Inc',
    poNumber: 'ORD-001',
    status: 'Open',
    itemNo: 'ITEM-001',
    dueDate: new Date('2023-06-15'),
    description: 'Office supplies',
    orderQty: 100,
    receivedQty: 0,
    confirmed: false,
  },
  {
    key: 'sample-2',
    supplier: 'Acme Inc',
    poNumber: 'ORD-002',
    status: 'Open',
    itemNo: 'ITEM-002',
    dueDate: new Date('2023-06-20'),
    description: 'Furniture',
    orderQty: 50,
    receivedQty: 0,
    confirmed: false,
  },
];

// Example function to insert orders
async function insertSampleOrders() {
  console.log('Inserting sample orders...');

  // Insert individual order
  const id1 = databaseService.insertOrUpdateOrder(sampleOrders[0]);
  console.log(`Inserted order with ID: ${id1}`);

  // Insert multiple orders
  const count = databaseService.upsertOrders(sampleOrders);
  console.log(`Inserted/updated ${count} orders`);

  // Get all orders for a supplier
  const acmeOrders = databaseService.getOrdersBySupplier('Acme Inc');
  console.log(`Found ${acmeOrders.length} orders for Acme Inc:`);
  console.log(acmeOrders);

  // Get all outstanding orders
  const outstandingOrders = databaseService.getOutstandingOrders('Acme Inc');
  console.log(`Found ${outstandingOrders.length} outstanding orders for Acme Inc`);

  // Get orders due within 30 days
  const upcomingOrders = databaseService.getOrdersDueWithinDays(30);
  console.log(`Found ${upcomingOrders.length} orders due within 30 days`);

  // Mark an order as confirmed
  const confirmed = databaseService.markOrderAsConfirmed('Acme Inc', 'ORD-001');
  console.log(`Order ORD-001 confirmed: ${confirmed}`);

  // Record email sent for an order
  const emailSent = databaseService.recordEmailSent([id1]);
  console.log(`Email sent recorded for ${emailSent} orders`);
}

// ---------------------------------------------------------------------------
// Renderer process example (in Electron renderer)
// ---------------------------------------------------------------------------

// In the renderer, we would use the API we defined in src/renderer/api/database.ts

import { databaseAPI } from '../renderer/api/database';

// Example usage of the database API
async function exampleUsage() {
  try {
    // Insert a new order
    const order1 = {
      key: 'order-1',
      supplier: 'Test Supplier',
      poNumber: 'ORD-001',
      status: 'Open',
      itemNo: 'ITEM-001',
      orderQty: 100,
      receivedQty: 0,
      dueDate: new Date('2024-01-15'),
      description: 'Test product',
    };

    const order2 = {
      key: 'order-2',
      supplier: 'Test Supplier',
      poNumber: 'ORD-002',
      status: 'Open',
      itemNo: 'ITEM-002',
      orderQty: 50,
      receivedQty: 25,
      dueDate: new Date('2024-01-20'),
      description: 'Another test product',
    };

    // Insert orders
    const id1 = await databaseAPI.insertOrUpdateOrder(order1);
    const id2 = await databaseAPI.insertOrUpdateOrder(order2);

    console.log('Inserted orders with IDs:', id1, id2);

    // Get orders by supplier
    const supplierOrders = await databaseAPI.getOrdersBySupplier('Test Supplier');
    console.log('Orders for Test Supplier:', supplierOrders);

    // Get all orders
    const allOrders = await databaseAPI.getAllOrders();
    console.log('All orders:', allOrders);

    // Get orders due within 30 days
    const dueOrders = await databaseAPI.getOrdersDueWithinDays(30);
    console.log('Orders due within 30 days:', dueOrders);

    // Mark an order as confirmed
    const confirmed = await databaseAPI.markOrderAsConfirmed('Test Supplier', 'ORD-001');
    console.log('Order confirmed:', confirmed);

    // Delete an order
    const deleted = await databaseAPI.deleteOrder('Test Supplier', 'ORD-002');
    console.log('Order deleted:', deleted);
  } catch (error) {
    console.error('Database operation failed:', error);
  }
}

// Export the example functions
export { exampleUsage, insertSampleOrders };
