// components/SearchFilter.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
} from "lucide-react";

const SearchFilter = ({
  data = [],
  onFilteredDataChange,
  searchFields = ["name"],
  filterConfig = [],
  sortConfig = [],
  placeholder = "Search...",
  dateField = null, // e.g., "date", "createdAt", "expiration"
  enableDateFilter = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Helper function to get nested values
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((acc, part) => {
      if (acc == null) return undefined;
      return acc[part];
    }, obj);
  };

  // Get current filter configuration based on sort field
  const getCurrentFilterConfig = () => {
    if (!sortBy) {
      return filterConfig[0]; // Default to first filter config
    }

    // Find matching filter config for the current sort field
    const matchingConfig = filterConfig.find((config) => config.key === sortBy);
    return matchingConfig || filterConfig[0];
  };

  const currentFilterConfig = getCurrentFilterConfig();

  // Apply search, filters, and sorting
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search
    if (searchTerm) {
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = getNestedValue(item, field);
          return value
            ?.toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        }),
      );
    }

    // Apply date range filter
    if (enableDateFilter && dateField && (dateRange.start || dateRange.end)) {
      result = result.filter((item) => {
        const itemDate = new Date(getNestedValue(item, dateField));
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        // Set end date to end of day for inclusive filtering
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
        }

        if (startDate && endDate) {
          return itemDate >= startDate && itemDate <= endDate;
        } else if (startDate) {
          return itemDate >= startDate;
        } else if (endDate) {
          return itemDate <= endDate;
        }
        return true;
      });
    }

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key];
      if (filterValue && filterValue !== "all") {
        result = result.filter((item) => {
          const value = getNestedValue(item, key);

          // Special handling for stock status
          if (key === "stockStatus") {
            const quantity = item.quantity;
            const alertLevel = item.alert;
            let status = "In Stock";
            if (quantity === 0) status = "No Stock";
            else if (quantity <= alertLevel) status = "Low Stock";
            return status === filterValue;
          }

          return value?.toString().toLowerCase() === filterValue.toLowerCase();
        });
      }
    });

    // Apply sorting
    if (sortBy) {
      result = [...result].sort((a, b) => {
        let aValue = getNestedValue(a, sortBy);
        let bValue = getNestedValue(b, sortBy);

        // Special handling for dates
        if (
          sortBy === "expiration" ||
          sortBy === "date" ||
          sortBy === "createdAt"
        ) {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        }

        // Special handling for stock status
        if (sortBy === "stockStatus") {
          const aQuantity = a.quantity;
          const aAlert = a.alert;
          const bQuantity = b.quantity;
          const bAlert = b.alert;

          // Define order: No Stock (0), Low Stock (1), In Stock (2)
          const getStatusValue = (quantity, alert) => {
            if (quantity === 0) return 0;
            if (quantity <= alert) return 1;
            return 2;
          };

          aValue = getStatusValue(aQuantity, aAlert);
          bValue = getStatusValue(bQuantity, bAlert);
        }

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    data,
    searchTerm,
    filters,
    sortBy,
    sortOrder,
    searchFields,
    dateRange,
    enableDateFilter,
    dateField,
  ]);

  // Use useEffect to call the callback after render
  useEffect(() => {
    onFilteredDataChange?.(filteredData);
  }, [filteredData, onFilteredDataChange]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      // If clicking the same sort field, toggle order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // If selecting a new sort field, set it and default to ascending
      setSortBy(field);
      setSortOrder("asc");
      // Clear filters when changing sort field
      setFilters({});
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const clearAll = () => {
    setFilters({});
    setSearchTerm("");
    setSortBy("");
    setSortOrder("asc");
    setDateRange({ start: "", end: "" });
  };

  const clearDateRange = () => {
    setDateRange({ start: "", end: "" });
  };

  const hasActiveFilters =
    searchTerm ||
    Object.values(filters).some((filter) => filter && filter !== "all") ||
    sortBy ||
    (enableDateFilter && (dateRange.start || dateRange.end));

  const activeFilterCount =
    Object.values(filters).filter((f) => f && f !== "all").length +
    (searchTerm ? 1 : 0) +
    (sortBy ? 1 : 0) +
    (enableDateFilter && (dateRange.start || dateRange.end) ? 1 : 0);

  // Build readable labels for active filters
  const getFilterLabel = (key, value) => {
    // Find matching filter config
    const cfg = filterConfig.find((c) => c.key === key);
    if (cfg && Array.isArray(cfg.options)) {
      const opt = cfg.options.find(
        (o) => o.value?.toString() === value?.toString(),
      );
      if (opt) return opt.label;
    }
    return value;
  };

  const activeFilterEntries = Object.entries(filters)
    .filter(([k, v]) => v && v !== "all")
    .map(([k, v]) => ({ key: k, label: getFilterLabel(k, v) }));

  return (
    <div className="mb-4 space-y-3">
      {/* Main Search and Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-no-uppercase="true"
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 w-full lg:w-auto flex-wrap items-center">
          {/* Sort Dropdown with Order Toggle */}
          {sortConfig.length > 0 && (
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="text-gray-500 w-3.5 h-3.5" />
              <select
                value={sortBy || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSortChange(e.target.value);
                  } else {
                    setSortBy("");
                    setSortOrder("asc");
                    setFilters({});
                  }
                }}
                className="px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm min-w-[130px]"
              >
                <option value="">Sort by</option>
                {sortConfig.map((sort) => (
                  <option key={sort.key} value={sort.key}>
                    {sort.label}
                  </option>
                ))}
              </select>

              {/* Sort Order Toggle Button */}
              {sortBy && (
                <button
                  onClick={toggleSortOrder}
                  className="px-2.5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white transition-colors"
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-gray-700" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-gray-700" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Dynamic Filter Dropdown based on Sort Field */}
          {/* Hide filter for fields that don't need categorical filtering */}
          {filterConfig.length > 0 &&
            currentFilterConfig &&
            sortBy !== "price" &&
            sortBy !== "productName" &&
            sortBy !== "name" &&
            sortBy !== "quantity" &&
            sortBy !== "alert" &&
            sortBy !== "expiration" &&
            sortBy !== "createdAt" &&
            sortBy !== "totalWaste" &&
            sortBy !== "date" &&
            sortBy !== "batchNumber" &&
            sortBy !== "totalAmount" &&
            sortBy !== "cashier" &&
            sortBy !== "totalSales" &&
            sortBy !== "" && (
              <div className="flex items-center gap-1.5">
                <Filter className="text-gray-500 w-3.5 h-3.5" />
                <select
                  value={filters[currentFilterConfig.key] || ""}
                  onChange={(e) => {
                    handleFilterChange(currentFilterConfig.key, e.target.value);
                  }}
                  className="px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm min-w-[130px]"
                >
                  <option value="">Filter by</option>
                  {currentFilterConfig.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Date Range Filter - Inline with other controls */}
          {enableDateFilter && (
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
              <Calendar className="text-gray-500 w-3.5 h-3.5 flex-shrink-0" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                placeholder="From"
                className="text-sm border-none focus:outline-none focus:ring-0 bg-transparent w-[110px]"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                placeholder="To"
                className="text-sm border-none focus:outline-none focus:ring-0 bg-transparent w-[110px]"
              />
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={clearDateRange}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  title="Clear dates"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Clear Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-2.5 py-2 text-white hover:text-gray-800 transition-colors text-sm bg-red-500 rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-xs text-gray-600">
        Showing <span className="font-medium">{filteredData.length}</span> of{" "}
        <span className="font-medium">{data.length}</span> items
        {hasActiveFilters && (
          <span className="text-gray-400 ml-1.5">
            • {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
            applied
          </span>
        )}
        {sortBy && (
          <span className="text-gray-400 ml-1.5">
            • Sorted by {sortConfig.find((s) => s.key === sortBy)?.label} (
            {sortOrder === "asc" ? "Ascending" : "Descending"})
          </span>
        )}
        {activeFilterEntries.length > 0 && (
          <span className="text-gray-400 ml-1.5">
            • Filtered by: {activeFilterEntries.map((f) => f.label).join(", ")}
          </span>
        )}
        {enableDateFilter && (dateRange.start || dateRange.end) && (
          <span className="text-gray-400 ml-1.5">
            • Date:{" "}
            {dateRange.start &&
              new Date(dateRange.start).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            {dateRange.start && dateRange.end && " - "}
            {dateRange.end &&
              new Date(dateRange.end).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
          </span>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
