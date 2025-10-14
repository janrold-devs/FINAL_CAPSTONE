import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import StockInModal from "../../components/modals/StockInModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Eye } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";


const StockIn = () => {
  const [stockIns, setStockIns] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);

  // Fetch StockIns
  const fetchStockIns = async () => {
    try {
      const res = await axios.get("/stockin");
      setStockIns(res.data);
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
      toast.error(err.response?.data?.message || "Failed to create stock-in");
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

  return (
    <DashboardLayout>
      <div className="p-6">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Stock-In Records</h1>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Stock-In
          </button>
        </div>

        <ExportButtons
          data={stockIns}
          fileName="Stock-In"
          columns={[
            { key: "batchNumber", label: "Batch Number" },
            { key: "stockman.firstName", label: "Stockman" },
            { key: "date", label: "Date" },
            { key: "ingredients.length", label: "Ingredients" },
          ]}
        />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Batch Number</th>
                <th className="border px-3 py-2 text-center">Stockman</th>
                <th className="border px-3 py-2 text-center">Date</th>
                <th className="border px-3 py-2 text-left">Ingredients</th>
                <th className="border px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockIns.length > 0 ? (
                stockIns.map((item) => (
                  <tr key={item._id}>
                    <td className="border px-3 py-2">{item.batchNumber}</td>
                    <td className="border px-3 py-2 text-center">
                      {item.stockman
                        ? `${item.stockman.firstName} ${item.stockman.lastName}`
                        : "Unknown"}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      {new Date(item.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="border px-3 py-2">
                      {item.ingredients
                        ?.map(
                          (i) =>
                            `${i.ingredient?.name || "Unknown"} (${
                              i.quantity
                            } ${i.unit || ""})`
                        )
                        .join(", ")}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan="5">
                    No stock-in records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
