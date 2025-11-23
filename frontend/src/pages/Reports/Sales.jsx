import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../api/axios";
import { Eye, RefreshCw, Receipt } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SalesModal from "../../components/modals/SalesModal";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper function to format date safely
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    try {
      const date = new Date(dateValue);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateValue);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateValue);
      return 'Error';
    }
  };

  // Fetch all sales
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales/summary");
      console.log("Sales data from API:", res.data);
      setSales(res.data);
      setFilteredSales(res.data);
    } catch (err) {
      toast.error("Failed to fetch sales data");
      console.error("Fetch sales error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleViewSale = async (sale) => {
    console.log("Selected sale:", sale);
    
    try {
      setLoading(true);
      // Fetch full sales batch by ID (now it's a real Sales document ID)
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

  // Filter configuration for sales
  const salesFilterConfig = [
    {
      key: "batchNumber",
      label: "Batch Number",
      options: [], // Can be populated dynamically if needed
    },
  ];

  // Sort configuration for sales
  const salesSortConfig = [
    { key: "batchNumber", label: "Batch Number" },
    { key: "totalSales", label: "Total Sales" },
  ];

  return (
    <DashboardLayout> {/*todo: past transactions/sales must retain its value and cannot be changeable if the future user wants to change the product price*/}
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar
      /> {/**todo: it should be filtered by monthly, weekly, or daily*/}
      {/**todo: must have a before and after sales report*/}
      {/**todo: Improve UI must be modern */}
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Overview</h1>
            <p className="text-gray-600">Monitor and analyze your sales performance</p>
          </div>
          <button
            onClick={fetchSales}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium mt-4 lg:mt-0"
          >
            <RefreshCw size={18} /> Refresh Data
          </button>
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
            <p className="text-lg font-medium text-gray-900 mb-2">No sales records found</p>
            <p className="text-gray-600">
              {sales.length === 0 ? "No sales data available" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Batch #</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Transactions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Sales</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSales.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {s.batchNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {s.transactionDate 
                            ? new Date(s.transactionDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })
                            : 'N/A'}
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