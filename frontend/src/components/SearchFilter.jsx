// components/SearchFilter.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";

const SearchFilter = ({
  data = [],
  onFilteredDataChange,
  searchFields = ["name"],
  filterConfig = [],
  sortConfig = [],
  placeholder = "Search...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to get nested values
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((acc, part) => {
      if (acc == null) return undefined;
      return acc[part];
    }, obj);
  };

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
        })
      );
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
        if (sortBy === "expiration") {
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
  }, [data, searchTerm, filters, sortBy, sortOrder, searchFields]);

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
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearAll = () => {
    setFilters({});
    setSearchTerm("");
    setSortBy("");
    setSortOrder("asc");
  };

  const hasActiveFilters =
    searchTerm ||
    Object.values(filters).some((filter) => filter && filter !== "all") ||
    sortBy;

  const activeFilterCount =
    Object.values(filters).filter((f) => f && f !== "all").length +
    (searchTerm ? 1 : 0) +
    (sortBy ? 1 : 0);

  return (
    <div className="mb-6 space-y-4">
      {/* Main Search and Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 w-full lg:w-auto">
          {/* Filter & Sort Toggle */}
          {(filterConfig.length > 0 || sortConfig.length > 0) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all duration-200 font-medium ${
                showFilters || hasActiveFilters
                  ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters & Sort
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sort Panel - HORIZONTAL LAYOUT */}
      {showFilters && (filterConfig.length > 0 || sortConfig.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Sort Section */}
            {sortConfig.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Sort By:
                </span>
                <div className="flex flex-wrap gap-2">
                  {sortConfig.map((sort) => (
                    <button
                      key={sort.key}
                      onClick={() => handleSortChange(sort.key)}
                      className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs font-medium transition-all duration-200 ${
                        sortBy === sort.key
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      {sort.label}
                      {sortBy === sort.key && (
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortOrder === "desc" ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section */}
            {filterConfig.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Filter By:
                </span>
                <div className="flex flex-wrap gap-2">
                  {filterConfig.map((filter) => (
                    <select
                      key={filter.key}
                      value={filters[filter.key] || "all"}
                      onChange={(e) =>
                        handleFilterChange(filter.key, e.target.value)
                      }
                      className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-colors duration-200 min-w-[120px]"
                    >
                      <option value="all">{filter.label}</option>
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active sorting info */}
          {sortBy && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              Currently sorted by:{" "}
              {sortConfig.find((s) => s.key === sortBy)?.label}
              <span className="text-gray-500 ml-1">
                ({sortOrder === "asc" ? "ascending" : "descending"})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {filteredData.length}
          </span>{" "}
          of <span className="font-medium text-gray-900">{data.length}</span>{" "}
          items
          {hasActiveFilters && (
            <span className="text-blue-600 font-medium ml-2">
              • {activeFilterCount} active filter
              {activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {sortBy && (
          <div className="text-sm text-gray-500">
            Sorted by{" "}
            <span className="font-medium text-gray-700">
              {sortConfig.find((s) => s.key === sortBy)?.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
