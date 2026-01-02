// components/modals/SpoilageModal.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";

const SpoilageModal = ({
  show,
  onClose,
  onSubmit,
  ingredientsList = [],
  usersList = [],
  viewMode = false,
  spoilageData = null,
}) => {
  // try to read logged-in user from localStorage; keep optional chaining safe
  const loggedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  // form state
  const [form, setForm] = useState({
    personInCharge: loggedUser?._id || "", // auto-filled assigned personnel
    ingredients: [], // { ingredient, name, quantity, unit }
    remarks: "",
  });

  // UI state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // category selected by user for filtering ingredients
  const [selectedCategory, setSelectedCategory] = useState("");
  
  // State for expired batches
  const [expiredBatches, setExpiredBatches] = useState([]);
  const [showExpiredBatches, setShowExpiredBatches] = useState(false);
  const [loadingExpiredBatches, setLoadingExpiredBatches] = useState(false);
  const [expiredBatchesFetched, setExpiredBatchesFetched] = useState(false);

  // State for batch deduction preview
  const [batchDeductions, setBatchDeductions] = useState({});
  const [loadingBatchDeductions, setLoadingBatchDeductions] = useState({});

  // derived filtered ingredients for the chosen category
  // NOTE: user said the category field name in ingredient objects is "Item"
  const filteredIngredients = selectedCategory
    ? ingredientsList.filter((i) => i.category === selectedCategory)
    : [];

  // Fetch expired batches with proper error handling and request limiting
  const fetchExpiredBatches = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loadingExpiredBatches) {
      return;
    }

    try {
      setLoadingExpiredBatches(true);
      const response = await axios.get("/batches/expired-for-spoilage");
      if (response.data.success) {
        setExpiredBatches(response.data.data.expiredBatches || []);
      } else {
        setExpiredBatches([]);
      }
      setExpiredBatchesFetched(true);
    } catch (error) {
      console.error("Error fetching expired batches:", error);
      // Don't show error toast if it's just no expired batches or network issues
      if (error.response?.status !== 404 && error.code !== 'ERR_NETWORK') {
        console.warn("Could not fetch expired batches, continuing without them");
      }
      setExpiredBatches([]);
      setExpiredBatchesFetched(true);
    } finally {
      setLoadingExpiredBatches(false);
    }
  }, [loadingExpiredBatches]);

  // NEW: Add expired batch to spoilage
  const addExpiredBatch = (batch) => {
    const existingItem = form.ingredients.find(
      (i) => i.ingredient === batch.ingredient._id
    );
    
    if (existingItem) {
      // Update existing item quantity
      setForm({
        ...form,
        ingredients: form.ingredients.map((i) =>
          i.ingredient === batch.ingredient._id
            ? { ...i, quantity: Number(i.quantity) + batch.currentQuantity }
            : i
        ),
      });
    } else {
      // Add new item
      setForm({
        ...form,
        ingredients: [
          ...form.ingredients,
          {
            ingredient: batch.ingredient._id,
            name: batch.ingredient.name,
            quantity: batch.currentQuantity,
            unit: batch.unit,
            batchNumber: batch.batchNumber,
            spoilageReason: "expired",
          },
        ],
      });
    }
    
    toast.success(`Added expired batch: ${batch.batchNumber}`);
  };

  // Fetch batch deduction preview for FIFO
  const fetchBatchDeduction = async (ingredientId, quantity, unit) => {
    if (!ingredientId || !quantity || quantity <= 0) {
      setBatchDeductions(prev => ({ ...prev, [ingredientId]: null }));
      return;
    }

    try {
      setLoadingBatchDeductions(prev => ({ ...prev, [ingredientId]: true }));
      
      // Get active batches for this ingredient in FIFO order
      const response = await axios.get(`/batches/ingredient/${ingredientId}?includeExpired=false`);
      
      if (response.data.success) {
        const activeBatches = response.data.data.batches.filter(
          batch => batch.status === 'active' && batch.currentQuantity > 0
        ).sort((a, b) => new Date(a.stockInDate) - new Date(b.stockInDate)); // FIFO order

        // Calculate which batches will be deducted
        let remainingToDeduct = parseFloat(quantity);
        const deductionPlan = [];
        let totalAvailable = 0;

        for (const batch of activeBatches) {
          totalAvailable += batch.currentQuantity;
          
          if (remainingToDeduct <= 0) break;
          
          const deductFromThisBatch = Math.min(remainingToDeduct, batch.currentQuantity);
          
          deductionPlan.push({
            batchNumber: batch.batchNumber,
            currentQuantity: batch.currentQuantity,
            deductQuantity: deductFromThisBatch,
            remainingAfter: batch.currentQuantity - deductFromThisBatch,
            expirationDate: batch.expirationDate,
            stockInDate: batch.stockInDate,
            unit: batch.unit
          });
          
          remainingToDeduct -= deductFromThisBatch;
        }

        setBatchDeductions(prev => ({
          ...prev,
          [ingredientId]: {
            deductionPlan,
            totalAvailable,
            requestedQuantity: parseFloat(quantity),
            isInsufficient: remainingToDeduct > 0,
            unit
          }
        }));
      } else {
        console.warn("Failed to fetch batches:", response.data.message);
        setBatchDeductions(prev => ({ ...prev, [ingredientId]: null }));
      }
    } catch (error) {
      console.error("Error fetching batch deduction:", error);
      // Don't show error toast for batch deduction failures, just log it
      setBatchDeductions(prev => ({ ...prev, [ingredientId]: null }));
    } finally {
      setLoadingBatchDeductions(prev => ({ ...prev, [ingredientId]: false }));
    }
  };

  // when opening in view mode, initialize form from spoilageData
  useEffect(() => {
    if (viewMode && spoilageData) {
      setForm({
        personInCharge: spoilageData.personInCharge?._id || loggedUser?._id || "",
        ingredients:
          spoilageData.ingredients?.map((i) => ({
            ingredient: i.ingredient?._id || i.ingredient,
            name: i.ingredient?.name || "Unknown",
            quantity: i.quantity || 0,
            unit: i.unit || "",
          })) || [],
        remarks: spoilageData.remarks || "",
      });

      // derive category? keep as empty (view shows actual items)
      setSelectedCategory("");
    }
  }, [viewMode, spoilageData, loggedUser]);

  // ensure personInCharge is set to logged user on modal open in create mode
  useEffect(() => {
    if (show && !viewMode) {
      setForm((prev) => ({
        ...prev,
        personInCharge: loggedUser?._id || prev.personInCharge || "",
      }));
      
      // Fetch expired batches when modal opens (only once)
      if (!expiredBatchesFetched && !loadingExpiredBatches) {
        fetchExpiredBatches();
      }
    }
  }, [show, viewMode, loggedUser?._id, expiredBatchesFetched, loadingExpiredBatches, fetchExpiredBatches]);

  // Close ingredient dropdown if clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!show) {
      // Clear batch deduction state when modal closes
      setBatchDeductions({});
      setLoadingBatchDeductions({});
      // Reset expired batches fetch flag
      setExpiredBatchesFetched(false);
      setExpiredBatches([]);
      // Clear any pending timeout
      if (window.batchDeductionTimeout) {
        clearTimeout(window.batchDeductionTimeout);
      }
    }
  }, [show]);

  // toggle ingredient selection (add/remove)
  const toggleIngredient = (ingredient) => {
    const exists = form.ingredients.find((i) => i.ingredient === ingredient._id);
    if (exists) {
      // Remove ingredient and clear its batch deduction
      setForm({
        ...form,
        ingredients: form.ingredients.filter((i) => i.ingredient !== ingredient._id),
      });
      setBatchDeductions(prev => ({ ...prev, [ingredient._id]: null }));
      setLoadingBatchDeductions(prev => ({ ...prev, [ingredient._id]: false }));
    } else {
      // Add ingredient with default quantity
      const newIngredient = {
        ingredient: ingredient._id,
        name: ingredient.name,
        quantity: 1,
        unit: ingredient.unit,
        spoilageReason: "damaged", // Default reason for manually added items
      };
      
      setForm({
        ...form,
        ingredients: [...form.ingredients, newIngredient],
      });
      
      // Automatically fetch batch deduction for the default quantity
      setTimeout(() => {
        fetchBatchDeduction(ingredient._id, 1, ingredient.unit);
      }, 100);
    }
  };

  // handle quantity change for a selected ingredient
  const handleQuantityChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, quantity: value } : i
      ),
    });

    // Fetch batch deduction preview for this ingredient (only for manually added items, not expired batches)
    const ingredient = form.ingredients.find(i => i.ingredient === id);
    if (ingredient && !ingredient.batchNumber && value && parseFloat(value) > 0) {
      // Debounce the API call to avoid too many requests
      clearTimeout(window.batchDeductionTimeout);
      window.batchDeductionTimeout = setTimeout(() => {
        fetchBatchDeduction(id, value, ingredient.unit);
      }, 500);
    } else {
      setBatchDeductions(prev => ({ ...prev, [id]: null }));
    }
  };

  // NEW: handle spoilage reason change
  const handleSpoilageReasonChange = (id, reason) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, spoilageReason: reason } : i
      ),
    });
  };

  // remove ingredient chip
  const removeIngredient = (id) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((i) => i.ingredient !== id),
    });
    
    // Clean up batch deduction state for removed ingredient
    setBatchDeductions(prev => ({ ...prev, [id]: null }));
    setLoadingBatchDeductions(prev => ({ ...prev, [id]: false }));
  };

  // validate & submit
  const handleSubmit = (e) => {
    e.preventDefault();

    // ensure assigned personnel exists; if not, try to use loggedUser
    if (!form.personInCharge && loggedUser?._id) {
      setForm((prev) => ({ ...prev, personInCharge: loggedUser._id }));
    }

    // assigned personnel should always be present now (auto-filled)
    if (!form.personInCharge) {
      alert("Assigned Personnel is not set. Please login or contact admin.");
      return;
    }

    if (form.ingredients.length === 0) {
      alert("Please select at least one ingredient.");
      return;
    }

    // calculate total waste as sum of quantities
    const totalWaste = form.ingredients.reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );

    const payload = {
      personInCharge: form.personInCharge,
      ingredients: form.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unit: i.unit,
        spoilageReason: i.spoilageReason || "other",
        batchNumber: i.batchNumber || null,
      })),
      totalWaste,
      remarks: form.remarks || "",
    };

    onSubmit(payload);
  };

  if (!show) return null;

  // VIEW MODE (single render path)
  if (viewMode && spoilageData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Spoilage Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Assigned Personnel */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Assigned Personnel
              </label>
              <p className="text-lg">
                {spoilageData.personInCharge
                  ? `${spoilageData.personInCharge.firstName} ${spoilageData.personInCharge.lastName}`
                  : "Unknown"}
              </p>
            </div>

            {/* Date */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Date & Time</label>
              <p className="text-lg">{new Date(spoilageData.createdAt).toLocaleString()}</p>
            </div>

            {/* Spoiled Ingredients with Batch Details */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Spoiled Ingredients</label>
              {spoilageData.ingredients && spoilageData.ingredients.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {spoilageData.ingredients.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-base">
                              {item.ingredient?.name || item.ingredientSnapshot?.name || "Unknown Ingredient"}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Category: {item.ingredient?.category || item.ingredientSnapshot?.category || "Unknown"}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-red-600">
                              {item.quantity} {item.unit}
                            </div>
                            <div className="text-xs text-gray-500">Spoiled Quantity</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {/* Batch Information */}
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <div className="font-medium text-blue-900 mb-1">Batch Information</div>
                            {item.batchNumber ? (
                              <div>
                                <div className="text-blue-800 font-medium">#{item.batchNumber}</div>
                                {item.expirationDate && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Exp: {new Date(item.expirationDate).toLocaleDateString()}
                                    {new Date(item.expirationDate) < new Date() && (
                                      <span className="text-red-600 font-medium ml-1">(EXPIRED)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-blue-700 text-xs">Non-batch ingredient</div>
                            )}
                          </div>
                          
                          {/* Spoilage Reason */}
                          <div className="bg-orange-50 border border-orange-200 rounded p-3">
                            <div className="font-medium text-orange-900 mb-1">Spoilage Reason</div>
                            <div className="text-orange-800 capitalize">
                              {item.spoilageReason || "Other"}
                            </div>
                          </div>
                          

                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="mt-4 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        Total Items: {spoilageData.ingredients.length}
                      </span>
                      <span className="text-gray-600">
                        Batches Affected: {spoilageData.ingredients.filter(i => i.batchNumber).length}
                      </span>
                      <span className="font-medium text-red-600">
                        Total Waste: {spoilageData.totalWaste || spoilageData.ingredients.reduce((sum, i) => sum + (i.quantity || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No ingredients</p>
              )}
            </div>

            {/* Remarks */}
            {spoilageData.remarks && (
              <div className="border-b pb-3">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Remarks</label>
                <p className="text-gray-700 whitespace-pre-wrap">{spoilageData.remarks}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CREATE MODE RENDER
  return (  
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Record Spoilage</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Assigned Personnel (auto-filled, disabled) */}
          <div>
            <label className="block font-semibold text-sm mb-1">Assigned Personnel</label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded bg-gray-100"
              value={
                // prefer showing full name from loggedUser; fallback to usersList if available
                loggedUser?.firstName
                  ? `${loggedUser.firstName} ${loggedUser.lastName || ""}`.trim()
                  : (usersList.find((u) => u._id === form.personInCharge)
                      ? `${usersList.find((u) => u._id === form.personInCharge)?.firstName} ${usersList.find((u) => u._id === form.personInCharge)?.lastName}`
                      : "")
              }
              disabled
            />
          </div>

          {/* Category select (Material / Liquid Ingredient / Solid Ingredient) */}
          <div>
            <label className="block font-semibold text-sm mb-1">Category</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
            >
              <option value="">Select Category</option>
              <option value="Material">Material</option>
              <option value="Liquid Ingredient">Liquid Ingredient</option>
              <option value="Solid Ingredient">Solid Ingredient</option>
            </select>
          </div>

          {/* Ingredients dropdown: shows filtered items based on selectedCategory */}
          <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-sm mb-1">Items</label>

            <div
              className="border rounded px-3 py-2 bg-white cursor-pointer"
              onClick={() => {
                // only open dropdown when a category is selected
                if (selectedCategory) setDropdownOpen((v) => !v);
                else alert("Please select a category first.");
              }}
            >
              {form.ingredients.length > 0 ? (
                <div className="space-y-2">
                  {form.ingredients.map((ing) => (
                    <div
                      key={ing.ingredient}
                      className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-red-900">{ing.name}</span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeIngredient(ing.ingredient);
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <label className="text-gray-600">Qty:</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ing.quantity}
                              onChange={(e) => handleQuantityChange(ing.ingredient, e.target.value)}
                              className="w-16 text-xs border rounded px-1 py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-gray-600">{ing.unit}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-gray-600">Reason:</label>
                            <select
                              value={ing.spoilageReason || "damaged"}
                              onChange={(e) => handleSpoilageReasonChange(ing.ingredient, e.target.value)}
                              className="text-xs border rounded px-1 py-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="expired">Expired</option>
                              <option value="damaged">Damaged</option>
                              <option value="contaminated">Contaminated</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        {ing.batchNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            Batch: {ing.batchNumber}
                          </div>
                        )}
                        
                        {/* Batch Deduction Preview */}
                        {!ing.batchNumber && ing.quantity && parseFloat(ing.quantity) > 0 && (
                          <div className="mt-2">
                            {loadingBatchDeductions[ing.ingredient] ? (
                              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                                <div className="flex items-center text-gray-600">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                                  Loading batch deduction preview...
                                </div>
                              </div>
                            ) : batchDeductions[ing.ingredient] ? (
                              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <div className="font-medium text-blue-900 mb-2 flex items-center">
                                  📦 FIFO Batch Deduction Preview
                                  <span className="ml-2 text-xs font-normal text-blue-700">
                                    ({ing.quantity} {ing.unit} requested)
                                  </span>
                                </div>
                                
                                {batchDeductions[ing.ingredient].isInsufficient ? (
                                  <div className="bg-red-100 border border-red-300 rounded p-2 mb-2">
                                    <div className="text-red-700 font-medium flex items-center">
                                      ⚠️ Insufficient Stock
                                    </div>
                                    <div className="text-red-600 text-xs mt-1">
                                      Available: {batchDeductions[ing.ingredient].totalAvailable} {batchDeductions[ing.ingredient].unit} | 
                                      Requested: {batchDeductions[ing.ingredient].requestedQuantity} {batchDeductions[ing.ingredient].unit}
                                    </div>
                                    <div className="text-red-500 text-xs mt-1">
                                      Short by: {(batchDeductions[ing.ingredient].requestedQuantity - batchDeductions[ing.ingredient].totalAvailable).toFixed(2)} {batchDeductions[ing.ingredient].unit}
                                    </div>
                                  </div>
                                ) : null}
                                
                                {batchDeductions[ing.ingredient].deductionPlan?.length > 0 ? (
                                  <div className="space-y-1">
                                    {batchDeductions[ing.ingredient].deductionPlan.map((batch, index) => (
                                      <div key={batch.batchNumber} className="bg-white border border-blue-200 rounded p-2">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-medium text-blue-900">
                                              #{batch.batchNumber}
                                            </div>
                                            <div className="text-gray-600 text-xs">
                                              Stock In: {new Date(batch.stockInDate).toLocaleDateString()}
                                            </div>
                                            <div className="text-gray-600 text-xs">
                                              Expires: {new Date(batch.expirationDate).toLocaleDateString()}
                                              {new Date(batch.expirationDate) < new Date() && (
                                                <span className="text-red-600 font-medium ml-1">(EXPIRED)</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-gray-500">
                                              Current: {batch.currentQuantity} {batch.unit}
                                            </div>
                                            <div className="font-medium text-red-600">
                                              Deduct: -{batch.deductQuantity} {batch.unit}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Remaining: {batch.remainingAfter} {batch.unit}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    
                                    <div className="mt-2 pt-2 border-t border-blue-200 bg-blue-100 rounded p-2">
                                      <div className="text-xs text-blue-800 font-medium">
                                        Summary: {batchDeductions[ing.ingredient].deductionPlan.length} batch{batchDeductions[ing.ingredient].deductionPlan.length !== 1 ? 'es' : ''} will be affected
                                      </div>
                                      <div className="text-xs text-blue-700">
                                        Total deduction: {batchDeductions[ing.ingredient].requestedQuantity} {batchDeductions[ing.ingredient].unit}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                    <div className="text-yellow-700 text-center text-xs font-medium">
                                      📋 Non-Batch Ingredient
                                    </div>
                                    <div className="text-yellow-600 text-center text-xs mt-1">
                                      This ingredient doesn't use batch tracking. Quantity will be deducted from total stock.
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select items</span>
              )}
            </div>

            {dropdownOpen && (
              <div className="absolute mt-1 w-full border rounded-lg bg-white shadow-md max-h-48 overflow-y-auto z-10">
                {/* if no category selected, show a hint */}
                {!selectedCategory && (
                  <div className="p-3 text-sm text-gray-500">Select a category first.</div>
                )}

                {selectedCategory && filteredIngredients.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No items found in this category.</div>
                )}

                {selectedCategory &&
                  filteredIngredients.map((ingredient) => (
                    <div
                      key={ingredient._id}
                      onClick={() => toggleIngredient(ingredient)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>{ingredient.name}</span>
                      <span className="text-xs text-gray-400">{ingredient.unit ? ingredient.unit.toLowerCase() : ""}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Expired Batches Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-sm text-red-700">
                🚨 Expired Batches
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpiredBatchesFetched(false);
                    fetchExpiredBatches();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  disabled={loadingExpiredBatches}
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExpiredBatches(!showExpiredBatches);
                    if (!showExpiredBatches && !expiredBatchesFetched && !loadingExpiredBatches) {
                      fetchExpiredBatches();
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  {showExpiredBatches ? "Hide" : "Show"} ({expiredBatches.length})
                </button>
              </div>
            </div>
            
            {showExpiredBatches && (
              <div className="border border-red-200 rounded-lg p-3 bg-red-50 max-h-40 overflow-y-auto">
                {loadingExpiredBatches ? (
                  <div className="flex items-center justify-center text-sm text-gray-500 py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Loading expired batches...
                  </div>
                ) : expiredBatches.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-4">
                    <div className="text-green-600 font-medium">✅ No expired batches found</div>
                    <div className="text-xs text-gray-400 mt-1">All batches are within expiration dates</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-red-700 font-medium mb-2">
                      Found {expiredBatches.length} expired batch{expiredBatches.length !== 1 ? 'es' : ''}:
                    </div>
                    {expiredBatches.map((batch) => (
                      <div
                        key={batch._id}
                        className="flex items-center justify-between p-2 bg-white border border-red-200 rounded text-xs hover:bg-red-25"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-red-900">{batch.ingredient?.name || 'Unknown'}</div>
                          <div className="text-gray-600">
                            {batch.batchNumber} • {batch.currentQuantity} {batch.unit}
                          </div>
                          <div className="text-red-600">
                            Expired: {new Date(batch.expirationDate).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addExpiredBatch(batch)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                          title="Add this expired batch to spoilage"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-sm mb-1">Remarks</label>
            <textarea
              className="w-full border px-3 py-2 rounded text-sm"
              placeholder="Add remarks..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpoilageModal;
