import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../api/axios";
import { Eye, RefreshCw } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SalesModal from "../../components/modals/SalesModal";

const Sales = () => {
  const [sales, setSales] = useState([]);
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

  return (
    <DashboardLayout>
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar
      />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Sales Overview</h1>
          <button
            onClick={fetchSales}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : sales.length === 0 ? (
          <p className="text-gray-500">No sales records found.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2 border">Batch #</th>
                  <th className="px-3 py-2 border">Date</th>
                  <th className="px-3 py-2 border">Transactions</th>
                  <th className="px-3 py-2 border">Total Sales (₱)</th>
                  <th className="px-3 py-2 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 font-medium">
                      {s.batchNumber}
                    </td>
                    <td className="border px-3 py-2">
                      {s.transactionDate 
                        ? new Date(s.transactionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                        : 'N/A'}
                    </td>
                    <td className="border px-3 py-2">
                      {s.transactionsCount || s.transactions?.length || 0}
                    </td>

                    <td className="border px-3 py-2 font-semibold text-green-700">
                      ₱{s.totalSales?.toLocaleString()}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <button
                        onClick={() => handleViewSale(s)}
                        className="text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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