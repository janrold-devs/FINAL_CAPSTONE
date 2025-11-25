import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Eye, Plus, Receipt, Calendar, ChevronDown } from "lucide-react";
import TransactionModal from "../../components/modals/TransactionModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [timePeriod, setTimePeriod] = useState("daily"); // Default to 'daily'
  const [comparisonData, setComparisonData] = useState({
    current: [],
    previous: [],
    currentCount: 0,
    previousCount: 0,
    currentTotal: 0,
    previousTotal: 0,
  });
  const [dateRange, setDateRange] = useState({
    currentStart: null,
    currentEnd: null,
    previousStart: null,
    previousEnd: null,
  });

  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/transactions");
        setTransactions(res.data);
        // Don't filter here yet - wait for the next effect
      } catch {
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply daily filter after transactions are loaded and timePeriod is set
  useEffect(() => {
    if (transactions.length > 0 && timePeriod === "daily") {
      filterByTimePeriod("daily");
    }
  }, [transactions, timePeriod]);

  // Format date for display with null checking
  const formatDateRange = (start, end) => {
    if (!start || !end) {
      return "Loading...";
    }

    const format = (date) => {
      return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };
    return `${format(start)} - ${format(end)}`;
  };

  // Filter transactions by time period
  const filterByTimePeriod = (period) => {
    if (!period) {
      setFilteredTransactions(transactions);
      setComparisonData({
        current: [],
        previous: [],
        currentCount: 0,
        previousCount: 0,
        currentTotal: 0,
        previousTotal: 0,
      });
      setDateRange({
        currentStart: null,
        currentEnd: null,
        previousStart: null,
        previousEnd: null,
      });
      return;
    }

    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    switch (period) {
      case "daily":
        // Today
        currentStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        currentEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );

        // Yesterday
        previousStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        previousEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;

      case "weekly":
        // This week (Monday to Sunday)
        const currentDay = now.getDay();
        const currentMonday = new Date(now);
        currentMonday.setDate(
          now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
        );
        currentStart = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate()
        );
        currentEnd = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate() + 7
        );

        // Last week
        const previousMonday = new Date(currentMonday);
        previousMonday.setDate(currentMonday.getDate() - 7);
        previousStart = new Date(
          previousMonday.getFullYear(),
          previousMonday.getMonth(),
          previousMonday.getDate()
        );
        previousEnd = new Date(
          previousMonday.getFullYear(),
          previousMonday.getMonth(),
          previousMonday.getDate() + 7
        );
        break;

      case "monthly":
        // This month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // Last month
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      default:
        return;
    }

    const currentPeriodTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transactionDate);
      return transactionDate >= currentStart && transactionDate < currentEnd;
    });

    const previousPeriodTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.transactionDate);
      return transactionDate >= previousStart && transactionDate < previousEnd;
    });

    const currentCount = currentPeriodTransactions.length;
    const previousCount = previousPeriodTransactions.length;
    const currentTotal = currentPeriodTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );
    const previousTotal = previousPeriodTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    setComparisonData({
      current: currentPeriodTransactions,
      previous: previousPeriodTransactions,
      currentCount,
      previousCount,
      currentTotal,
      previousTotal,
    });

    setDateRange({
      currentStart,
      currentEnd: new Date(currentEnd.getTime() - 1), // Subtract 1ms to show inclusive end date
      previousStart,
      previousEnd: new Date(previousEnd.getTime() - 1),
    });

    setFilteredTransactions(currentPeriodTransactions);
  };

  // Handle time period button click
  const handleTimePeriodClick = (period) => {
    if (timePeriod === period) {
      // Deselect if same button clicked again
      setTimePeriod(null);
      filterByTimePeriod(null);
    } else {
      setTimePeriod(period);
      filterByTimePeriod(period);
    }
  };

  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const countChangePercentage = calculateChange(
    comparisonData.currentCount,
    comparisonData.previousCount
  );
  const totalChangePercentage = calculateChange(
    comparisonData.currentTotal,
    comparisonData.previousTotal
  );

  // Filter configuration for transactions
  const transactionFilterConfig = [
    {
      key: "modeOfPayment",
      label: "Payment Method",
      options: [
        { value: "cash", label: "Cash" },
        { value: "gcash", label: "Gcash" },
      ],
    },
    {
      key: "cashier._id",
      label: "Cashier",
      options: [], // This will be populated dynamically from transactions
    },
  ];

  // Get unique cashiers from transactions
  const getUniqueCashiers = () => {
    const cashiers = transactions
      .filter((t) => t.cashier)
      .map((t) => ({
        value: t.cashier._id,
        label: `${t.cashier.firstName} ${t.cashier.lastName}`,
      }));

    // Remove duplicates
    return Array.from(
      new Map(cashiers.map((item) => [item.value, item])).values()
    );
  };

  // Update cashier options when transactions load
  useEffect(() => {
    if (transactions.length > 0) {
      const cashierOptions = getUniqueCashiers();
      transactionFilterConfig[1].options = cashierOptions;
    }
  }, [transactions]);

  // Sort configuration for transactions
  const transactionSortConfig = [
    { key: "totalAmount", label: "Total Amount" },
    { key: "modeOfPayment", label: "Payment Method" },
  ];

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get payment method color
  const getPaymentColor = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return "bg-green-100 text-green-800 border-green-200";
      case "gcash":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get amount color based on value
  const getAmountColor = (amount) => {
    if (amount > 1000) return "text-green-600";
    if (amount > 500) return "text-blue-600";
    return "text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Transaction Records
            </h1>
            <p className="text-gray-600">
              View Transaction Records and Comparison
            </p>
          </div>
        </div>

        {/* Time Period Filter Buttons */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Time Period:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTimePeriodClick("daily")}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                  timePeriod === "daily"
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Daily Comparison
              </button>
              <button
                onClick={() => handleTimePeriodClick("weekly")}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                  timePeriod === "weekly"
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Weekly Comparison
              </button>
              <button
                onClick={() => handleTimePeriodClick("monthly")}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                  timePeriod === "monthly"
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Monthly Comparison
              </button>
            </div>
          </div>

          {/* Comparison Cards */}
          {timePeriod && (
            <div className="mt-6 space-y-4">
              {/* Date Range Display */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                <span>Comparison Periods:</span>
                <div className="flex items-center gap-4">
                  <span>
                    Current:{" "}
                    {formatDateRange(
                      dateRange.currentStart,
                      dateRange.currentEnd
                    )}
                  </span>
                  <span>
                    Previous:{" "}
                    {formatDateRange(
                      dateRange.previousStart,
                      dateRange.previousEnd
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transactions Count Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">
                      Transactions
                    </h3>
                    <div
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        countChangePercentage >= 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {countChangePercentage >= 0 ? "+" : ""}
                      {countChangePercentage.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-gray-900">
                        {comparisonData.currentCount}
                      </div>
                      <div className="text-sm text-gray-600">
                        Current {timePeriod}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-700">
                        {comparisonData.previousCount}
                      </div>
                      <div className="text-sm text-gray-500">
                        Previous {timePeriod}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Comparison */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">Revenue</h3>
                    <div
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        totalChangePercentage >= 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {totalChangePercentage >= 0 ? "+" : ""}
                      {totalChangePercentage.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-gray-900">
                        ₱{comparisonData.currentTotal.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Current {timePeriod}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-700">
                        ₱{comparisonData.previousTotal.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Previous {timePeriod}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div>
          <ExportButtons
            data={filteredTransactions || transactions}
            fileName="Transactions"
            columns={[
              { key: "transactionDate", label: "Date" },
              { key: "cashier.firstName", label: "Cashier" },
              { key: "modeOfPayment", label: "Payment" },
              { key: "referenceNumber", label: "Reference Number" },
              { key: "totalAmount", label: "Total Amount" },
            ]}
          />
        </div>

        {/* Search & Filter Section with Date Picker */}
        <SearchFilter
          data={timePeriod ? comparisonData.current : transactions}
          onFilteredDataChange={setFilteredTransactions}
          searchFields={[
            "cashier.firstName",
            "cashier.lastName",
            "referenceNumber",
            "modeOfPayment",
          ]}
          filterConfig={transactionFilterConfig}
          sortConfig={transactionSortConfig}
          placeholder="Search by cashier name, reference number, or payment method..."
          dateField="transactionDate"
          enableDateFilter={true}
        />

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Cashier
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Reference #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => (
                      <tr
                        key={t._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(t.transactionDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(t.transactionDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-sm font-medium">
                                {t.cashier?.firstName?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {t.cashier
                                  ? `${t.cashier.firstName} ${t.cashier.lastName}`
                                  : "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                Cashier
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPaymentColor(
                              t.modeOfPayment
                            )}`}
                          >
                            {t.modeOfPayment}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 font-mono">
                            {t.referenceNumber ? (
                              <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {t.referenceNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`text-lg font-bold ${getAmountColor(
                              t.totalAmount
                            )}`}
                          >
                            ₱{t.totalAmount?.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                            onClick={() => setSelected(t)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Receipt className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-2">
                              {timePeriod === "daily" && loading
                                ? "Loading transactions..."
                                : "No transactions found"}
                            </p>
                            <p className="text-gray-600">
                              {timePeriod
                                ? `No transactions found for the current ${timePeriod} period`
                                : "Try adjusting your search or date filters"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        <TransactionModal
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
