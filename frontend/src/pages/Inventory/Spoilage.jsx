import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import SpoilageModal from "../../components/modals/SpoilageModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Eye } from "lucide-react";
import ExportButtons from "../../components/ExportButtons"

const Spoilage = () => {
  const [spoilages, setSpoilages] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedSpoilage, setSelectedSpoilage] = useState(null);

  // Fetch spoilages
  const fetchSpoilages = async () => {
    try {
      const res = await axios.get("/spoilages");
      setSpoilages(res.data);
    } catch (err) {
      console.error("Error fetching spoilages:", err);
      toast.error("Failed to fetch spoilage records");
    }
  };

  // Fetch ingredients
  const fetchIngredients = async () => {
    try {
      const res = await axios.get("/ingredients");
      setIngredients(res.data);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      toast.error("Failed to fetch ingredients");
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchSpoilages();
    fetchIngredients();
    fetchUsers();
  }, []);

  // Create spoilage
  const handleCreateSpoilage = async (formData) => {
    try {
      await axios.post("/spoilages", formData);
      setShowModal(false);
      fetchSpoilages();
      toast.success("Spoilage record created successfully!");
    } catch (err) {
      console.error("Error creating spoilage:", err);
      toast.error(err.response?.data?.message || "Failed to record spoilage");
    }
  };

  // Open view modal
  const handleViewSpoilage = (spoilage) => {
    setSelectedSpoilage(spoilage);
    setViewMode(true);
    setShowModal(true);
  };

  // Close modal and reset
  const handleCloseModal = () => {
    setShowModal(false);
    setViewMode(false);
    setSelectedSpoilage(null);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setViewMode(false);
    setSelectedSpoilage(null);
    setShowModal(true);
  };

  return (
    <DashboardLayout> {/**todo: Improve UI must be modern */}
    <div className="p-6">
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar
      />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Spoilage Records</h1>
        <button
          onClick={handleOpenCreateModal}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          + Record Spoilage
        </button>
      </div>

      <ExportButtons data={spoilages} fileName="Spoilages" 
      columns={[
        {key: "personInCharge.firstName", label: "Person In Charge" },
        {key: "createdAt", label: "Date" },
        {key: "ingredients.length", label: "Ingredients" },
        {key: "totalWaste", label: "Total Waste" },
        {key: "remarks", label: "Remarks" },
      ]}
      />
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">Person In Charge</th>
              <th className="border px-3 py-2 text-left">Date</th>
              <th className="border px-3 py-2 text-left">Ingredients</th>
              <th className="border px-3 py-2 text-left">Total Waste</th>
              <th className="border px-3 py-2 text-left">Remarks</th>
              <th className="border px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {spoilages.length > 0 ? (
              spoilages.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">
                    {s.personInCharge?.firstName
                      ? `${s.personInCharge.firstName} ${s.personInCharge.lastName}`
                      : "Unknown"}
                  </td>
                  <td className="border px-3 py-2">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </td>
                  <td className="border px-3 py-2">
                    {s.ingredients
                      ?.map(
                        (i) =>
                          `${i.ingredient?.name || "Unknown"} (${i.quantity}${
                            i.unit || ""
                          })`
                      )
                      .join(", ")}
                  </td>
                  <td className="border px-3 py-2">{s.totalWaste}</td>
                  <td className="border px-3 py-2">{s.remarks || "-"}</td>
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => handleViewSpoilage(s)}
                      className="text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border px-3 py-4 text-center" colSpan="6">
                  No spoilage records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <SpoilageModal
          show={showModal}
          onClose={handleCloseModal}
          onSubmit={handleCreateSpoilage}
          ingredientsList={ingredients}
          usersList={users}
          viewMode={viewMode}
          spoilageData={selectedSpoilage}
        />
      )}
    </div>
    </DashboardLayout>
  );
};

export default Spoilage;
