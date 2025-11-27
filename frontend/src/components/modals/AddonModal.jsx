// AddonModal.jsx
import React, { useState, useEffect } from "react";

const AddonModal = ({
  show,
  onClose,
  onSubmit,
  editingAddon,
  ingredientsList,
}) => {
  const [form, setForm] = useState({
    name: "",
    ingredient: "",
    quantity: "",
    unit: "",
    price: "",
  });

  const [errors, setErrors] = useState({});

  // Prefill when editing
  useEffect(() => {
    if (editingAddon) {
      setForm({
        name: editingAddon.productName || "",
        ingredient:
          editingAddon.ingredients?.[0]?.ingredient?._id ||
          editingAddon.ingredients?.[0]?.ingredient ||
          "",
        quantity: editingAddon.ingredients?.[0]?.quantity || "",
        unit: editingAddon.ingredients?.[0]?.ingredient?.unit || "",
        price: editingAddon.sizes?.[0]?.price || "",
      });
    } else {
      setForm({
        name: "",
        ingredient: "",
        quantity: "",
        unit: "",
        price: "",
      });
    }
    setErrors({});
  }, [editingAddon]);

  // Update unit when ingredient is selected
  useEffect(() => {
    if (form.ingredient) {
      const selectedIngredient = ingredientsList.find(
        (ing) => ing._id === form.ingredient
      );
      if (selectedIngredient) {
        setForm((prev) => ({
          ...prev,
          unit: selectedIngredient.unit,
        }));
      }
    }
  }, [form.ingredient, ingredientsList]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Add-on name is required";
    if (!form.ingredient) newErrors.ingredient = "Please select an ingredient";
    if (!form.quantity || form.quantity <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!form.price || form.price <= 0)
      newErrors.price = "Valid price is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const formData = {
      productName: form.name,
      category: "Add-ons",
      isAddon: true,
      status: "available",
      sizes: [{ size: 1, price: parseFloat(form.price) }],
      ingredients: [
        {
          ingredient: form.ingredient,
          quantity: parseFloat(form.quantity),
        },
      ],
    };

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingAddon ? "Edit Add-on" : "Add New Add-on"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Add-on Name */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter add-on name"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Ingredient Selection */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Ingredient <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.ingredient ? "border-red-500" : "border-gray-300"
              }`}
              value={form.ingredient}
              onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
            >
              <option value="">Select Ingredient</option>
              {ingredientsList.map((ingredient) => (
                <option key={ingredient._id} value={ingredient._id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            {errors.ingredient && (
              <p className="text-red-500 text-xs mt-1">{errors.ingredient}</p>
            )}
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 text-sm mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? "border-red-500" : "border-gray-300"
                }`}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0.00"
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-gray-700 text-sm mb-2">
                Unit
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 cursor-not-allowed"
                value={form.unit}
                readOnly
                placeholder="Auto-filled"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`w-full border rounded-lg pl-8 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? "border-red-500" : "border-gray-300"
                }`}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-xs mt-1">{errors.price}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              {editingAddon ? "Update Add-on" : "Create Add-on"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddonModal;
