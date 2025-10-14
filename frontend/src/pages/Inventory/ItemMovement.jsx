import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ItemMovementModal from "../../components/modals/ItemMovementModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import ExportButtons from "../../components/ExportButtons";

const ItemMovement = () => {
  const [movements, setMovements] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    ingredient: "",
    quantity: "",
    unit: "",
    purpose: "",
    destination: "",
    actionType: "",
    movedBy: "",
  });
  const [maxQty, setMaxQty] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [movRes, ingRes, userRes] = await Promise.all([
        api.get("/itemtracker"),
        api.get("/ingredients"),
        api.get("/users"),
      ]);
      setMovements(movRes.data);
      setIngredients(ingRes.data);
      setUsers(userRes.data);
    } catch (err) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill unit and max quantity when ingredient changes
  useEffect(() => {
    if (form.ingredient) {
      const selected = ingredients.find((i) => i._id === form.ingredient);
      if (selected) {
        setForm((f) => ({ ...f, unit: selected.unit }));
        setMaxQty(selected.quantity);
      }
    } else {
      setMaxQty(null);
      setForm((f) => ({ ...f, unit: "" }));
    }
    // eslint-disable-next-line
  }, [form.ingredient, ingredients]);

  const handleOpenModal = () => {
    setForm({
      ingredient: "",
      quantity: "",
      unit: "",
      purpose: "",
      destination: "",
      actionType: "",
      movedBy: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/itemtracker", form);
      toast.success("Item movement added successfully!");
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add item movement");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Item Movements</h1>
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Movement
          </button>
        </div>

        <ExportButtons
          fileName="Item tracker"
          columns={[
            { key: "batchNumber", label: "Batch Number" },
            { key: "movedBy.firstName", label: "First Name" },
            { key: "movedBy.lastName", label: "Last Name" },
            { key: "ingredient.name", label: "Item Name" },
            { key: "quantity", label: "Quantity" },
            { key: "unit", label: "Unit" },
            { key: "purpose", label: "Purpose" },
            { key: "actionType", label: "Action Type" },
            { key: "destination", label: "Destination" },
            { key: "date", label: "Date" },
          ]}
          data={movements}
        />

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Batch Number</th>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Item Name</th>
                <th className="border px-4 py-2 text-left">Quantity</th>
                <th className="border px-4 py-2 text-left">Purpose</th>
                <th className="border px-4 py-2 text-left">Action</th>
                <th className="border px-4 py-2 text-left">Destination</th>
                <th className="border px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.length > 0 ? (
                movements.map((m, idx) => (
                  <tr key={m._id || idx}>
                    <td className="border px-4 py-2">{m.batchNumber}</td>
                    <td className="border px-4 py-2">
                      {m.movedBy?.firstName} {m.movedBy?.lastName}
                    </td>
                    <td className="border px-4 py-2">
                      {m.ingredient?.name || m.ingredient?._id || m.ingredient}
                    </td>
                    <td className="border px-4 py-2">
                      {m.quantity}
                      {m.unit}
                    </td>
                    <td className="border px-4 py-2">{m.purpose}</td>
                    <td className="border px-4 py-2">{m.actionType}</td>
                    <td className="border px-4 py-2">
                      {m.actionType === "Transfer" &&
                      m.destination &&
                      m.destination !== "N/A"
                        ? m.destination
                        : "N/A"}
                    </td>
                    <td className="border px-4 py-2">
                      {m.date
                        ? new Date(m.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    No item movements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <ItemMovementModal
          show={showModal}
          onClose={handleCloseModal}
          onSubmit={handleModalSubmit}
          form={form}
          setForm={setForm}
          ingredients={ingredients}
          users={users}
          editingId={null}
          maxQty={maxQty}
        />
      </div>
    </DashboardLayout>
  );
};

export default ItemMovement;
