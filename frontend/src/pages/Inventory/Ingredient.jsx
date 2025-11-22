import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AlertDialog from "../../components/AlertDialog";
import IngredientModal from "../../components/modals/IngredientModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2, Plus } from "lucide-react";
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
    remarks: "",
  });

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/ingredients");
      setIngredients(res.data);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      toast.error("Failed to fetch ingredients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/ingredients/${editingId}`, form);
        toast.success("Ingredient updated successfully!");
      } else {
        await axios.post("/ingredients", form);
        toast.success("Ingredient added successfully!");
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchIngredients();
    } catch (err) {
      console.error("Error saving ingredient:", err);
      toast.error("Failed to save ingredient");
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
      quantity: "",
      unit: "",
      alert: "",
      expiration: "",
      remarks: "",
    });
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
      expiration: ingredient.expiration?.split("T")[0] || "",
      remarks: ingredient.remarks,
    });
    setEditingId(ingredient._id);
    setShowModal(true);
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
      key: "unit",
      label: "Unit",
      options: [
        { value: "kg", label: "Kilograms" },
        { value: "g", label: "Grams" },
        { value: "L", label: "Liters" },
        { value: "ml", label: "Milliliters" },
        { value: "pcs", label: "Pieces" },
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
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "stockStatus", label: "Stock Status" },
    { key: "alert", label: "Alert Level" },
  ];

  return (
    <DashboardLayout> {/*todo: remove remarks field table*/}
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
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium mt-4 lg:mt-0"
          >
            <Plus className="w-5 h-5" />
            Add Ingredient
          </button>
        </div>

        {/* Export Buttons */}
        <div className="mb-6">
          <ExportButtons
            data={filteredIngredients || ingredients}
            fileName="Ingredients & Materials"
            columns={[
              { key: "name", label: "Name" },
              { key: "quantity", label: "Quantity" },
              { key: "unit", label: "Unit" },
              { key: "alert", label: "Alert Level" },
              { key: "expiration", label: "Expiration" },
              { key: "remarks", label: "Remarks" },
            ]}
          />
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={ingredients}
          onFilteredDataChange={setFilteredIngredients}
          searchFields={["name", "remarks", "unit"]}
          filterConfig={ingredientFilterConfig}
          sortConfig={ingredientSortConfig}
          placeholder="Search ingredients by name, remarks, or unit..."
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Unit</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Alert Level</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Expiration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Remarks</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredIngredients && filteredIngredients.length > 0 ? (
                    filteredIngredients.map((i) => (
                      <tr key={i._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{i.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.unit}</td>
                        <td className="px-6 py-4 text-sm">
                          {getStockStatus(i.quantity, i.alert)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{i.alert}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {i.expiration
                            ? new Date(i.expiration).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{i.remarks}</td>
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
                      <td colSpan="8" className="px-6 py-12 text-center">
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
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          form={form}
          setForm={setForm}
          editingId={editingId}
        />

        {/* Custom Alert Dialog */}
        <AlertDialog
          show={showAlert}
          title="Delete this ingredient?"
          message="Do you really want to delete this ingredient? This action cannot be undone."
          onCancel={() => setShowAlert(false)}
          onConfirm={confirmDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default Ingredient;