/**
 * Example usage of the database API
 * This file shows how to use the database API from both the main process and renderer process
 */

// Main process example (in Electron main)
import { databaseService } from "../services/databaseService";
import { ExcelRow } from "../types/ExcelRow";

// Example data
const sampleOrders: ExcelRow[] = [
  {
    supplier: "Acme Inc",
    orderNumber: "ORD-001",
    orderDate: new Date("2023-05-15"),
    dueDate: new Date("2023-06-15"),
    description: "Office supplies",
    value: 1200.5,
    currency: "USD",
    confirmed: false,
  },
  {
    supplier: "Acme Inc",
    orderNumber: "ORD-002",
    orderDate: new Date("2023-05-20"),
    dueDate: new Date("2023-06-20"),
    description: "Furniture",
    value: 3500.75,
    currency: "USD",
    confirmed: false,
  },
];

// Example function to insert orders
async function insertSampleOrders() {
  console.log("Inserting sample orders...");

  // Insert individual order
  const id1 = databaseService.insertOrUpdateOrder(sampleOrders[0]);
  console.log(`Inserted order with ID: ${id1}`);

  // Insert multiple orders
  const count = databaseService.upsertOrders(sampleOrders);
  console.log(`Inserted/updated ${count} orders`);

  // Get all orders for a supplier
  const acmeOrders = databaseService.getOrdersBySupplier("Acme Inc");
  console.log(`Found ${acmeOrders.length} orders for Acme Inc:`);
  console.log(acmeOrders);

  // Get all outstanding orders
  const outstandingOrders = databaseService.getOutstandingOrders("Acme Inc");
  console.log(
    `Found ${outstandingOrders.length} outstanding orders for Acme Inc`
  );

  // Get orders due within 30 days
  const upcomingOrders = databaseService.getOrdersDueWithinDays(30);
  console.log(`Found ${upcomingOrders.length} orders due within 30 days`);

  // Mark an order as confirmed
  const confirmed = databaseService.markOrderAsConfirmed("Acme Inc", "ORD-001");
  console.log(`Order ORD-001 confirmed: ${confirmed}`);

  // Record email sent for an order
  const emailSent = databaseService.recordEmailSent([id1]);
  console.log(`Email sent recorded for ${emailSent} orders`);
}

// ---------------------------------------------------------------------------
// Renderer process example (in Electron renderer)
// ---------------------------------------------------------------------------

// In the renderer, we would use the API we defined in src/renderer/api/database.ts

/*
import { databaseAPI } from '../api/database';

// Example React component using the database API
function OrderList() {
  const [orders, setOrders] = useState<ExcelRow[]>([]);
  
  useEffect(() => {
    async function loadOrders() {
      try {
        const supplier = 'Acme Inc';
        const orders = await databaseAPI.getOrdersBySupplier(supplier);
        setOrders(orders);
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    }
    
    loadOrders();
  }, []);
  
  const handleMarkConfirmed = async (supplier: string, orderNumber: string | null) => {
    try {
      await databaseAPI.markOrderAsConfirmed(supplier, orderNumber);
      // Refresh orders
      const updatedOrders = await databaseAPI.getOrdersBySupplier('Acme Inc');
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error marking order as confirmed:', error);
    }
  };
  
  // Component render code...
}
*/

// Export the example function so it can be run
export { insertSampleOrders };
