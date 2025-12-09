import React from "react";

const IngredientModal = ({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  editingId,
  formErrors = {}, // NEW: Accept form errors prop
}) => {
  if (!show) return null;

  // NEW: Function to handle name input blur (auto-trim)
  const handleNameBlur = (e) => {
    const trimmedValue = e.target.value.trim();
    if (trimmedValue !== e.target.value) {
      setForm({ ...form, name: trimmedValue });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-2xl w-96 border border-white/40">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {editingId ? "Edit Item" : "Add Item"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block font-semibold text-sm mb-1">Item Name</label>
            <input
              type="text"
              placeholder="Name"
              className={`border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} p-2 w-full rounded focus:outline-none`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={handleNameBlur} // NEW: Auto-trim on blur
              required
              maxLength={100}
            />
            {formErrors.name && (
              <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-sm mb-1">Category</label>
            <select
              className="border border-gray-300 p-2 w-full rounded focus:outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              <option value="Solid Ingredient">Solid Ingredient</option>
              <option value="Liquid Ingredient">Liquid Ingredient</option>
              <option value="Material">Material</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-semibold text-sm mb-1">Quantity</label>
            <input
              type="number"
              placeholder="Quantity"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block font-semibold text-sm mb-1">Unit</label>
            <select
              className="border border-gray-300 p-2 w-full rounded focus:outline-none"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            >
              <option value="">Select Unit</option>
              <option value="L">l (liters)</option>
              <option value="mL">ml (milliliters)</option>
              <option value="kg">kg (kilograms)</option>
              <option value="g">g (grams)</option>
              <option value="pcs">pcs (pieces)</option>
            </select>
          </div>

          {/* Alert */}
          <div>
            <label className="block font-semibold text-sm mb-1">Alert Quantity</label>
            <input
              type="number"
              placeholder="Alert Quantity"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none"
              value={form.alert}
              onChange={(e) => setForm({ ...form, alert: e.target.value })}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              System will alert when quantity falls below this level
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className="block font-semibold text-sm mb-1">Expiration Date</label>
            <input
              type="date"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none"
              value={form.expiration}
              onChange={(e) => setForm({ ...form, expiration: e.target.value })}
            />
          </div>

          {/* NEW: Duplicate prevention info */}
          {editingId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Changing the name will check for duplicates.
                Trailing spaces are automatically trimmed.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 transition rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngredientModal;