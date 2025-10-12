// Updated StockInModal.jsx - handles both create and view
import React, { useState, useRef, useEffect } from "react";

const StockInModal = ({
  show,
  onClose,
  onSubmit,
  ingredientsList,
  usersList,
  viewMode = false,
  stockInData = null,
}) => {
  const [form, setForm] = useState({
    stockman: "",
    ingredients: [],
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Initialize form for view mode
  useEffect(() => {
    if (viewMode && stockInData) {
      setForm({
        batchNumber: stockInData.batchNumber || "",
        stockman: stockInData.stockman?._id || "",
        ingredients:
          stockInData.ingredients?.map((i) => ({
            ingredient: i.ingredient?._id || i.ingredient,
            name: i.ingredient?.name || "Unknown",
            quantity: i.quantity || 0,
            unit: i.unit || "",
          })) || [],
      });
    }
  }, [viewMode, stockInData]);

  // Close dropdown when clicking outside
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
    const exists = form.ingredients.find(
      (i) => i.ingredient === ingredient._id
    );
    if (exists) {
      setForm({
        ...form,
        ingredients: form.ingredients.filter(
          (i) => i.ingredient !== ingredient._id
        ),
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

  // Quantity change
  const handleQuantityChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, quantity: value } : i
      ),
    });
  };

  // Unit change
  const handleUnitChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, unit: value } : i
      ),
    });
  };

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      stockman: form.stockman,
      ingredients: form.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unit: i.unit,
      })),
    });
  };

  if (!show) return null;

  // VIEW MODE RENDER
  if (viewMode && stockInData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Stock-In Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Batch Number */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Batch Number
              </label>
              <p className="text-lg font-medium">{stockInData.batchNumber}</p>
            </div>

            {/* Stockman */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Stockman
              </label>
              <p className="text-lg">
                {stockInData.stockman
                  ? `${stockInData.stockman.firstName} ${stockInData.stockman.lastName}`
                  : "Unknown"}
              </p>
            </div>

            {/* Date */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Date & Time
              </label>
              <p className="text-lg">
                {new Date(stockInData.date).toLocaleString()}
              </p>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Ingredients
              </label>
              {stockInData.ingredients && stockInData.ingredients.length > 0 ? (
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
                      {stockInData.ingredients.map((item, index) => (
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
        <h2 className="text-lg font-semibold mb-4">New Stock-In</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-xs text-gray-500 mb-4">
            Batch number will be auto-generated.
          </div>

          <label className="block font-semibold text-sm mb-1">Stockman</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={form.stockman}
            onChange={(e) => setForm({ ...form, stockman: e.target.value })}
            required
          >
            <option value="">Select Stockman</option>
            {usersList.map((user) => (
              <option key={user._id} value={user._id}>
                {`${user.firstName} ${user.lastName}`}
              </option>
            ))}
          </select>

          {/* Ingredients dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-sm mb-1">
              Ingredients
            </label>
            <div
              className="border rounded px-3 py-2 bg-white cursor-pointer"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {form.ingredients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.ingredients.map((ing) => (
                    <div
                      key={ing.ingredient}
                      className="flex items-center bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full gap-1"
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
                <span className="text-gray-400 text-sm">
                  Select ingredients
                </span>
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
                  <p className="p-2 text-gray-500 text-sm">
                    No ingredients found
                  </p>
                )}
              </div>
            )}
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
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockInModal;
