# Reporting

This document provides detailed information about the reporting functionality in Supplier Reminder Pro.

## Overview

The reporting feature allows users to generate, view, and export various reports related to supplier performance, order status, and communication history. These reports provide valuable insights for business decision-making and process improvement.

## Available Report Types

### Supplier Performance Reports

- **Supplier Overview**: Summary of all suppliers and their key metrics
- **Delivery Performance**: Analysis of on-time delivery percentage by supplier
- **Response Rate**: How quickly suppliers respond to communications
- **Order Volume**: Total order volume by supplier over time

### Order Status Reports

- **Outstanding Orders**: All orders that are not yet confirmed or delivered
- **Orders by Status**: Breakdown of orders by their current status
- **Orders by Due Date**: Orders grouped by due date proximity
- **Order History**: Historical record of all orders and status changes

### Communication Reports

- **Email Summary**: Overview of all email communications sent
- **Reminder Effectiveness**: Analysis of how reminder emails influence order confirmation
- **Communication Frequency**: Frequency of communications by supplier

## Report Generation

### Scheduling Options

Reports can be generated:

1. **On-Demand**: Generated manually when needed
2. **Scheduled**: Automatically generated on a schedule (daily, weekly, monthly)
3. **Event-Triggered**: Generated in response to specific events (e.g., order status changes)

### Filtering and Parameters

Reports can be customized with various filters:

- **Date Range**: Specify start and end dates for report data
- **Supplier Selection**: Include specific suppliers or supplier categories
- **Order Status**: Filter by specific order statuses
- **Value Range**: Filter by order value
- **Custom Filters**: User-defined criteria based on available fields

## Report Visualization

### Chart Types

The reporting system supports various visualization types:

- **Bar Charts**: For comparing categorical data
- **Line Charts**: For showing trends over time
- **Pie Charts**: For showing proportions
- **Tables**: For detailed data presentation
- **Scorecards**: For key performance indicators
- **Heat Maps**: For identifying patterns across multiple dimensions

### Interactivity

Reports include interactive elements:

- **Drill-down**: Click on summary data to see more detailed information
- **Sorting**: Change the sort order of data
- **Filtering**: Apply filters directly within the report view
- **Exporting**: Export the current view to various formats

## Export Formats

Reports can be exported in several formats:

- **PDF**: For formal documentation and printing
- **Excel (.xlsx)**: For further analysis in spreadsheet software
- **CSV**: For data portability and system integration
- **HTML**: For web viewing and sharing
- **Image (.png, .jpg)**: For quick sharing of visualizations

## Data Management

### Data Sources

Reports draw data from:

- **Local Database**: Orders, suppliers, and email history
- **Logs**: Application activity logs
- **User Inputs**: Custom parameters and configurations

### Caching

For performance optimization:

- Report data can be cached for quicker access
- Cache invalidation occurs when underlying data changes
- Historical reports are preserved even when data is updated

## Usage Examples

### Generating a Supplier Performance Report

```jsx
// React component example for generating a supplier performance report
const SupplierPerformanceReport = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 3),
    end: new Date(),
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);

      // Get performance data from database API
      const result = await databaseAPI.getSupplierPerformance(
        suppliers,
        dateRange.start,
        dateRange.end
      );

      if (result.success) {
        setReport(result.data);
      } else {
        toast.error("Could not generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Supplier Performance Report</h2>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <SupplierSelect value={suppliers} onChange={setSuppliers} isMulti />

      <button
        onClick={generateReport}
        disabled={loading || suppliers.length === 0}
      >
        {loading ? "Generating..." : "Generate Report"}
      </button>

      {report && (
        <ReportViewer data={report} exportOptions={["pdf", "excel", "csv"]} />
      )}
    </div>
  );
};
```

### Exporting a Report

```jsx
const exportReport = async (report, format) => {
  try {
    // Prepare the report data for export
    const exportData = {
      reportType: report.type,
      reportData: report.data,
      format: format,
      fileName: `${report.type}-${format(new Date(), "yyyy-MM-dd")}`,
    };

    // Call the export API
    const result = await window.electron.exportReport(exportData);

    if (result.success) {
      toast.success(`Report exported as ${format}`);
    } else {
      toast.error(`Export failed: ${result.error}`);
    }
  } catch (error) {
    console.error("Error exporting report:", error);
    toast.error("Could not export report");
  }
};
```

## Best Practices

1. **Regular Reporting**: Establish a regular schedule for reviewing key reports
2. **Targeted Analysis**: Focus on specific metrics that align with business goals
3. **Data Verification**: Periodically verify report accuracy with source data
4. **Iterative Refinement**: Refine report parameters based on insights gained
5. **Sharing Insights**: Share relevant reports with stakeholders for maximum impact

## Troubleshooting

Common issues and their solutions:

1. **Slow Report Generation**: Optimize filters or use scheduled reports
2. **Missing Data**: Check data sources and ensure all required data is available
3. **Inconsistent Results**: Verify data integrity and report parameters
4. **Export Failures**: Check file permissions and available disk space
5. **Visualization Issues**: Try different chart types or adjust data grouping

## Related Features

- [Excel Import](excel-import.md) - Importing data for reporting
- [Supplier Management](supplier-management.md) - Source data for supplier reports
- [Order Tracking](order-tracking.md) - Source data for order status reports
- [Email Reminders](email-reminders.md) - Source data for communication reports
