import React, { useMemo, useState, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ExcelData, ExcelRow } from "../types/ExcelData";
// import knownSuppliersData from "../data/suppliers.json"; // Unused for now
import { DateFilterSettings } from "./DateFilter";

interface DataReviewProps {
  excelData?: ExcelData;
  selectedSupplier?: string;
  selectedWeekday?: string;
  onNext: () => void;
  onPrevious: () => void;
}

const columnHelper = createColumnHelper<ExcelRow>();

const DataReview: React.FC<DataReviewProps> = ({
  excelData,
  selectedSupplier,
  selectedWeekday,
  onNext,
  onPrevious,
}) => {
  // Enhanced sorting state to support multiple columns
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "status", desc: true }, // Primary sort by status
    { id: "dueDate", desc: false }, // Secondary sort by due date
    { id: "outstandingQty", desc: true }, // Tertiary sort by quantity
  ]);

  // Create a set of known suppliers for faster lookup
  // const knownSuppliers = useMemo(
  //   () => new Set(knownSuppliersData.knownSuppliers),
  //   []
  // );

  // State for pagination (currently unused but may be needed for future pagination)
  // const [pageIndex, setPageIndex] = useState(0);
  // const [pageSize, setPageSize] = useState(10);

  // State for filtering
  const [_dateFilterSettings /* _setDateFilterSettings */] =
    useState<DateFilterSettings | null>(null);

  // Helper to check if a string looks like an article number
  // const isArticleNumber = useMemo(
  //   () =>
  //     (str: string): boolean => {
  //       // Article numbers often contain dashes and digits
  //       return (
  //         /^\d{3}-[A-Z0-9]+$/.test(str) || // Format like 011-MC100
  //         str.startsWith("011-") || // Format specifically for ICU Medical
  //         /^\d{10,}$/.test(str)
  //       );
  //     },
  //   []
  // );

  // Date filtering function
  // const applyDateFilter = (data: ExcelRow[]) => {
  //   // If no filters are active (selectAll is true), return all data
  //   if (
  //     _dateFilterSettings?.selectAll ||
  //     _dateFilterSettings?.selectedValues.length === 0
  //   ) {
  //     return data;
  //   }

  //   return data.filter((row) => {
  //     const date = row.date;
  //     if (!(date instanceof Date) || isNaN(date.getTime())) {
  //       return false; // Skip rows without valid date
  //     }

  //     const year = date.getFullYear().toString();
  //     const month = date.toLocaleString("no-NO", { month: "long" });

  //     // Check if the year is selected
  //     if (_dateFilterSettings?.selectedValues.includes(year)) {
  //       return true;
  //     }

  //     // Check if the month is selected
  //     if (_dateFilterSettings?.selectedValues.includes(month)) {
  //       return true;
  //     }

  //     return false;
  //   });
  // };

  // Apply sorting based on dateFilterSettings.sortOrder
  // const applySortToData = (data: ExcelRow[]) => {
  //   if (!_dateFilterSettings?.sortOrder) return data;

  //   return [...data].sort((a, b) => {
  //     const dateA = a.date instanceof Date ? a.date.getTime() : 0;
  //     const dateB = b.date instanceof Date ? b.date.getTime() : 0;

  //     if (_dateFilterSettings?.sortOrder === "asc") {
  //       return dateA - dateB; // Oldest to newest
  //     } else {
  //       return dateB - dateA; // Newest to oldest
  //     }
  //   });
  // };

  // Add status computation
  const getOrderStatus = (row: ExcelRow): "critical" | "overdue" | "normal" => {
    // Directly use the pre-parsed dueDate from databaseService
    const dueDate = row.dueDate; // Should be Date | undefined

    // Handle cases where dueDate is missing or invalid
    if (!dueDate || !(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      // Decide how to handle missing/invalid dates - maybe 'normal' or a specific status?
      // Returning 'normal' might be safest default to avoid incorrect 'overdue'
      return "normal"; // Or potentially a new status like 'unknown'
    }

    const today = new Date();
    // Set hours to 0 to compare dates only, avoiding time-of-day issues
    today.setHours(0, 0, 0, 0);
    const dueDateStartOfDay = new Date(dueDate);
    dueDateStartOfDay.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (dueDateStartOfDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 0) return "overdue"; // Due date was before today
    if (daysDiff < 7) return "critical"; // Due date is today or within the next 6 days
    return "normal"; // Due date is 7 or more days away
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<ExcelRow, any>[]>(
    () => [
      // Selection checkbox column
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-gray-300 text-primary focus:ring-primary"
            aria-label="Velg alle rader"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-gray-300 text-primary focus:ring-primary"
            aria-label={`Velg rad ${row.original.poNumber}`}
          />
        ),
        size: 50,
      }),

      // Status column (new)
      columnHelper.accessor((row) => getOrderStatus(row), {
        id: "status",
        header: "Status",
        size: 100,
        cell: (info) => (
          <div
            className={`px-2 py-1 rounded text-center ${
              info.getValue() === "critical"
                ? "bg-red-100 text-red-800"
                : info.getValue() === "overdue"
                ? "bg-orange-100 text-orange-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {info.getValue() === "critical"
              ? "Kritisk"
              : info.getValue() === "overdue"
              ? "Forfalt"
              : "Normal"}
          </div>
        ),
      }),

      // Due Date column (enhanced)
      columnHelper.accessor((row) => row.dueDate, {
        id: "dueDate",
        header: "Forfallsdato",
        size: 120,
        cell: (info) => {
          const date = info.getValue();
          return date instanceof Date && !isNaN(date.getTime())
            ? date.toLocaleDateString("no-NO")
            : "-";
        },
      }),

      columnHelper.accessor("poNumber", {
        header: "PO-nummer",
        size: 100,
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("itemNo", {
        header: "OneMed varenummer",
        cell: (info) => info.getValue() || "-",
        size: 120,
      }),
      columnHelper.accessor("description", {
        header: "Leverandørs artikkelnummer",
        cell: (info) => info.getValue() || "-",
        size: 150,
      }),
      columnHelper.accessor("specification", {
        header: "Kommentar",
        cell: (info) => info.getValue() || "-",
        size: 150,
      }),
      columnHelper.accessor("orderQty", {
        header: "Ordre antall",
        size: 100,
        cell: (info) => (
          <div className="text-right font-medium">
            {info.getValue() ? info.getValue().toLocaleString() : "0"}
          </div>
        ),
      }),
      columnHelper.accessor("receivedQty", {
        header: "Mottatt antall",
        size: 100,
        cell: (info) => (
          <div className="text-right font-medium">
            {info.getValue() ? info.getValue().toLocaleString() : "0"}
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.orderQty - row.receivedQty, {
        id: "outstandingQty",
        header: "Utestående",
        size: 100,
        cell: (info) => (
          <div
            className={`text-right font-medium ${
              Number(info.getValue()) > 0 ? "text-accent font-bold" : ""
            }`}
          >
            {info.getValue() ? info.getValue().toLocaleString() : "0"}
          </div>
        ),
      }),
      columnHelper.accessor("key", {
        header: "Nøkkel",
        size: 150,
        cell: (info) => (
          <div className="truncate max-w-[150px]" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
    ],
    [_dateFilterSettings]
  );

  // Rows to render: fetch directly from SQLite via IPC
  const [rowsToRender, setRowsToRender] = useState<ExcelRow[]>([]);
  // const [isLoading, setIsLoading] = useState(true); // Currently unused
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  // Initialize all rows as selected by default
  useEffect(() => {
    if (rowsToRender.length > 0) {
      const initialSelection: Record<string, boolean> = {};
      rowsToRender.forEach((_, index) => {
        initialSelection[index.toString()] = true; // Select all by default
      });
      setRowSelection(initialSelection);
    }
  }, [rowsToRender]);

  useEffect(() => {
    void (async () => {
      try {
        // IPC returns an object { success: boolean, data?: ExcelRow[], error?: string }
        const response = await window.electron.getOutstandingOrders(
          selectedSupplier || ""
        );
        if (response.success && response.data) {
          setRowsToRender(response.data as ExcelRow[]);
        } else {
          console.error(
            "Failed to fetch outstanding orders or no data returned:",
            response.error || "No data"
          );
          setRowsToRender([]);
        }
      } catch (error) {
        console.error("Failed to fetch outstanding orders:", error);
        setRowsToRender([]);
      }
    })();
  }, [selectedSupplier]);

  // Table instance
  const table = useReactTable({
    data: rowsToRender,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      globalFilter,
      pagination,
      rowSelection,
    },
  });

  const totalItems = rowsToRender.length;
  const outstandingCount = rowsToRender.filter(
    (row) => row.orderQty - row.receivedQty > 0
  ).length;

  if (!excelData || !selectedSupplier) {
    return (
      <div className="p-6 bg-neutral-light border border-accent rounded-md shadow-sm">
        <p className="text-neutral">
          Ingen data tilgjengelig. Vennligst velg en leverandør først.
        </p>
        <button onClick={onPrevious} className="btn btn-secondary mt-4">
          Tilbake
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2
        className="text-xl font-bold mb-4 text-neutral"
        id="data-review-heading"
      >
        Gjennomgang av utestående ordre for {selectedSupplier}
      </h2>

      <div className="bg-neutral-white p-4 rounded-md shadow-sm mb-6 border border-neutral-light">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div>
            <p className="text-neutral">
              <span className="font-medium">Leverandør:</span>{" "}
              {selectedSupplier}
            </p>
            <p className="text-neutral mt-1">
              <span className="font-medium">Ukedag:</span> {selectedWeekday}
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <p className="text-neutral">
              <span className="font-medium">Totalt antall:</span>{" "}
              <span className="font-bold">{totalItems}</span>
            </p>
            <p className="text-neutral mt-1">
              <span className="font-medium">Utestående ordre:</span>{" "}
              <span className="font-bold text-accent">{outstandingCount}</span>
            </p>
            <p className="text-neutral mt-1">
              <span className="font-medium">Valgte for e-post:</span>{" "}
              <span className="font-bold text-primary">
                {Object.values(rowSelection).filter(Boolean).length}
              </span>
            </p>
          </div>
        </div>

        {/* Selection controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => table.toggleAllRowsSelected(true)}
            className="btn btn-sm btn-secondary"
          >
            Velg alle
          </button>
          <button
            onClick={() => table.toggleAllRowsSelected(false)}
            className="btn btn-sm btn-secondary"
          >
            Velg ingen
          </button>
          <button
            onClick={() => {
              // Select only rows with outstanding quantity > 0
              const newSelection: Record<string, boolean> = {};
              rowsToRender.forEach((row, index) => {
                newSelection[index.toString()] =
                  row.orderQty - row.receivedQty > 0;
              });
              setRowSelection(newSelection);
            }}
            className="btn btn-sm btn-secondary"
          >
            Velg kun utestående
          </button>
        </div>
      </div>

      <div className="overflow-hidden shadow-sm rounded-lg border border-neutral-light mb-6">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-neutral-light"
            aria-labelledby="data-review-heading"
            role="grid"
          >
            <thead className="bg-neutral-light">
              <tr>
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-neutral uppercase tracking-wider whitespace-nowrap"
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? "cursor-pointer select-none flex items-center"
                              : "",
                            onClick: header.column.getToggleSortingHandler(),
                            role: header.column.getCanSort()
                              ? "button"
                              : undefined,
                            "aria-label": header.column.getCanSort()
                              ? `Sort by ${header.column.columnDef.header}${
                                  header.column.getIsSorted()
                                    ? header.column.getIsSorted() === "asc"
                                      ? ", currently sorted ascending"
                                      : ", currently sorted descending"
                                    : ""
                                }`
                              : undefined,
                            tabIndex: header.column.getCanSort()
                              ? 0
                              : undefined,
                            onKeyDown: header.column.getCanSort()
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    header.column.getToggleSortingHandler()?.(
                                      e
                                    );
                                  }
                                }
                              : undefined,
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="ml-1">
                              {{
                                asc: " 🔼",
                                desc: " 🔽",
                              }[header.column.getIsSorted() as string] ?? " ⬍"}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="bg-neutral-white divide-y divide-neutral-light">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    className="px-3 py-4 text-center text-neutral"
                  >
                    Ingen data tilgjengelig
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-light transition-colors"
                    role="row"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2 whitespace-nowrap text-neutral"
                        role="gridcell"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between p-4 border border-neutral-light rounded-md bg-neutral-light">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral">Vis</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="form-control py-1 px-2 text-sm"
            aria-label="Antall rader per side"
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-neutral">per side</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 border border-neutral rounded-sm disabled:opacity-50 disabled:cursor-not-allowed text-neutral"
            aria-label="Gå til første side"
            aria-disabled={!table.getCanPreviousPage()}
          >
            {"<<"}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 border border-neutral rounded-sm disabled:opacity-50 disabled:cursor-not-allowed text-neutral"
            aria-label="Gå til forrige side"
            aria-disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </button>
          <span className="text-sm text-neutral">
            <span className="font-medium">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            av <span className="font-medium">{table.getPageCount()}</span>
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 border border-neutral rounded-sm disabled:opacity-50 disabled:cursor-not-allowed text-neutral"
            aria-label="Gå til neste side"
            aria-disabled={!table.getCanNextPage()}
          >
            {">"}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 border border-neutral rounded-sm disabled:opacity-50 disabled:cursor-not-allowed text-neutral"
            aria-label="Gå til siste side"
            aria-disabled={!table.getCanNextPage()}
          >
            {">>"}
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={onPrevious}
          className="btn btn-secondary"
          aria-label="Gå tilbake til leverandørvalg"
        >
          Tilbake
        </button>
        <button
          onClick={() => {
            // Get selected rows and pass them to the next step
            const selectedRows = rowsToRender.filter(
              (_, index) => rowSelection[index.toString()]
            );

            // Store selected rows in the excelData for the email step
            if (excelData) {
              excelData.bp = selectedRows;
            }

            onNext();
          }}
          className="btn btn-primary"
          aria-label="Gå videre til e-post"
          disabled={Object.values(rowSelection).filter(Boolean).length === 0}
        >
          Send e-post ({Object.values(rowSelection).filter(Boolean).length}{" "}
          valgte)
        </button>
      </div>
    </div>
  );
};

export default DataReview;
