import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AlertDialog from "../../components/AlertDialog";
import IngredientModal from "../../components/modals/IngredientModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2 } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";

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

  // ✅ Show alert modal
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowAlert(true);
  };

  // ✅ Confirm delete
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

  return (
    <DashboardLayout>
      <div className="p-4">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Ingredients & Materials</h1>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Ingredient
          </button>
        </div>

        <ExportButtons
          data={ingredients}
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

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Quantity</th>
                <th className="border px-4 py-2 text-left">Unit</th>
                <th className="border px-4 py-2 text-left">Stock Status</th>
                <th className="border px-4 py-2 text-left">Alert Level</th>
                <th className="border px-4 py-2 text-left">Expiration</th>
                <th className="border px-4 py-2 text-left">Remarks</th>
                <th className="border px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length > 0 ? (
                ingredients.map((i) => (
                  <tr key={i._id}>
                    <td className="border px-4 py-2">{i.name}</td>
                    <td className="border px-4 py-2">{i.quantity}</td>
                    <td className="border px-4 py-2">{i.unit}</td>
                    <td className="border px-4 py-2">
                      {getStockStatus(i.quantity, i.alert)}
                    </td>
                    <td className="border px-4 py-2">{i.alert}</td>
                    <td className="border px-4 py-2">
                      {i.expiration
                        ? new Date(i.expiration).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="border px-4 py-2">{i.remarks}</td>
                    <td className="border px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(i)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(i._id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No ingredients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
