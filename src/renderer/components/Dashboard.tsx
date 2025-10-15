import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ExcelData, ValidationError } from "../types/ExcelData";
import onemedLogo from "../assets/onemed-logo.webp";

interface SupplierStat {
  name: string;
  outstandingOrders: number;
  outstandingQuantity: number;
}

interface DashboardStats {
  totalSuppliers: number;
  suppliersWithOutstandingOrders: number;
  totalOutstandingOrders: number;
  totalOutstandingQuantity: number;
  topSuppliers: SupplierStat[];
  ordersByWeekday: Array<{
    weekday: string;
    count: number;
  }>;
}

interface AppState {
  excelData?: ExcelData;
  selectedPlanner: string;
  selectedWeekday: string;
  selectedSupplier: string;
  validationErrors: ValidationError[];
  isLoading: boolean;
  showDataReview: boolean;
  showEmailButton: boolean;
  // Bulk mode state
  isBulkMode: boolean;
  selectedSuppliers: string[];
  bulkEmailData: Map<string, unknown>; // Per supplier email data
  bulkSelectedOrders: Map<string, Set<string>>; // Per supplier selected orders
  bulkSupplierEmails: Map<string, string>; // Per supplier custom emails
}

interface DashboardProps {
  appState: AppState;
  onDataParsed: (data: ExcelData) => void;
  onValidationErrors: (errors: ValidationError[]) => void;
  onWeekdaySelected: (weekday: string) => void;
  onSupplierSelected: (supplier: string) => void;
  onReviewComplete: () => void;
  onResetApp: () => void;
  // Bulk mode handlers
  onToggleBulkMode: () => void;
  onSuppliersSelected: (suppliers: string[]) => void;
  onBulkOrdersSelected: (supplier: string, orders: Set<string>) => void;
  onBulkSupplierEmailChange: (supplier: string, email: string) => void;
  onBulkComplete: () => void;
  onBulkDataReviewNext: (selectedOrders: Map<string, Set<string>>) => void;
  onBulkDataReviewBack: () => void;
  onBulkEmailPreviewBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ appState: _appState }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get suppliers with outstanding orders
      const suppliersResponse =
        await window.electron.getSuppliersWithOutstandingOrders();
      if (!suppliersResponse.success) {
        throw new Error(
          suppliersResponse.error || "Kunne ikke hente leverandørdata"
        );
      }

      const suppliersWithOrders = suppliersResponse.data || [];

      // Get outstanding orders for each supplier to calculate statistics
      const supplierStats: SupplierStat[] = await Promise.all(
        suppliersWithOrders.slice(0, 10).map(async (supplier: string) => {
          try {
            const ordersResponse = await window.electron.getOutstandingOrders(
              supplier
            );
            const orders = ordersResponse.data || [];

            return {
              name: supplier,
              outstandingOrders: orders.length,
              outstandingQuantity: orders.reduce(
                (sum: number, order: unknown) => {
                  const orderData = order as { outstandingQty?: number };
                  return sum + (orderData.outstandingQty || 0);
                },
                0
              ),
            };
          } catch (err) {
            console.error(`Error getting orders for ${supplier}:`, err);
            return {
              name: supplier,
              outstandingOrders: 0,
              outstandingQuantity: 0,
            };
          }
        })
      );

      // Filter suppliers with outstanding orders (should already be filtered, but double-check)
      const suppliersWithActualOrders = supplierStats.filter(
        (supplier) => supplier.outstandingQuantity > 0
      );

      // Sort by outstanding quantity
      const topSuppliers = supplierStats
        .sort(
          (a: SupplierStat, b: SupplierStat) =>
            b.outstandingQuantity - a.outstandingQuantity
        )
        .slice(0, 5);

      // Calculate totals
      const totalOutstandingQuantity = supplierStats.reduce(
        (sum: number, supplier: SupplierStat) =>
          sum + supplier.outstandingQuantity,
        0
      );
      const totalOutstandingOrders = supplierStats.reduce(
        (sum: number, supplier: SupplierStat) =>
          sum + supplier.outstandingOrders,
        0
      );

      // Mock data for orders by weekday (this would need to be implemented in the backend)
      const ordersByWeekday = [
        { weekday: "Mandag", count: Math.floor(Math.random() * 20) + 10 },
        { weekday: "Tirsdag", count: Math.floor(Math.random() * 20) + 10 },
        { weekday: "Onsdag", count: Math.floor(Math.random() * 20) + 10 },
        { weekday: "Torsdag", count: Math.floor(Math.random() * 20) + 10 },
        { weekday: "Fredag", count: Math.floor(Math.random() * 20) + 10 },
      ];

      setStats({
        totalSuppliers: suppliersWithOrders.length,
        suppliersWithOutstandingOrders: suppliersWithActualOrders.length,
        totalOutstandingOrders,
        totalOutstandingQuantity,
        topSuppliers,
        ordersByWeekday,
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-light">
        <div className="p-4 bg-primary text-neutral-white shadow-md">
          <div className="container-app flex items-center justify-between">
            <div>
              <img src={onemedLogo} alt="OneMed Logo" className="h-10" />
            </div>
            <div className="flex-grow text-center">
              <h1 className="text-2xl font-bold">
                OneMed SupplyChain - Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="btn btn-secondary text-sm">
                Tilbake til hovedside
              </Link>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 container-app mx-auto">
          <div className="bg-neutral-white p-6 rounded-md shadow-md">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-light">
        <div className="p-4 bg-primary text-neutral-white shadow-md">
          <div className="container-app flex items-center justify-between">
            <div>
              <img src={onemedLogo} alt="OneMed Logo" className="h-10" />
            </div>
            <div className="flex-grow text-center">
              <h1 className="text-2xl font-bold">
                OneMed SupplyChain - Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="btn btn-secondary text-sm">
                Tilbake til hovedside
              </Link>
              <div className="w-10"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 container-app mx-auto">
          <div className="bg-neutral-white p-6 rounded-md shadow-md">
            <div className="text-center">
              <h2 className="text-xl font-bold text-neutral mb-4">
                Feil ved lasting av dashboard
              </h2>
              <p className="text-neutral-secondary mb-4">{error}</p>
              <button onClick={loadDashboardData} className="btn btn-primary">
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      <div className="p-4 bg-primary text-neutral-white shadow-md">
        <div className="container-app flex items-center justify-between">
          <div>
            <img src={onemedLogo} alt="OneMed Logo" className="h-10" />
          </div>
          <div className="flex-grow text-center">
            <h1 className="text-2xl font-bold">
              OneMed SupplyChain - Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="btn btn-secondary text-sm">
              Tilbake til hovedside
            </Link>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 container-app mx-auto">
        <div className="bg-neutral-white p-6 rounded-md shadow-md">
          <h2 className="text-2xl font-bold text-neutral mb-6">Dashboard</h2>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-secondary">
                    Totalt leverandører
                  </p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.totalSuppliers || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-secondary">
                    Leverandører med åpne ordre
                  </p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.suppliersWithOutstandingOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-secondary">
                    Totalt åpne ordre
                  </p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.totalOutstandingOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-secondary">
                    Totalt restantall
                  </p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.totalOutstandingQuantity.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Suppliers Chart */}
            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-bold text-neutral mb-4">
                Topp 5 leverandører - Restantall
              </h3>
              <div className="space-y-4">
                {stats?.topSuppliers.map((supplier, index) => (
                  <div key={supplier.name} className="flex items-center">
                    <div className="w-8 h-8 bg-primary text-neutral-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-neutral">
                          {supplier.name}
                        </span>
                        <span className="text-neutral-secondary">
                          {supplier.outstandingQuantity.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-light rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (supplier.outstandingQuantity /
                                (stats?.topSuppliers[0]?.outstandingQuantity ||
                                  1)) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders by Weekday Chart */}
            <div className="bg-neutral-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-bold text-neutral mb-4">
                Ordre per ukedag
              </h3>
              <div className="space-y-4">
                {stats?.ordersByWeekday.map((item) => (
                  <div key={item.weekday} className="flex items-center">
                    <div className="w-20 text-sm font-medium text-neutral">
                      {item.weekday}
                    </div>
                    <div className="flex-1 ml-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-secondary">
                          {item.count} ordre
                        </span>
                      </div>
                      <div className="w-full bg-neutral-light rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(
                                  ...(stats?.ordersByWeekday.map(
                                    (w) => w.count
                                  ) || [1])
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
