// AddonModal.jsx
import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import AlertDialog from "../../components/AlertDialog";

const AddonModal = ({
  show,
  onClose,
  onSubmit,
  onDelete, // Add this prop for handling deletion
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
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // Alert dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Calculate availability based on selected ingredient and quantity
  const calculateAvailableQuantity = (ingredientId, quantityRequired) => {
    if (!ingredientId || !quantityRequired || quantityRequired <= 0) return 0;

    const ingredient = ingredientsList.find((ing) => ing._id === ingredientId);
    if (!ingredient) return 0;

    return Math.floor(ingredient.quantity / quantityRequired);
  };

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

  // Update unit and availability when ingredient is selected
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

        // Calculate availability
        const available = calculateAvailableQuantity(
          form.ingredient,
          parseFloat(form.quantity) || 0
        );
        setAvailableQuantity(available);
      }
    } else {
      setAvailableQuantity(0);
    }
  }, [form.ingredient, form.quantity, ingredientsList]);

  // Update availability when quantity changes
  useEffect(() => {
    if (form.ingredient && form.quantity) {
      const available = calculateAvailableQuantity(
        form.ingredient,
        parseFloat(form.quantity)
      );
      setAvailableQuantity(available);
    }
  }, [form.quantity, form.ingredient]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Add-on name is required";
    if (!form.ingredient) newErrors.ingredient = "Please select an ingredient";
    if (!form.quantity || form.quantity <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!form.price || form.price <= 0)
      newErrors.price = "Valid price is required";

    // Check if ingredient has enough stock
    if (form.ingredient && form.quantity && form.quantity > 0) {
      const available = calculateAvailableQuantity(
        form.ingredient,
        parseFloat(form.quantity)
      );
      if (available <= 0) {
        newErrors.quantity = "Not enough ingredient stock available";
      }
    }

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

  const handleDeleteClick = () => {
    setDeleteConfirmation({
      show: true,
      title: "Delete Add-on",
      message: `Are you sure you want to delete "${editingAddon?.productName}"? This action cannot be undone and will affect any products using this add-on.`,
      onConfirm: () => {
        if (onDelete && editingAddon) {
          onDelete(editingAddon._id);
        }
        setDeleteConfirmation({ ...deleteConfirmation, show: false });
      },
    });
  };

  const getStockStatus = () => {
    if (availableQuantity === 0)
      return {
        text: "Out of Stock",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    if (availableQuantity <= 10)
      return {
        text: "Low Stock",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
      };
    return {
      text: "In Stock",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    };
  };

  if (!show) return null;

  const stockStatus = getStockStatus();

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog
        show={deleteConfirmation.show}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
        onCancel={() =>
          setDeleteConfirmation({ ...deleteConfirmation, show: false })
        }
        onConfirm={deleteConfirmation.onConfirm}
        confirmText="Delete"
        confirmColor="red"
        cancelText="Cancel"
      />

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header with X button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingAddon ? "Edit Add-on" : "Add New Add-on"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Add-on Name */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"
                }`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter add-on name (e.g., Extra Pearl, Cheese Foam)"
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
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ingredient ? "border-red-500" : "border-gray-300"
                }`}
              value={form.ingredient}
              onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
            >
              <option value="">Select Ingredient</option>
              {ingredientsList.map((ingredient) => (
                <option key={ingredient._id} value={ingredient._id}>
                  {ingredient.name} ({ingredient.quantity} {ingredient.unit})
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
                className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.quantity ? "border-red-500" : "border-gray-300"
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

          {/* Availability Display */}
          {form.ingredient && form.quantity && (
            <div
              className={`p-3 rounded-lg border ${stockStatus.bg} ${stockStatus.border}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Availability:
                </span>
                <span className={`text-sm font-semibold ${stockStatus.color}`}>
                  {availableQuantity} servings available
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">Status:</span>
                <span className={`text-xs font-medium ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
              </div>
              {availableQuantity <= 10 && availableQuantity > 0 && (
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Low stock alert! Only {availableQuantity} servings left.
                </p>
              )}
              {availableQuantity === 0 && (
                <p className="text-xs text-red-600 mt-2">
                  ❌ Out of stock! Please select a different ingredient or
                  adjust quantity.
                </p>
              )}
            </div>
          )}

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
                className={`w-full border rounded-lg pl-8 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? "border-red-500" : "border-gray-300"
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

          {/* Stock Information */}
          {form.ingredient && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Stock Information
              </h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span className="font-medium">
                    {ingredientsList.find((ing) => ing._id === form.ingredient)
                      ?.quantity || 0}{" "}
                    {form.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Required per serving:</span>
                  <span className="font-medium">
                    {form.quantity || 0} {form.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum servings:</span>
                  <span className="font-medium">
                    {availableQuantity} servings
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
            {/* Right side - Cancel and Submit buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  availableQuantity === 0 && form.ingredient && form.quantity
                }
              >
                {editingAddon ? "Update Add-on" : "Create Add-on"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddonModal;
