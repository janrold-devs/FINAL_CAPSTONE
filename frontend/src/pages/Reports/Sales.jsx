import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../api/axios";
import {
  Eye,
  RefreshCw,
  Receipt,
  Plus,
  TrendingUp,
  Calendar,
} from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  // Fetch all sales
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales/summary");
      console.log("Sales data from API:", res.data);

      // Debug: Log each sales batch details
      res.data.forEach((sale, index) => {
        console.log(`Sale ${index + 1}:`, {
          batchNumber: sale.batchNumber,
          date: sale.transactionDate,
          transactionCount: sale.transactionsCount,
          totalSales: sale.totalSales,
          transactions: sale.transactions,
        });
      });

      setSales(res.data);
      setFilteredSales(res.data);
    } catch (err) {
      toast.error("Failed to fetch sales data");
      console.error("Fetch sales error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate missing sales data
  const generateMissingSales = async () => {
    try {
      setLoading(true);
      // Generate sales for the last 7 days to catch any missing data
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const startDateStr = startDate.toISOString().split("T")[0];

      const response = await api.post("/sales/generate-from-transactions", {
        startDate: startDateStr,
        endDate: endDate,
      });

      toast.success(response.data.message);
      fetchSales(); // Refresh the data
    } catch (err) {
      toast.error("Failed to generate sales data");
      console.error("Generate sales error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch best selling products
  const fetchBestSellingProducts = async (period = "monthly") => {
    setBestSellingLoading(true);
    try {
      const res = await api.get(
        `/sales/analytics/best-selling?period=${period}`
      );
      console.log("Best selling products data:", res.data);
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
    console.log("Selected sale:", sale);

    try {
      setLoading(true);
      // Fetch full sales batch by ID
      const res = await api.get(`/sales/${sale._id}`);
      console.log("Fetched sale details:", res.data);
      setSelectedSale(res.data);
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

  // Helper function to format date safely
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateValue);
        return "Invalid Date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Date formatting error:", error, dateValue);
      return "Error";
    }
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

            {/* Generate Missing Sales Button */}
            <button
              onClick={generateMissingSales}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              <Plus size={18} /> Generate Missing Sales
            </button>

            <button
              onClick={fetchSales}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <RefreshCw size={18} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <ExportButtons
          data={filteredSales}
          fileName="Sales"
          columns={[
            { key: "batchNumber", label: "Batch Number" },
            { key: "transactionDate", label: "Date" },
            { key: "transactionsCount", label: "Transactions" },
            { key: "totalSales", label: "Total Sales" },
          ]}
        />

        {/* Search & Filter Section */}
        <SearchFilter
          data={sales}
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
                ? "No sales data available. Click 'Generate Missing Sales' to create sales batches from your transactions."
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
