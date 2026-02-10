// Updated StockInModal.jsx - handles both create and view
import React, { useState, useRef, useEffect } from "react";
import { Package, Calendar, CheckCircle } from "lucide-react";

// Helper function to get compatible units for a base unit
const getCompatibleUnits = (baseUnit) => {
  const normalizedBase = baseUnit.toLowerCase();
  const unitGroups = {
    g: ['g', 'kg'],
    kg: ['g', 'kg'],
    ml: ['ml', 'l'],
    l: ['ml', 'l'],
    pcs: ['pcs'],
    pc: ['pcs'],
    piece: ['pcs'],
    pieces: ['pcs']
  };
  return unitGroups[normalizedBase] || [baseUnit];
};

// Helper function to convert quantity for preview
const convertQuantity = (value, fromUnit, toUnit) => {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  if (from === to) return value;

  // Weight conversions
  if (from === 'kg' && to === 'g') return value * 1000;
  if (from === 'g' && to === 'kg') return value / 1000;

  // Volume conversions
  if (from === 'l' && to === 'ml') return value * 1000;
  if (from === 'ml' && to === 'l') return value / 1000;

  return value;
};

const StockInModal = ({
  show,
  onClose,
  onSubmit,
  ingredientsList,
  usersList,
  viewMode = false,
  stockInData = null,
  preSelectedIngredient = null, // New prop for pre-selecting ingredient
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

  // Initialize with pre-selected ingredient if provided
  useEffect(() => {
    if (preSelectedIngredient && show && !viewMode) {
      // Set the category based on the pre-selected ingredient
      setSelectedCategory(preSelectedIngredient.category);

      // Pre-select the ingredient
      const isPerishable = preSelectedIngredient.category === "Solid Ingredient" ||
        preSelectedIngredient.category === "Liquid Ingredient";

      let expirationDate = null;
      if (isPerishable) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expirationDate = tomorrow.toISOString().split('T')[0];
      }

      setForm({
        ...form,
        ingredients: [{
          ingredient: preSelectedIngredient._id,
          name: preSelectedIngredient.name,
          quantity: 1,
          unit: preSelectedIngredient.unit.toLowerCase(),
          inputUnit: preSelectedIngredient.unit.toLowerCase(), // User-selected unit for display
          expirationDate: expirationDate,
        }]
      });
    } else if (!preSelectedIngredient && show && !viewMode) {
      // Reset form if no pre-selected ingredient
      setForm({
        stockman: JSON.parse(localStorage.getItem("user"))?._id || "",
        ingredients: [],
      });
      setSelectedCategory("");
    }
  }, [preSelectedIngredient, show, viewMode]);

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
            expirationDate: i.expirationDate || null,
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
      // For perishable items, set default expiration date
      // For non-perishable items, leave expirationDate as null
      const isPerishable = ingredient.category === "Solid Ingredient" ||
        ingredient.category === "Liquid Ingredient";

      let expirationDate = null;
      if (isPerishable) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expirationDate = tomorrow.toISOString().split('T')[0];
      }

      setForm({
        ...form,
        ingredients: [
          ...form.ingredients,
          {
            ingredient: ingredient._id,
            name: ingredient.name,
            quantity: 1,
            unit: ingredient.unit.toLowerCase(),
            inputUnit: ingredient.unit.toLowerCase(), // User-selected unit for display
            expirationDate: expirationDate, // Can be null for non-perishable
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

  // Input unit change handler
  const handleInputUnitChange = (id, newUnit) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, inputUnit: newUnit } : i
      ),
    });
  };

  // Expiration date change
  const handleExpirationChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? {
          ...i,
          expirationDate: value || null // Set to null if empty
        } : i
      ),
    });
  };

  // Get today's date for min date validation
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if ingredient is perishable (needs expiration date)
  const isIngredientPerishable = (ingredient) => {
    const ingredientData = ingredientsList.find(i => i._id === ingredient.ingredient);
    if (!ingredientData) return false;

    // Perishable if it's Solid Ingredient or Liquid Ingredient
    return ingredientData.category === "Solid Ingredient" ||
      ingredientData.category === "Liquid Ingredient";
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate that perishable ingredients have expiration dates
    const missingExpiration = form.ingredients.find(i => {
      if (isIngredientPerishable(i) && !i.expirationDate) {
        return true;
      }
      return false;
    });

    if (missingExpiration) {
      alert(`${missingExpiration.name} requires an expiration date because it's a perishable ingredient.`);
      return;
    }

    onSubmit({
      stockman: form.stockman,
      ingredients: form.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unit: i.inputUnit || i.unit, // Send user-selected unit for backend conversion
        expirationDate: i.expirationDate || null, // Send null if not provided
      })),
    });
  };

  if (!show) return null;

  // VIEW MODE UI
  if (viewMode && stockInData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stock-In Details</h2>
                <p className="text-sm text-gray-600">Batch Information & Items</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Batch Number</p>
                    <p className="text-lg font-bold text-blue-800">{stockInData.batchNumber}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">
                      {stockInData.stockman?.firstName?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Stockman</p>
                    <p className="text-lg font-bold text-green-800">
                      {stockInData.stockman
                        ? `${stockInData.stockman.firstName} ${stockInData.stockman.lastName}`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">Date & Time</p>
                    <p className="text-lg font-bold text-purple-800">
                      {new Date(stockInData.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                    <p className="text-xs text-purple-600">
                      {new Date(stockInData.date).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Items</h3>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                  {form.ingredients.length} item{form.ingredients.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.ingredients.map((item, index) => {
                  const hasExpiration = item.expirationDate;
                  const isExpired = hasExpiration && new Date(item.expirationDate) < new Date();
                  const isExpiringSoon = hasExpiration && !isExpired &&
                    new Date(item.expirationDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                  return (
                    <div
                      key={item.ingredient || index}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600">{item.quantity}</span>
                            <span className="text-sm text-gray-600 font-medium">{item.unit}</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>

                      {/* Expiration Info */}
                      {hasExpiration ? (
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${isExpired
                          ? 'bg-red-50 border border-red-200'
                          : isExpiringSoon
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-green-50 border border-green-200'
                          }`}>
                          <Calendar className={`w-4 h-4 ${isExpired
                            ? 'text-red-600'
                            : isExpiringSoon
                              ? 'text-yellow-600'
                              : 'text-green-600'
                            }`} />
                          <div>
                            <p className={`text-xs font-medium ${isExpired
                              ? 'text-red-900'
                              : isExpiringSoon
                                ? 'text-yellow-900'
                                : 'text-green-900'
                              }`}>
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expires Soon' : 'Fresh'}
                            </p>
                            <p className={`text-xs ${isExpired
                              ? 'text-red-700'
                              : isExpiringSoon
                                ? 'text-yellow-700'
                                : 'text-green-700'
                              }`}>
                              {new Date(item.expirationDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-gray-600" />
                          <p className="text-xs font-medium text-gray-700">Non-perishable</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold">New Stock-In</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-sm text-gray-500 mb-4">
              Batch number will be auto-generated.
            </div>

            {/* Stockman Field */}
            <div>
              <label className="block font-semibold text-sm mb-2">Stockman</label>
              <select
                className="w-full border border-gray-300 px-3 py-2 rounded-lg bg-gray-100"
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
            </div>

            {/* Ingredients & Materials Section */}
            <div>
              <label className="block font-semibold text-sm mb-2">
                Ingredients & Materials <span className="text-red-500">*</span>
              </label>

              {/* Filter by Category */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Filter by Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Solid Ingredient">Solid Ingredient</option>
                  <option value="Liquid Ingredient">Liquid Ingredient</option>
                  <option value="Material">Material</option>
                </select>
              </div>

              {/* Select Ingredients */}
              {selectedCategory && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">Select Ingredients/Materials</label>

                  {/* Ingredient Dropdown - Moved to top */}
                  <div className="mb-4 relative" ref={dropdownRef}>
                    {/*
                      Dynamic label:
                      - If Material -> "Click to add materials"
                      - If Solid/Liquid (or other) -> "Click to add ingredients"
                      - When open -> "Click to close"
                    */}
                    <div
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <span className="text-gray-600">
                        {dropdownOpen
                          ? "Click to close"
                          : selectedCategory === "Material"
                            ? "Click to add materials"
                            : "Click to add ingredients"}
                      </span>
                    </div>

                    {dropdownOpen && (
                      <div className="absolute mt-1 left-0 right-0 border border-gray-300 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto z-50">
                        {filteredIngredients.length > 0 ? (
                          filteredIngredients.map((ingredient) => {
                            const isSelected = form.ingredients.some(i => i.ingredient === ingredient._id);
                            return (
                              <div
                                key={ingredient._id}
                                onClick={() => toggleIngredient(ingredient)}
                                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${isSelected ? 'bg-blue-100 text-blue-900' : ''
                                  }`}
                              >
                                <span className="font-medium">{ingredient.name}</span>
                                <span className="text-sm text-gray-500">
                                  {ingredient.unit ? ingredient.unit.toLowerCase() : ""}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="p-4 text-gray-500 text-center">
                            No ingredients found in this category
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* All Selected Ingredients Display - Grouped by Category */}
                  <div className="border border-gray-300 rounded-lg p-4 min-h-[120px] bg-gray-50">
                    {form.ingredients.length > 0 ? (
                      <div className="space-y-4">
                        {/* Group ingredients by category */}
                        {["Solid Ingredient", "Liquid Ingredient", "Material"].map(category => {
                          const categoryIngredients = form.ingredients.filter(ing => {
                            const ingredientData = ingredientsList.find(i => i._id === ing.ingredient);
                            return ingredientData && ingredientData.category === category;
                          });

                          if (categoryIngredients.length === 0) return null;

                          return (
                            <div key={category} className="space-y-2">
                              {/* Category Header */}
                              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-300 pb-1">
                                {category}
                              </h4>

                              {/* Ingredients in this category */}
                              <div className="flex flex-wrap gap-3">
                                {categoryIngredients.map((ing) => {
                                  const isPerishable = category === "Solid Ingredient" ||
                                    category === "Liquid Ingredient";

                                  return (
                                    <div
                                      key={ing.ingredient}
                                      className="bg-blue-100 border border-blue-300 rounded-lg p-3 flex items-center gap-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-blue-900">{ing.name}</span>
                                        <input
                                          type="number"
                                          min="1"
                                          step="0.01"
                                          value={ing.quantity}
                                          onChange={(e) =>
                                            handleQuantityChange(ing.ingredient, e.target.value)
                                          }
                                          className="w-16 text-sm border border-blue-300 rounded px-2 py-1 text-center"
                                        />
                                        <select
                                          value={ing.inputUnit || ing.unit}
                                          onChange={(e) => handleInputUnitChange(ing.ingredient, e.target.value)}
                                          className="text-sm border border-blue-300 rounded px-2 py-1 bg-white text-blue-700 font-medium"
                                        >
                                          {getCompatibleUnits(ing.unit).map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                          ))}
                                        </select>
                                        {ing.inputUnit && ing.inputUnit.toLowerCase() !== ing.unit.toLowerCase() && (
                                          <span className="text-xs text-blue-600 italic">
                                            = {convertQuantity(ing.quantity, ing.inputUnit, ing.unit).toFixed(2)} {ing.unit}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          className="text-red-500 hover:text-red-700 ml-2"
                                          onClick={() => toggleIngredient({ _id: ing.ingredient })}
                                        >
                                          ×
                                        </button>
                                      </div>

                                      {/* Expiration Date for Perishable Items */}
                                      {isPerishable && (
                                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-blue-300">
                                          <label className="text-xs text-blue-700">Expires:</label>
                                          <input
                                            type="date"
                                            value={ing.expirationDate || ''}
                                            onChange={(e) =>
                                              handleExpirationChange(ing.ingredient, e.target.value)
                                            }
                                            min={getTodayDate()}
                                            className="text-xs border border-blue-300 rounded px-2 py-1"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <p>No ingredients selected</p>
                        <p className="text-sm">Choose ingredients from the dropdown above</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={form.ingredients.length === 0}
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create Stock-In
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockInModal;