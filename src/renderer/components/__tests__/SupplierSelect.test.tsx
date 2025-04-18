import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import SupplierSelect from "../SupplierSelect";
import { ipcRenderer } from "electron";

describe("SupplierSelect", () => {
  const mockSuppliers = ["Supplier A", "Supplier B", "Supplier C"];

  beforeEach(() => {
    vi.clearAllMocks();
    (ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: mockSuppliers,
    });
  });

  it("renders loading state initially", () => {
    render(<SupplierSelect onSupplierSelected={vi.fn()} />);
    expect(screen.getByText("Laster leverandører...")).toBeInTheDocument();
  });

  it("loads and displays suppliers", async () => {
    render(<SupplierSelect onSupplierSelected={vi.fn()} />);

    await waitFor(() => {
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("getSuppliers");
    });

    mockSuppliers.forEach((supplier) => {
      expect(screen.getByText(supplier)).toBeInTheDocument();
    });
  });

  it("calls onSupplierSelected when a supplier is selected", async () => {
    const onSupplierSelected = vi.fn();
    render(<SupplierSelect onSupplierSelected={onSupplierSelected} />);

    await waitFor(() => {
      expect(ipcRenderer.invoke).toHaveBeenCalledWith("getSuppliers");
    });

    const supplierToSelect = mockSuppliers[0];
    fireEvent.click(screen.getByText(supplierToSelect));

    expect(onSupplierSelected).toHaveBeenCalledWith(supplierToSelect);
  });

  it("handles error state", async () => {
    (ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Failed to load suppliers",
    });

    render(<SupplierSelect onSupplierSelected={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText("Kunne ikke laste leverandører")
      ).toBeInTheDocument();
    });
  });
});
