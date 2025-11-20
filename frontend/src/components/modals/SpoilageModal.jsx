import React, { useState, useRef, useEffect } from "react";

const SpoilageModal = ({ 
  show, 
  onClose, 
  onSubmit, 
  ingredientsList, 
  usersList,
  viewMode = false,
  spoilageData = null 
}) => {
  const [form, setForm] = useState({
    personInCharge: "",
    ingredients: [],
    remarks: "",
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Initialize form for view mode
  useEffect(() => {
    if (viewMode && spoilageData) {
      setForm({
        personInCharge: spoilageData.personInCharge?._id || "",
        ingredients: spoilageData.ingredients?.map(i => ({
          ingredient: i.ingredient?._id || i.ingredient,
          name: i.ingredient?.name || "Unknown",
          quantity: i.quantity || 0,
          unit: i.unit || "",
        })) || [],
        remarks: spoilageData.remarks || "",
      });
    }
  }, [viewMode, spoilageData]);

  // Close dropdown when clicking outside

  // Initialize form for view mode
  useEffect(() => {
    if (viewMode && spoilageData) {
      setForm({
        personInCharge: spoilageData.personInCharge?._id || "",
        ingredients: spoilageData.ingredients?.map(i => ({
          ingredient: i.ingredient?._id || i.ingredient,
          name: i.ingredient?.name || "Unknown",
          quantity: i.quantity || 0,
          unit: i.unit || "",
        })) || [],
        remarks: spoilageData.remarks || "",
      });
    }
  }, [viewMode, spoilageData]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle ingredient selection
  const toggleIngredient = (ingredient) => {
    const exists = form.ingredients.find((i) => i.ingredient === ingredient._id);
    if (exists) {
      setForm({
        ...form,
        ingredients: form.ingredients.filter((i) => i.ingredient !== ingredient._id),
      });
    } else {
      setForm({
        ...form,
        ingredients: [
          ...form.ingredients,
          {
            ingredient: ingredient._id,
            name: ingredient.name,
            quantity: 1,
            unit: ingredient.unit,
          },
        ],
      });
    }
  };

  // Quantity and unit change
  const handleQuantityChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, quantity: value } : i
      ),
    });
  };

  const handleUnitChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, unit: value } : i
      ),
    });
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.personInCharge) {
      alert("Please select a person in charge.");
      return;
    }
    
    if (form.ingredients.length === 0) {
      alert("Please select at least one ingredient.");
      return;
    }
    
    // Calculate total waste (sum of all quantities)
    const totalWaste = form.ingredients.reduce((sum, i) => sum + Number(i.quantity), 0);
    
    const payload = {
      personInCharge: form.personInCharge,
      ingredients: form.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unit: i.unit,
      })),
      totalWaste: totalWaste,
      remarks: form.remarks || "",
    };
    
    console.log("Submitting spoilage payload:", payload);
    onSubmit(payload);
  };

  if (!show) return null;

  // VIEW MODE RENDER
  if (viewMode && spoilageData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        {/**todo: the person in charge automically who is the user logged in */}
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Spoilage Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Person in Charge */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Person in Charge
              </label>
              <p className="text-lg">
                {spoilageData.personInCharge
                  ? `${spoilageData.personInCharge.firstName} ${spoilageData.personInCharge.lastName}`
                  : "Unknown"}
              </p>
            </div>

            {/* Date */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Date & Time
              </label>
              <p className="text-lg">
                {new Date(spoilageData.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Spoiled Ingredients
              </label>
              {spoilageData.ingredients && spoilageData.ingredients.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Ingredient</th>
                        <th className="text-right py-2">Quantity</th>
                        <th className="text-right py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spoilageData.ingredients.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2">
                            {item.ingredient?.name || "Unknown"}
                          </td>
                          <td className="text-right py-2 font-medium">
                            {item.quantity}
                          </td>
                          <td className="text-right py-2 text-gray-600">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No ingredients</p>
              )}
            </div>

            {/* Remarks */}
            {spoilageData.remarks && (
              <div className="border-b pb-3">
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Remarks
                </label>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {spoilageData.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CREATE MODE RENDER

  // VIEW MODE RENDER
  if (viewMode && spoilageData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Spoilage Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Person in Charge */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Person in Charge
              </label>
              <p className="text-lg">
                {spoilageData.personInCharge
                  ? `${spoilageData.personInCharge.firstName} ${spoilageData.personInCharge.lastName}`
                  : "Unknown"}
              </p>
            </div>

            {/* Date */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Date & Time
              </label>
              <p className="text-lg">
                {new Date(spoilageData.date).toLocaleString()}
              </p>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Spoiled Ingredients
              </label>
              {spoilageData.ingredients && spoilageData.ingredients.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Ingredient</th>
                        <th className="text-right py-2">Quantity</th>
                        <th className="text-right py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spoilageData.ingredients.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2">
                            {item.ingredient?.name || "Unknown"}
                          </td>
                          <td className="text-right py-2 font-medium">
                            {item.quantity}
                          </td>
                          <td className="text-right py-2 text-gray-600">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No ingredients</p>
              )}
            </div>

            {/* Remarks */}
            {spoilageData.remarks && (
              <div className="border-b pb-3">
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Remarks
                </label>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {spoilageData.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
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
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Record Spoilage</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block font-semibold text-sm mb-1">
            Person in Charge
          </label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={form.personInCharge}
            onChange={(e) => setForm({ ...form, personInCharge: e.target.value })}
            required
          >
            <option value="">Select Person in Charge</option>
            {usersList.map((user) => (
              <option key={user._id} value={user._id}>
                {`${user.firstName} ${user.lastName}`}
              </option>
            ))}
          </select>

          {/* Ingredients dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-sm mb-1">Ingredients</label>
            <div
              className="border rounded px-3 py-2 bg-white cursor-pointer"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {form.ingredients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.ingredients.map((ing) => (
                    <div
                      key={ing.ingredient}
                      className="flex items-center bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full gap-1"
                    >
                      <span>{ing.name}</span>
                      <input
                        type="number"
                        min="1"
                        value={ing.quantity}
                        onChange={(e) =>
                          handleQuantityChange(ing.ingredient, e.target.value)
                        }
                        className="w-12 text-xs border rounded px-1 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) =>
                          handleUnitChange(ing.ingredient, e.target.value)
                        }
                        className="text-xs border rounded px-1 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="ml">ml</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="pcs">pcs</option>
                      </select>
                      <button
                        type="button"
                        className="text-red-500 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIngredient({ _id: ing.ingredient });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select ingredients</span>
              )}
            </div>

            {dropdownOpen && (
              <div className="absolute mt-1 w-full border rounded-lg bg-white shadow-md max-h-40 overflow-y-auto z-10">
                {ingredientsList.length > 0 ? (
                  ingredientsList.map((ingredient) => (
                    <div
                      key={ingredient._id}
                      onClick={() => toggleIngredient(ingredient)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    >
                      {ingredient.name}
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-gray-500 text-sm">No ingredients found</p>
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpoilageModal;