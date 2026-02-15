import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import { RotateCcw, Trash2, Archive, X } from "lucide-react";
import Pagination from "../Pagination";

const ArchiveModal = ({ show, onClose, onRefreshIngredients }) => {
  const [archivedIngredients, setArchivedIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Smaller page size for modal

  const fetchArchivedIngredients = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/ingredients/archive/list");
      setArchivedIngredients(res.data.data || []);
    } catch (err) {
      console.error("Error fetching archived ingredients:", err);
      toast.error("Failed to fetch archived ingredients");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (ingredient) => {
    try {
      await axios.post(`/ingredients/archive/${ingredient._id}/restore`);
      toast.success(`Ingredient "${ingredient.name}" restored successfully!`);
      fetchArchivedIngredients(); // Refresh archive list
      onRefreshIngredients(); // Refresh main ingredient list
    } catch (err) {
      console.error("Error restoring ingredient:", err);
      if (err.response?.status === 400 && err.response?.data?.code === "NAME_CONFLICT") {
        toast.error(`Cannot restore: ${err.response.data.message}`);
      } else {
        toast.error("Failed to restore ingredient");
      }
    }
  };

  const handlePermanentDelete = async (ingredient) => {
    const hasRecords = ingredient.historicalRecords?.total > 0;

    if (hasRecords) {
      toast.error(`Cannot delete "${ingredient.name}" - it has ${ingredient.historicalRecords.total} historical records`);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${ingredient.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/ingredients/archive/${ingredient._id}/permanent`);
      toast.success(`Ingredient "${ingredient.name}" permanently deleted`);
      fetchArchivedIngredients(); // Refresh archive list
    } catch (err) {
      console.error("Error permanently deleting ingredient:", err);
      if (err.response?.status === 400 && err.response?.data?.code === "HAS_HISTORICAL_RECORDS") {
        toast.error(`Cannot delete: ${err.response.data.message}`);
      } else {
        toast.error("Failed to permanently delete ingredient");
      }
    }
  };

  useEffect(() => {
    if (show) {
      fetchArchivedIngredients();
    }
  }, [show]);

  const totalPages = Math.ceil(archivedIngredients.length / itemsPerPage);
  const paginatedArchived = archivedIngredients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [archivedIngredients.length]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] border border-white/40 m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Archive Management</h2>
              <p className="text-sm text-gray-600">Restore or permanently delete</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : archivedIngredients.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No Archived Ingredients</p>
              <p className="text-gray-600">All ingredients are currently active</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Unit</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Archived Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Historical Records</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedArchived.map((ingredient) => (
                      <tr key={ingredient._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ingredient.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ingredient.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(ingredient.deletedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ingredient.historicalRecords?.total > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-orange-600">
                                {ingredient.historicalRecords.total} records
                              </span>
                              <span className="text-xs text-gray-500">
                                {ingredient.historicalRecords.spoilage} spoilage, {ingredient.historicalRecords.stockIn} stock-in
                              </span>
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium">No records</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleRestore(ingredient)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                              title="Restore ingredient"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(ingredient)}
                              disabled={ingredient.historicalRecords?.total > 0}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${ingredient.historicalRecords?.total > 0
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              title={
                                ingredient.historicalRecords?.total > 0
                                  ? "Cannot delete - has historical records"
                                  : "Permanently delete ingredient"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Section */}
          {archivedIngredients.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={archivedIngredients.length}
            />
          )}

          {/* Info Section */}
          {archivedIngredients.length > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Archive Management Guide</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span><strong>Restore:</strong> Makes the ingredient active again (if no name conflict)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span><strong>Delete:</strong> Permanently removes ingredient (only if no historical records)</span>
                </div>
                <div className="mt-2 text-xs">
                  <strong>Note:</strong> Ingredients with historical records (spoilage/stock-in) cannot be permanently deleted to preserve audit trails.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;