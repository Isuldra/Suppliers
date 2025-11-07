import React, { useState } from "react";

interface TopItem {
  itemNo: string;
  description: string;
  productName: string;
  totalOutstandingQty: number;
  orderCount: number;
  supplierCount: number;
}

interface TopItemsTableProps {
  data: TopItem[];
  loading?: boolean;
}

export const TopItemsTable: React.FC<TopItemsTableProps> = ({
  data,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof TopItem>(
    "totalOutstandingQty"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <h3 className="text-lg font-bold text-neutral mb-4">
          Varenummer i rest
        </h3>
        <p className="text-neutral-secondary">
          Ingen varenummer funnet. Last inn BP-arket for å se data.
        </p>
      </div>
    );
  }

  // Filter data based on search term
  const filteredData = data.filter(
    (item) =>
      item.itemNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const handleSort = (field: keyof TopItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral">Varenummer i rest</h3>
          <p className="text-xs text-neutral-secondary mt-1">
            Topp {data.length} artikler sortert etter antall i rest
          </p>
        </div>
        <input
          type="text"
          placeholder="Søk på artikkel eller produktnavn..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 border border-neutral-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-light">
              <th
                className="text-left py-3 px-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("itemNo")}
              >
                Artikkel Nr.{" "}
                {sortField === "itemNo" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="text-left py-3 px-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("productName")}
              >
                Produktnavn{" "}
                {sortField === "productName" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("totalOutstandingQty")}
              >
                Totalt i rest{" "}
                {sortField === "totalOutstandingQty" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("orderCount")}
              >
                Antall linjer{" "}
                {sortField === "orderCount" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="text-right py-3 px-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("supplierCount")}
              >
                Leverandører{" "}
                {sortField === "supplierCount" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr
                key={item.itemNo}
                className={`border-b border-neutral-light/50 hover:bg-blue-50 transition-colors ${
                  index % 2 === 0 ? "bg-white/30" : "bg-white/10"
                }`}
              >
                <td className="py-3 px-2 font-mono text-xs">{item.itemNo}</td>
                <td className="py-3 px-2">
                  <div className="font-medium">{item.productName}</div>
                  {item.productName !== item.description && (
                    <div className="text-xs text-neutral-secondary mt-0.5">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 text-right font-semibold">
                  {item.totalOutstandingQty.toLocaleString("nb-NO")}
                </td>
                <td className="py-3 px-2 text-right">
                  {item.orderCount.toLocaleString("nb-NO")}
                </td>
                <td className="py-3 px-2 text-right">{item.supplierCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-light/50">
        <div className="flex items-center justify-between text-sm text-neutral-secondary">
          <span>
            {searchTerm ? (
              <>
                Viser{" "}
                <strong className="text-neutral">{sortedData.length}</strong> av{" "}
                <strong className="text-neutral">{data.length}</strong> artikler
              </>
            ) : (
              <>
                Viser <strong className="text-neutral">{data.length}</strong>{" "}
                artikler
              </>
            )}
          </span>
          {searchTerm && sortedData.length === 0 && (
            <span className="text-orange-600">
              Ingen treff for &quot;{searchTerm}&quot;
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
