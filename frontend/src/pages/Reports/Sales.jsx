// frontend/src/pages/Reports/Sales.jsx
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../api/axios";
import { Eye, RefreshCw, Receipt, TrendingUp, Calendar } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SalesModal from "../../components/modals/SalesModal";
import BestSellingModal from "../../components/modals/BestSellingModal";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBestSellingModal, setShowBestSellingModal] = useState(false);
  const [bestSellingData, setBestSellingData] = useState(null);
  const [bestSellingLoading, setBestSellingLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState(null);
  const [periodTotals, setPeriodTotals] = useState({
    daily: { total: 0, transactions: 0 },
    weekly: { total: 0, transactions: 0 },
    monthly: { total: 0, transactions: 0 },
  });

  const fetchSales = async () => {
    try {
      setLoading(true);

      // Fetch both sales summary AND today's transactions
      const [salesRes, transactionsRes] = await Promise.all([
        api.get("/sales/summary"),
        api.get("/transactions"),
      ]);

      const salesData = salesRes.data;
      const transactions = transactionsRes.data;

      console.log("Sales data loaded:", salesData.length, "batches");
      console.log("Transactions loaded:", transactions.length, "transactions");

      // Create a map of dates to sales batches for easier lookup
      const salesByDate = {};
      salesData.forEach((sale) => {
        const dateStr = new Date(sale.transactionDate).toDateString();
        salesByDate[dateStr] = sale;
      });

      // Group transactions by date to create today's batch if it doesn't exist
      const transactionsByDate = {};
      transactions.forEach((t) => {
        const dateStr = new Date(t.transactionDate).toDateString();
        if (!transactionsByDate[dateStr]) {
          transactionsByDate[dateStr] = {
            transactions: [],
            totalSales: 0,
          };
        }
        transactionsByDate[dateStr].transactions.push(t);
        transactionsByDate[dateStr].totalSales += t.totalAmount || 0;
      });

      // Check if we need to create a "today" batch
      const todayStr = new Date().toDateString();

      if (transactionsByDate[todayStr] && !salesByDate[todayStr]) {
        // Create a synthetic batch for today
        const todayBatch = {
          _id: `today-${Date.now()}`,
          batchNumber: `BATCH-${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}`,
          transactionDate: new Date().toISOString(),
          transactions: transactionsByDate[todayStr].transactions,
          totalSales: transactionsByDate[todayStr].totalSales,
          transactionsCount: transactionsByDate[todayStr].transactions.length,
          isTodayBatch: true, // Flag to identify synthetic batches
        };

        // Add today's batch to sales data
        salesData.unshift(todayBatch);
        console.log("Created today's batch:", todayBatch);
      }

      setSales(salesData);
      setFilteredSales(salesData);

      // Calculate period totals from transactions
      calculatePeriodTotalsFromTransactions(transactions);
    } catch (err) {
      console.error("Fetch sales error:", err);
      toast.error("Failed to fetch sales data");
      setSales([]);
      setFilteredSales([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for each period DIRECTLY from transactions
  const calculatePeriodTotalsFromTransactions = (transactions) => {
    const now = new Date();

    // Daily (Today)
    const dailyStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dailyEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    // Weekly (This week - Monday to Sunday)
    const currentDay = now.getDay();
    const currentMonday = new Date(now);
    currentMonday.setDate(
      now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
    );
    const weeklyStart = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate()
    );
    const weeklyEnd = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() + 7
    );

    // Monthly (This month)
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Filter transactions for each period
    const dailyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      return transactionDate >= dailyStart && transactionDate < dailyEnd;
    });

    const weeklyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      return transactionDate >= weeklyStart && transactionDate < weeklyEnd;
    });

    const monthlyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      return transactionDate >= monthlyStart && transactionDate < monthlyEnd;
    });

    // Calculate totals from transactions
    const dailyTotal = dailyTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );
    const weeklyTotal = weeklyTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );
    const monthlyTotal = monthlyTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    setPeriodTotals({
      daily: {
        total: dailyTotal,
        transactions: dailyTransactions.length,
      },
      weekly: {
        total: weeklyTotal,
        transactions: weeklyTransactions.length,
      },
      monthly: {
        total: monthlyTotal,
        transactions: monthlyTransactions.length,
      },
    });

    console.log("Accurate period totals from transactions:", {
      daily: dailyTotal,
      weekly: weeklyTotal,
      monthly: monthlyTotal,
      dailyTransactions: dailyTransactions.length,
      weeklyTransactions: weeklyTransactions.length,
      monthlyTransactions: monthlyTransactions.length,
    });
  };

  // Simple refresh function
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchSales();
      toast.success("Sales data refreshed");
    } catch (err) {
      toast.error("Failed to refresh sales data");
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by time period
  const filterByTimePeriod = (period) => {
    if (!period) {
      setFilteredSales(sales);
      setTimePeriod(null);
      return;
    }

    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        break;
      case "weekly":
        const currentDay = now.getDay();
        const currentMonday = new Date(now);
        currentMonday.setDate(
          now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
        );
        startDate = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate()
        );
        endDate = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate() + 7
        );
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        return;
    }

    console.log(`${period.toUpperCase()} filter:`, startDate, "to", endDate);

    const filtered = sales.filter((sale) => {
      const saleDate = new Date(sale.transactionDate);
      return saleDate >= startDate && saleDate < endDate;
    });

    console.log(`Found ${filtered.length} sales batches for ${period}`);
    setFilteredSales(filtered);
    setTimePeriod(period);
  };

  // Handle time period button click
  const handleTimePeriodClick = (period) => {
    if (timePeriod === period) {
      setTimePeriod(null);
      setFilteredSales(sales);
    } else {
      setTimePeriod(period);
      filterByTimePeriod(period);
    }
  };

  // Function to fetch best selling products
  const fetchBestSellingProducts = async (period = "monthly") => {
    setBestSellingLoading(true);
    try {
      const res = await api.get(
        `/sales/analytics/best-selling?period=${period}`
      );
      setBestSellingData(res.data);
      setShowBestSellingModal(true);
    } catch (err) {
      toast.error("Failed to fetch best selling products");
      console.error("Fetch best selling products error:", err);
    } finally {
      setBestSellingLoading(false);
    }
  };

  // Function to handle best selling products click
  const handleBestSellingClick = (period) => {
    setSelectedPeriod(period);
    fetchBestSellingProducts(period);
  };

  const handleViewSale = async (sale) => {
    try {
      setLoading(true);

      if (sale.isTodayBatch) {
        // For today's synthetic batch, use the transactions data directly
        setSelectedSale({
          ...sale,
          transactions: sale.transactions, // Already has the data
        });
      } else {
        // For regular batches, fetch from API
        const res = await api.get(
          `/sales/date/${sale.batchNumber.replace("BATCH-", "")}`
        );
        setSelectedSale(res.data);
      }

      setShowModal(true);
    } catch (err) {
      console.error("Error fetching sale details:", err);
      toast.error("Failed to fetch sale details");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Filter configuration for sales
  const salesFilterConfig = [
    {
      key: "batchNumber",
      label: "Batch Number",
      options: [],
    },
  ];

  // Sort configuration for sales
  const salesSortConfig = [
    { key: "batchNumber", label: "Batch Number" },
    { key: "totalSales", label: "Total Sales" },
  ];

  return (
    <DashboardLayout>
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar
      />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sales Overview
            </h1>
            <p className="text-gray-600">
              Monitor and analyze your sales performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
            {/* Best Selling Products Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-xl hover:bg-purple-700 transition-colors duration-200 font-medium">
                <TrendingUp size={18} /> Best Sellers
                <Calendar size={16} className="ml-1" />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="p-2">
                  <button
                    onClick={() => handleBestSellingClick("daily")}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors duration-200 font-medium"
                  >
                    Today's Best Sellers
                  </button>
                  <button
                    onClick={() => handleBestSellingClick("weekly")}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors duration-200 font-medium"
                  >
                    This Week's Best Sellers
                  </button>
                  <button
                    onClick={() => handleBestSellingClick("monthly")}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors duration-200 font-medium"
                  >
                    This Month's Best Sellers
                  </button>
                </div>
              </div>
            </div>

            {/* Simple Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Sales Summary Cards - CALCULATED FROM TRANSACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Sales Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Today's Sales</h3>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                ₱{periodTotals.daily.total.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {periodTotals.daily.transactions} transactions
              </div>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Weekly Sales Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">This Week's Sales</h3>
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                ₱{periodTotals.weekly.total.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {periodTotals.weekly.transactions} transactions
              </div>
              <div className="text-xs text-gray-500">This week</div>
            </div>
          </div>

          {/* Monthly Sales Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">
                This Month's Sales
              </h3>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                ₱{periodTotals.monthly.total.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {periodTotals.monthly.transactions} transactions
              </div>
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Time Period Filter Section */}
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
                Daily
              </button>
              <button
                onClick={() => handleTimePeriodClick("weekly")}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                  timePeriod === "weekly"
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => handleTimePeriodClick("monthly")}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                  timePeriod === "monthly"
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <ExportButtons
          data={filteredSales}
          fileName={`Sales-${timePeriod || "all"}-${
            new Date().toISOString().split("T")[0]
          }`}
          columns={[
            { key: "batchNumber", label: "Batch Number" },
            { key: "transactionDate", label: "Date" },
            { key: "transactionsCount", label: "Transactions" },
            { key: "totalSales", label: "Total Sales" },
          ]}
        />

        {/* Search & Filter Section */}
        <SearchFilter
          data={filteredSales}
          onFilteredDataChange={setFilteredSales}
          searchFields={["batchNumber", "totalSales"]}
          filterConfig={salesFilterConfig}
          sortConfig={salesSortConfig}
          placeholder="Search by batch number..."
          dateField="transactionDate"
          enableDateFilter={true}
        />

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              No sales records found
            </p>
            <p className="text-gray-600">
              {sales.length === 0
                ? "No sales data available."
                : timePeriod !== null
                ? `No sales data found for the current ${timePeriod} period`
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Batch #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Transactions
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Total Sales
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSales.map((s) => (
                    <tr
                      key={s._id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {s.batchNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {s.transactionDate
                            ? new Date(s.transactionDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                }
                              )
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {s.transactionsCount || s.transactions?.length || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-green-600">
                          ₱{(s.totalSales || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewSale(s)}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Best Selling Products Modal */}
        <BestSellingModal
          show={showBestSellingModal}
          onClose={() => setShowBestSellingModal(false)}
          data={bestSellingData}
          loading={bestSellingLoading}
          period={selectedPeriod}
        />

        {/* Sales View Modal */}
        <SalesModal
          show={showModal}
          onClose={handleCloseModal}
          salesData={selectedSale}
        />
      </div>
    </DashboardLayout>
  );
};

export default Sales;
