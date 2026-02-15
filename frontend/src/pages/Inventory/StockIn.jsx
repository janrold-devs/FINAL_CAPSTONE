import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import StockInModal from "../../components/modals/StockInModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Eye, Plus, Package } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";
import Pagination from "../../components/Pagination";

const StockIn = () => {
  const [stockIns, setStockIns] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch StockIns
  const fetchStockIns = async () => {
    try {
      const res = await axios.get("/stockin");
      const stockInData = res.data.data || res.data || [];
      setStockIns(stockInData);
      setFilteredStockIns(stockInData);
    } catch (err) {
      console.error("Error fetching stockins:", err);
      toast.error("Failed to fetch stock-in records");
    }
  };

  // Fetch Ingredients
  const fetchIngredients = async () => {
    try {
      const res = await axios.get("/ingredients");
      setIngredients(res.data);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      toast.error("Failed to fetch ingredients");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users");
      setUsersList(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users");
    }
  };

  // Initialize
  useEffect(() => {
    fetchStockIns();
    fetchIngredients();
    fetchUsers();
  }, []);

  // Handle StockIn creation
  const handleCreateStockIn = async (formData) => {
    try {
      await axios.post("/stockin", formData);
      setShowModal(false);
      fetchStockIns();
      toast.success("Stock-in record created successfully!");
    } catch (err) {
      console.error("Error creating stockin:", err);
      // Also check for the new error response structure
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to create stock-in";
      toast.error(errorMessage);
    }
  };

  // Handle view details
  const handleViewDetails = (stockIn) => {
    setSelectedStockIn(stockIn);
    setViewMode(true);
    setShowModal(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setViewMode(false);
    setSelectedStockIn(null);
    setShowModal(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setViewMode(false);
    setSelectedStockIn(null);
  };

  // Filter configuration for stock-in
  const stockInFilterConfig = [
    {
      key: "stockman._id",
      label: "Stockman",
      options: usersList.map((user) => ({
        value: user._id,
        label: `${user.firstName} ${user.lastName}`,
      })),
    },
    {
      key: "ingredients.ingredient.category",
      label: "Category",
      options: [
        { label: "Solid Ingredient", value: "Solid Ingredient" },
        { label: "Liquid Ingredient", value: "Liquid Ingredient" },
        { label: "Material", value: "Material" },
      ],
    },
  ];

  // Sort configuration for stock-in
  const stockInSortConfig = [
    { key: "batchNumber", label: "Batch Number" },
    { key: "stockman.firstName", label: "Stockman" },
  ];

  const totalPages = Math.ceil(filteredStockIns.length / itemsPerPage);
  const paginatedStockIns = filteredStockIns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStockIns.length]);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Stock-In Records
            </h1>
            <p className="text-gray-600">
              Manage incoming inventory and stock receipts
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium mt-4 lg:mt-0"
          >
            <Plus className="w-5 h-5" />
            New Stock-In
          </button>
        </div>

        {/* Export Buttons */}
        <div>
          <ExportButtons
            data={filteredStockIns || stockIns}
            fileName="Stock-In"
            columns={[
              { key: "batchNumber", label: "Batch Number" },
              { key: "stockman.firstName", label: "Stockman" },
              { key: "date", label: "Date" },
              { key: "ingredients.length", label: "Ingredients" },
            ]}
          />
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={stockIns}
          onFilteredDataChange={setFilteredStockIns}
          searchFields={[
            "batchNumber",
            "stockman.firstName",
            "stockman.lastName",
          ]}
          filterConfig={stockInFilterConfig}
          sortConfig={stockInSortConfig}
          placeholder="Search by batch number or stockman name..."
          enableDateFilter={true}
          dateField="date"
        />

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Batch Number
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Stockman
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedStockIns && paginatedStockIns.length > 0 ? (
                  paginatedStockIns.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 border-blue-200">
                              {item.batchNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center align-top">
                        {item.ingredients && item.ingredients.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {/* Show first 3 items */}
                            {item.ingredients.slice(0, 3).map((i, index) => (
                              <span
                                key={i._id || index}
                                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200"
                              >
                                {i.ingredient?.name || "Unknown"} ({i.quantity}
                                {i.unit || ""})
                              </span>
                            ))}
                            {/* Show "+X more" if there are more than 3 items */}
                            {item.ingredients.length > 3 && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200 font-medium">
                                +{item.ingredients.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic block">
                            No ingredients
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-green-600 text-sm font-medium">
                              {item.stockman?.firstName?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.stockman
                                ? `${item.stockman.firstName} ${item.stockman.lastName}`
                                : "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              Stockman
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
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
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            No stock-in records found
                          </p>
                          <p className="text-gray-600 mb-4">
                            Start by creating your first stock-in record
                          </p>
                          <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            New Stock-In
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Section */}
        {filteredStockIns.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredStockIns.length}
          />
        )}

        {showModal && (
          <StockInModal
            show={showModal}
            onClose={handleCloseModal}
            onSubmit={handleCreateStockIn}
            ingredientsList={ingredients}
            usersList={usersList}
            viewMode={viewMode}
            stockInData={selectedStockIn}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockIn;
