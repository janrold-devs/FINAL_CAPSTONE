import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AlertDialog from "../../components/AlertDialog";
import IngredientModal from "../../components/modals/IngredientModal";
import ArchiveModal from "../../components/modals/ArchiveModal";
import IngredientBatchModal from "../../components/modals/IngredientBatchModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2, Plus, Archive, Package } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Ingredient = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "",
    alert: "",
    expiration: "",
    category: "",
  });
  const [formErrors, setFormErrors] = useState({}); // NEW: For validation errors
  const [archiveConflict, setArchiveConflict] = useState(null); // NEW: For archive conflict handling
  const [showArchiveModal, setShowArchiveModal] = useState(false); // NEW: For archive management
  const [showBatchModal, setShowBatchModal] = useState(false); // NEW: For batch view
  const [selectedIngredient, setSelectedIngredient] = useState(null); // NEW: For batch view

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/ingredients");
      
      // Normalize units in the data
      const normalizedData = res.data.map(ingredient => ({
        ...ingredient,
        unit: ingredient.unit?.toLowerCase().replace('ml', 'ml') || ingredient.unit
      }));
      
      setIngredients(normalizedData);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      toast.error("Failed to fetch ingredients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({}); // Clear previous errors
    
    try {
      // Prepare data with trimmed name
      const payload = {
        ...form,
        name: form.name.trim() // NEW: Trim the name before sending
      };
      
      // Normalize unit to lowercase before sending
      if (payload.unit) payload.unit = payload.unit.toLowerCase();
      
      if (editingId) {
        await axios.put(`/ingredients/${editingId}`, payload);
      } else {
        await axios.post("/ingredients", payload);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchIngredients();
    } catch (err) {
      console.error("Error saving ingredient:", err);
      
      // NEW: Handle archive conflict (409)
      if (err.response?.status === 409 && err.response?.data?.code === "ARCHIVED_EXISTS") {
        setArchiveConflict(err.response.data);
        return; // Don't show other errors, let user handle archive conflict
      }
      
      // Handle duplicate error specifically
      if (err.response?.status === 400) {
        const errorMessage = err.response.data.message;
        
        if (errorMessage.includes("already exists")) {
          // Extract the existing ingredient ID from the error message
          const match = errorMessage.match(/ID: (\w+)/);
          if (match) {
            setFormErrors({ 
              name: `Ingredient already exists (ID: ${match[1]}). Please use a different name or edit the existing ingredient.` 
            });
          } else {
            setFormErrors({ name: "Ingredient with this name already exists. Please use a different name." });
          }
        } else {
          toast.error(errorMessage || "Failed to save ingredient");
        }
      } else if (err.response?.status === 500 && err.response?.data?.code === 11000) {
        // Handle MongoDB duplicate key error
        setFormErrors({ name: "Ingredient with this name already exists. Please use a different name." });
      } else {
        toast.error("Failed to save ingredient");
      }
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/ingredients/${deleteId}`);
      toast.success("Ingredient deleted successfully!");
      fetchIngredients();
    } catch (err) {
      console.error("Error deleting ingredient:", err);
      toast.error("Failed to delete ingredient");
    } finally {
      setShowAlert(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      unit: "",
      quantity: "",
      alert: "",
      // REMOVED: expiration field
    });
    setFormErrors({}); // NEW: Clear errors when resetting
    setArchiveConflict(null); // NEW: Clear archive conflict
  };

  // NEW: Archive management functions
  const handleRestoreArchived = async () => {
    if (!archiveConflict?.archivedIngredient?._id) return;
    
    try {
      await axios.post(`/ingredients/archive/${archiveConflict.archivedIngredient._id}/restore`);
      toast.success(`Ingredient "${archiveConflict.archivedIngredient.name}" restored successfully!`);
      setArchiveConflict(null);
      setShowModal(false);
      resetForm();
      fetchIngredients();
    } catch (err) {
      console.error("Error restoring ingredient:", err);
      if (err.response?.status === 400 && err.response?.data?.code === "NAME_CONFLICT") {
        toast.error(`Cannot restore: ${err.response.data.message}`);
      } else {
        toast.error("Failed to restore ingredient");
      }
    }
  };

  const fetchArchivedIngredients = async () => {
    try {
      const res = await axios.get("/ingredients/archive/list");
      return res.data.data || [];
    } catch (err) {
      console.error("Error fetching archived ingredients:", err);
      toast.error("Failed to fetch archived ingredients");
      return [];
    }
  };

  const handlePermanentDelete = async (ingredientId, ingredientName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${ingredientName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`/ingredients/archive/${ingredientId}/permanent`);
      toast.success(`Ingredient "${ingredientName}" permanently deleted`);
      // Refresh archive list if archive modal is open
      if (showArchiveModal) {
        // This will be handled by the archive modal component
      }
    } catch (err) {
      console.error("Error permanently deleting ingredient:", err);
      if (err.response?.status === 400 && err.response?.data?.code === "HAS_HISTORICAL_RECORDS") {
        toast.error(`Cannot delete: ${err.response.data.message}`);
      } else {
        toast.error("Failed to permanently delete ingredient");
      }
    }
  };

  const getStockStatus = (quantity, alert) => {
    if (quantity === 0)
      return <span className="text-red-600 font-semibold">No Stock</span>;
    if (quantity <= alert)
      return <span className="text-yellow-500 font-semibold">Low Stock</span>;
    return <span className="text-green-600 font-semibold">In Stock</span>;
  };

  const handleEdit = (ingredient) => {
    setForm({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      alert: ingredient.alert,
      // REMOVED: expiration field
      category: ingredient.category,
    });
    setEditingId(ingredient._id);
    setFormErrors({}); // NEW: Clear errors when editing
    setShowModal(true);
  };

  // NEW: Handle batch view
  const handleViewBatches = (ingredient) => {
    setSelectedIngredient(ingredient);
    setShowBatchModal(true);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const [filteredIngredients, setFilteredIngredients] = useState(ingredients);

  useEffect(() => {
    setFilteredIngredients(ingredients);
  }, [ingredients]);

  // Simplified filter configuration (removed "Name Starts With")
  const ingredientFilterConfig = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "Solid Ingredient", label: "Solid Ingredient" },
        { value: "Liquid Ingredient", label: "Liquid Ingredient" },
        { value: "Material", label: "Material" },
      ],
    },
    {
      key: "unit",
      label: "Unit",
      options: [
        { value: "kg", label: "kilograms" },
        { value: "g", label: "grams" },
        { value: "l", label: "liters" },
        { value: "ml", label: "milliliters" },
        { value: "pcs", label: "pieces" },
      ],
    },
    {
      key: "stockStatus",
      label: "Stock Status",
      options: [
        { value: "In Stock", label: "In Stock" },
        { value: "Low Stock", label: "Low Stock" },
        { value: "No Stock", label: "No Stock" },
      ],
    },
  ];

  // Sort configuration
  const ingredientSortConfig = [
    { key: "name", label: "Alphabetical" },
    { key: "category", label: "Category" },
    { key: "unit", label: "Unit" },
    { key: "quantity", label: "Quantity" },
    { key: "stockStatus", label: "Stock Status" },
    { key: "alert", label: "Alert Level" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingredients & Materials</h1>
            <p className="text-gray-600">Manage your inventory items and materials</p>
          </div>
          <div className="flex gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors duration-200 font-medium"
            >
              <Archive className="w-5 h-5" />
              Archive
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="mb-6">
          <ExportButtons
            data={filteredIngredients || ingredients}
            fileName="Ingredients & Materials"
            columns={[
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "unit", label: "Unit" },
              { key: "quantity", label: "Quantity" },
              { key: "alert", label: "Alert Level" },
              { key: "activeBatches", label: "Active Batches" },
              { key: "nextExpiration", label: "Next Expiration" },
            ]}
          />
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={ingredients}
          onFilteredDataChange={setFilteredIngredients}
          searchFields={["name", "category", "unit"]}
          filterConfig={ingredientFilterConfig}
          sortConfig={ingredientSortConfig}
          placeholder="Search ingredients by name, category, or unit..."
          enableDateFilter={true}
          dateField="expiration"
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Unit</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Alert Level</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Batches</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Next Expiration</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredIngredients && filteredIngredients.length > 0 ? (
                    filteredIngredients.map((i) => (
                      <tr key={i._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{i.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{i.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.unit}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.quantity}</td>
                        <td className="px-6 py-4 text-sm">
                          {getStockStatus(i.quantity, i.alert)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.alert}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <button
                            onClick={() => handleViewBatches(i)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-blue-50"
                            title="View Batches"
                          >
                            <Package className="w-4 h-4" />
                            {i.activeBatches || 0} active
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {i.nextExpiration
                            ? new Date(i.nextExpiration).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => handleEdit(i)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(i._id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                              Loading...
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-medium text-gray-900 mb-2">No ingredients found</p>
                              <p className="text-gray-600">Try adjusting your search or filters</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        <IngredientModal
          show={showModal}
          onClose={() => {
            setShowModal(false);
            setArchiveConflict(null); // Clear archive conflict when closing
          }}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          editingId={editingId}
          formErrors={formErrors} // NEW: Pass errors to modal
          archiveConflict={archiveConflict} // NEW: Pass archive conflict
          onRestoreArchived={handleRestoreArchived} // NEW: Pass restore function
        />

        {/* Custom Alert Dialog */}
        <AlertDialog
          show={showAlert}
          title="Delete this ingredient?"
          message="Do you really want to delete this ingredient? This action cannot be undone."
          onCancel={() => setShowAlert(false)}
          onConfirm={confirmDelete}
        />

        {/* Archive Management Modal */}
        <ArchiveModal
          show={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onRefreshIngredients={fetchIngredients}
        />

        {/* Batch View Modal */}
        <IngredientBatchModal
          show={showBatchModal}
          onClose={() => {
            setShowBatchModal(false);
            setSelectedIngredient(null);
          }}
          ingredient={selectedIngredient}
        />
      </div>
    </DashboardLayout>
  );
};

export default Ingredient;