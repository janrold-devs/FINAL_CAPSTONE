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
  // Form state
  const [form, setForm] = useState({
    stockman: JSON.parse(localStorage.getItem("user"))?._id || "",
    ingredients: [],
  });

  // Dropdown for ingredient selection
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // New category selector for filtering
  const [selectedCategory, setSelectedCategory] = useState("");

  // Filter ingredients based on selected category
  const filteredIngredients = selectedCategory
    ? ingredientsList.filter((i) => i.category === selectedCategory)
    : [];

  // Load view-mode details
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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle ingredient inside dropdown
  const toggleIngredient = (ingredient) => {
  const exists = form.ingredients.some(
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
          unit: ingredient.unit.toLowerCase(), // Gamitin ang unit mula sa ingredient mismo
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

  // Submit handler
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

  // VIEW MODE UI
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
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Batch Number
              </label>
              <p className="text-lg font-medium">{stockInData.batchNumber}</p>
            </div>

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

            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Date & Time
              </label>
              <p className="text-lg">
                {new Date(stockInData.date).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Items
              </label>
              {form.ingredients.map((item) => (
                <div key={item.ingredient} className="border p-2 rounded mb-2">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

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

  // CREATE MODE UI
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
            className="w-full border px-3 py-2 rounded bg-gray-100"
            value={form.stockman}
            disabled
          >
            <option value="">Select Stockman</option>
            {usersList.map((user) => (
              <option key={user._id} value={user._id}>
                {`${user.firstName} ${user.lastName}`}
              </option>
            ))}
          </select>

          {/* Category Selector */}
          <label className="block font-semibold text-sm mt-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Category</option>
            <option value="Solid Ingredient">Solid Ingredient</option>
            <option value="Liquid Ingredient">Liquid Ingredient</option>
            <option value="Material">Material</option>
          </select>

          {/* Ingredient Selector (Filtered) */}
{selectedCategory && (
  <div className="relative mt-2" ref={dropdownRef}>
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
              <span className="text-xs font-medium px-1 py-0.5 bg-gray-100 rounded">
                {ing.unit}
              </span>
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
        {filteredIngredients.length > 0 ? (
          filteredIngredients.map((ingredient) => (
            <div
              key={ingredient._id}
              onClick={() => toggleIngredient(ingredient)}
               className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between"
            >
              <span>{ingredient.name}</span>
              <span className="text-xs text-gray-400">{ingredient.unit ? ingredient.unit.toLowerCase() : ""}</span>
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
)}

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
