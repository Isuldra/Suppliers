import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export interface DateFilterSettings {
  selectAll: boolean;
  selectedValues: string[]; // Years and months that are selected
  searchText: string; // For searching in the filter list
  sortOrder: 'asc' | 'desc' | null;
  isActive: boolean; // Whether the filter is currently active
}

interface DateFilterProps {
  _columnId: string;
  data: unknown[];
  dateFilterSettings: DateFilterSettings;
  setDateFilterSettings: React.Dispatch<React.SetStateAction<DateFilterSettings>>;
  onApplyFilter: () => void;
  getDateValue: (row: unknown) => Date | null;
}

const DateFilter: React.FC<DateFilterProps> = ({
  _columnId,
  data,
  dateFilterSettings,
  setDateFilterSettings,
  onApplyFilter,
  getDateValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uniqueYears, setUniqueYears] = useState<string[]>([]);
  const [uniqueMonths, setUniqueMonths] = useState<string[]>([]);
  const [displayedItems, setDisplayedItems] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract unique years and months from data
  useEffect(() => {
    if (data && data.length > 0) {
      const years = new Set<string>();
      const months = new Set<string>();

      data.forEach((row) => {
        const date = getDateValue(row);
        if (date instanceof Date && !isNaN(date.getTime())) {
          years.add(date.getFullYear().toString());
          months.add(date.toLocaleString('no-NO', { month: 'long' }));
        }
      });

      setUniqueYears(Array.from(years).sort((a, b) => Number(b) - Number(a))); // Newest first
      setUniqueMonths(Array.from(months).sort());
    }
  }, [data]);

  // Update displayed items when search or data changes
  useEffect(() => {
    let items = [...uniqueYears, ...uniqueMonths];

    if (dateFilterSettings.searchText) {
      const searchLower = dateFilterSettings.searchText.toLowerCase();
      items = items.filter((item) => item.toLowerCase().includes(searchLower));
    }

    setDisplayedItems(items);
  }, [uniqueYears, uniqueMonths, dateFilterSettings.searchText]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSortChange = (order: 'asc' | 'desc') => {
    setDateFilterSettings((prev) => ({
      ...prev,
      sortOrder: order,
      isActive: true,
    }));
    setIsOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
    setDateFilterSettings((prev) => ({
      ...prev,
      selectAll: checked,
      selectedValues: checked ? [...uniqueYears, ...uniqueMonths] : [],
    }));
  };

  const handleItemSelect = (value: string, checked: boolean) => {
    setDateFilterSettings((prev) => {
      const newSelectedValues = [...prev.selectedValues];

      if (checked) {
        newSelectedValues.push(value);
      } else {
        const index = newSelectedValues.indexOf(value);
        if (index !== -1) {
          newSelectedValues.splice(index, 1);
        }
      }

      return {
        ...prev,
        selectAll: false,
        selectedValues: newSelectedValues,
      };
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilterSettings((prev) => ({
      ...prev,
      searchText: e.target.value,
    }));
  };

  const handleApply = () => {
    onApplyFilter();
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setDateFilterSettings({
      selectAll: true,
      selectedValues: [],
      searchText: '',
      sortOrder: null,
      isActive: false,
    });
    onApplyFilter();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        className={`inline-flex items-center ${
          dateFilterSettings.isActive ? 'text-blue-600' : 'text-gray-500'
        } hover:text-blue-700 focus:outline-none`}
        onClick={toggleDropdown}
        aria-label="Filter dates"
      >
        <FunnelIcon className="h-4 w-4" />
      </button>

      {dateFilterSettings.isActive && (
        <button
          className="inline-flex items-center ml-1 text-blue-600 hover:text-blue-700 focus:outline-none"
          onClick={handleClearFilter}
          aria-label="Clear filter"
        >
          <XCircleIcon className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-2 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium">Filter</span>
              <div className="space-x-2">
                <button
                  className="text-gray-700 hover:text-blue-600"
                  onClick={() => handleSortChange('asc')}
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  className="text-gray-700 hover:text-blue-600"
                  onClick={() => handleSortChange('desc')}
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-2">
            <details>
              <summary className="cursor-pointer font-medium text-sm mb-1">Date Filters</summary>
              <div className="pl-2 mt-1 space-y-1 text-sm">
                <div className="flex items-center">
                  <button
                    className="text-gray-700 hover:text-blue-600 text-xs"
                    onClick={() => {
                      // Implementation for "Equals..." filter would go here
                    }}
                  >
                    Equals...
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    className="text-gray-700 hover:text-blue-600 text-xs"
                    onClick={() => {
                      // Implementation for "Before..." filter would go here
                    }}
                  >
                    Before...
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    className="text-gray-700 hover:text-blue-600 text-xs"
                    onClick={() => {
                      // Implementation for "After..." filter would go here
                    }}
                  >
                    After...
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    className="text-gray-700 hover:text-blue-600 text-xs"
                    onClick={() => {
                      // Implementation for "Between..." filter would go here
                    }}
                  >
                    Between...
                  </button>
                </div>
              </div>
            </details>
          </div>

          <div className="p-2 border-t border-gray-200">
            <input
              type="text"
              className="w-full p-1 text-sm border border-gray-300 rounded"
              placeholder="Search..."
              value={dateFilterSettings.searchText}
              onChange={handleSearchChange}
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-2 border-t border-gray-200">
            <div className="mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={dateFilterSettings.selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium">Select All</span>
              </label>
            </div>

            {displayedItems.length > 0 ? (
              <div className="space-y-1">
                {displayedItems.map((item) => (
                  <label key={item} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={
                        dateFilterSettings.selectAll ||
                        dateFilterSettings.selectedValues.includes(item)
                      }
                      onChange={(e) => handleItemSelect(item, e.target.checked)}
                      disabled={dateFilterSettings.selectAll}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No items match your search</div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 flex justify-end space-x-2">
            <button
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
