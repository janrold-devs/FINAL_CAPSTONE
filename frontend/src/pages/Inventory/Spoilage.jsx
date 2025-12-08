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
  const [loading, setLoading] = useState(false);

  // Fetch spoilages
  const fetchSpoilages = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/spoilages");
      // Handle new response structure
      if (res.data.success && res.data.data) {
        setSpoilages(res.data.data);
        setFilteredSpoilages(res.data.data);
      } else {
        // Fallback for old response structure
        setSpoilages(res.data);
        setFilteredSpoilages(res.data);
      }
    } catch (err) {
      console.error("Error fetching spoilages:", err);
      toast.error("Failed to fetch spoilage records");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ingredients
  const fetchIngredients = async () => {
    try {
      const res = await axios.get("/ingredients");
      // Handle both response structures
      if (res.data.success && res.data.data) {
        setIngredients(res.data.data);
      } else {
        setIngredients(res.data);
      }
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      toast.error("Failed to fetch ingredients");
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users");
      // Handle both response structures
      if (res.data.success && res.data.data) {
        setUsers(res.data.data);
      } else {
        setUsers(res.data);
      }
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

  // Create spoilage - FIXED: Handle new response structure
  const handleCreateSpoilage = async (formData) => {
    try {
      const response = await axios.post("/spoilages", {
        personInCharge: formData.personInCharge,
        ingredients: formData.ingredients.map((i) => ({
          ingredient: i.ingredient,
          quantity: i.quantity,
          unit: i.unit,
        })),
        totalWaste: formData.totalWaste,
        remarks: formData.remarks,
      });

      // Handle new response structure
      if (response.data.success) {
        const newSpoilage = response.data.data;
        
        // Update the state immediately with the new spoilage
        setSpoilages(prev => [newSpoilage, ...prev]);
        setFilteredSpoilages(prev => [newSpoilage, ...prev]);
        
        setShowModal(false);
        toast.success(response.data.message || "Spoilage record created successfully!");
        
        // Optionally refetch to ensure data is in sync
        setTimeout(() => {
          fetchSpoilages();
        }, 100);
      } else {
        throw new Error(response.data.message || "Failed to create spoilage");
      }
    } catch (err) {
      console.error("Error creating spoilage:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          "Failed to record spoilage";
      toast.error(errorMessage);
      
      // If it's a unit conversion error, show more details
      if (err.response?.data?.code === "UNIT_CONVERSION_ERROR") {
        console.warn("Unit conversion issue:", err.response.data);
      }
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

  // Reset form when closing modal (optional, for better UX)
  const handleModalClose = () => {
    setViewMode(false);
    setSelectedSpoilage(null);
    setShowModal(false);
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
    { key: "createdAt", label: "Date Created" },
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

  // Format ingredients for export
  const formatIngredientsForExport = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return "";
    return ingredients.map(i => 
      `${i.ingredient?.name || 'Unknown'}: ${i.quantity} ${i.unit}`
    ).join('; ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Spoilage Records</h1>
            <p className="text-gray-600">Track and manage spoiled or damaged inventory ingredients</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition mt-4 lg:mt-0"
          >
            <Plus className="w-5 h-5" /> Record Spoilage
          </button>
        </div>

        {/* Export - FIXED: Handle ingredients properly */}
        <ExportButtons
          data={filteredSpoilages}
          fileName="Spoilages"
          columns={[
            { 
              key: "personInCharge", 
              label: "Person In Charge",
              format: (value) => value ? `${value.firstName} ${value.lastName}` : "Unknown"
            },
            { 
              key: "createdAt", 
              label: "Date",
              format: formatDate
            },
            { 
              key: "ingredients", 
              label: "Ingredients",
              format: formatIngredientsForExport
            },
            { 
              key: "totalWaste", 
              label: "Total Waste" 
            },
            { 
              key: "remarks", 
              label: "Remarks",
              format: (value) => value || "No remarks"
            },
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
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
                            <div className="flex flex-col gap-1 max-w-xs">
                              {s.ingredients.map((i, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                    {i.ingredient?.name || "Unknown Item"}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({i.quantity} {i.unit})
                                  </span>
                                </div>
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
                        <td className="px-6 py-4 text-sm">
                          {formatDate(s.createdAt)}
                          <div className="text-xs text-gray-400">
                            {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* REMARKS */}
                        <td className="px-6 py-4 text-sm max-w-xs">
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
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
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
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
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
        )}

        {/* Spoilage Modal */}
        {showModal && (
          <SpoilageModal
            show={showModal}
            onClose={handleModalClose}
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