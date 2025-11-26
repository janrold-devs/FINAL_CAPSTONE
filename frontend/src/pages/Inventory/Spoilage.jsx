
import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import SpoilageModal from "../../components/modals/SpoilageModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Eye, Plus } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Spoilage = () => {
  const [spoilages, setSpoilages] = useState([]);
  const [filteredSpoilages, setFilteredSpoilages] = useState([]);
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
      setFilteredSpoilages(res.data);
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
      // IMPORTANT: Follow model schema
      await axios.post("/spoilages", {
        personInCharge: formData.personInCharge,
        ingredients: formData.ingredients.map((i) => ({
          ingredient: i.ingredient,
          quantity: i.quantity,
          unit: i.unit,
        })),
        totalWaste: formData.totalWaste,
        remarks: formData.remarks,
      });

      setShowModal(false);
      fetchSpoilages();
      toast.success("Spoilage record created successfully!");
    } catch (err) {
      console.error("Error creating spoilage:", err);
      toast.error(err.response?.data?.message || "Failed to record spoilage");
    }
  };

  // View modal
  const handleViewSpoilage = (spoilage) => {
    setSelectedSpoilage(spoilage);
    setViewMode(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setViewMode(false);
    setSelectedSpoilage(null);
  };

  const handleOpenCreateModal = () => {
    setViewMode(false);
    setSelectedSpoilage(null);
    setShowModal(true);
  };

  // Filters
  const spoilageFilterConfig = [
    {
      key: "personInCharge._id",
      label: "Person In Charge",
      options: users.map((u) => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName}`,
      })),
    },
  ];

  const spoilageSortConfig = [
    { key: "personInCharge.firstName", label: "Person In Charge" },
    { key: "totalWaste", label: "Total Waste" },
  ];

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getWasteColor = (amount) => {
    if (amount > 100) return "text-red-600 bg-red-50 border-red-200";
    if (amount > 50) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-yellow-600 bg-yellow-50 border-yellow-200";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Spoilage Records</h1>
            <p className="text-gray-600">Track and manage spoiled or damaged inventory ingredients</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition"
          >
            <Plus className="w-5 h-5" /> Record Spoilage
          </button>
        </div>

        {/* Export */}
        <ExportButtons
          data={filteredSpoilages}
          fileName="Spoilages"
          columns={[
            { key: "personInCharge.firstName", label: "Person In Charge" },
            { key: "createdAt", label: "Date" },
            { key: "ingredients", label: "Ingredients" }, // 🔥 FIXED
            { key: "totalWaste", label: "Total Waste" },
            { key: "remarks", label: "Remarks" },
          ]}
        />

        {/* Search / Filter */}
        <SearchFilter
          data={spoilages}
          onFilteredDataChange={setFilteredSpoilages}
          searchFields={["personInCharge.firstName", "personInCharge.lastName", "remarks"]}
          filterConfig={spoilageFilterConfig}
          sortConfig={spoilageSortConfig}
          placeholder="Search by person in charge or remarks..."
          enableDateFilter={true}
          dateField="createdAt"
        />

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/*<thead className="bg-gray-50 border-b">}*/}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Assigned Personnel</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Items</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Total Waste</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Remarks</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredSpoilages.length > 0 ? (
                  filteredSpoilages.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">

                      {/* PERSONNEL */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-red-600 text-sm font-medium">
                              {s.personInCharge?.firstName?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {s.personInCharge
                              ? `${s.personInCharge.firstName} ${s.personInCharge.lastName}`
                              : "Unknown"}
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="px-6 py-4">
                        {s.ingredients?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {[...new Set(s.ingredients.map(i => i.ingredient?.category || "Uncategorized"))].map((cat, idx) => (
                              <span key={idx} className="text-sm text-gray-800">
                                {cat}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No category</span>
                        )}
                      </td>

                      {/* ITEMS */}
                      <td className="px-6 py-4">
                        {s.ingredients?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {s.ingredients.map((i, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full w-fit">
                                {i.ingredient?.name || "Unknown Item"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No items</span>
                        )}
                      </td>

                      {/* TOTAL WASTE */}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm border ${getWasteColor(s.totalWaste)}`}>
                          {s.totalWaste}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-4 text-sm">{formatDate(s.createdAt)}</td>

                      {/* REMARKS */}
                      <td className="px-6 py-4 text-sm">
                        {s.remarks ? (
                          <span className="line-clamp-2">{s.remarks}</span>
                        ) : (
                          <span className="text-gray-400 italic">No remarks</span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewSpoilage(s)}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" /> <span className="text-sm">View</span>
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <p className="text-lg font-medium text-gray-900">No spoilage records found</p>
                      <p className="text-gray-600 mb-4">Start by recording your first spoilage incident</p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        <Plus className="w-4 h-4" /> Record Spoilage
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
