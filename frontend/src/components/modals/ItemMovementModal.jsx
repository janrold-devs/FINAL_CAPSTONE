import React, { useState, useEffect } from "react";

const ItemMovementModal = ({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  ingredients,
  users,
  editingId,
  maxQty,
}) => {
  const [qtyError, setQtyError] = useState("");

  useEffect(() => {
    setQtyError("");
  }, [show, form.ingredient, maxQty]);

  if (!show) return null;

  const handleQuantityChange = (e) => {
    let value = e.target.value;
    if (value < 1) value = 1;
    if (maxQty && Number(value) > maxQty) {
      setQtyError(`Cannot exceed max quantity (${maxQty})`);
      value = maxQty;
    } else {
      setQtyError("");
    }
    setForm({ ...form, quantity: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (maxQty && Number(form.quantity) > maxQty) {
      setQtyError(`Cannot exceed max quantity (${maxQty})`);
      return;
    }
    setQtyError("");
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-2xl w-96 border border-white/40">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {editingId ? "Edit Item Movement" : "Add Item Movement"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block font-semibold text-sm mb-1">Name</label>
          <select
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            name="movedBy"
            value={form.movedBy}
            onChange={(e) => setForm({ ...form, movedBy: e.target.value })}
            required
          >
            <option value="">Select User</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>

          <label className="block font-semibold text-sm mb-1">Ingredient</label>
          <select
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            name="ingredient"
            value={form.ingredient}
            onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
            required
          >
            <option value="">Select Ingredient</option>
            {ingredients.map((ing) => (
              <option key={ing._id} value={ing._id}>
                {ing.name}
              </option>
            ))}
          </select>

          <label className="block font-semibold text-sm mb-1">
            Quantity{" "}
            {maxQty !== null && (
              <span className="text-xs text-gray-500">(max: {maxQty})</span>
            )}
          </label>
          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.quantity}
            onChange={handleQuantityChange}
            required
            min={1}
            max={maxQty || undefined}
            step={1}
          />
          {qtyError && (
            <div className="text-red-600 text-xs mt-1">{qtyError}</div>
          )}

          <label className="block font-semibold text-sm mb-1">Unit</label>
          <input
            type="text"
            name="unit"
            placeholder="Unit (e.g., kg, ml, pcs)"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.unit}
            readOnly
          />

          <label className="block font-semibold text-sm mb-1">Purpose</label>
          <input
            type="text"
            name="purpose"
            placeholder="Purpose"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            required
          />

          <label className="block font-semibold text-sm mb-1">
            Action Type
          </label>
          <select
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            name="actionType"
            value={form.actionType}
            onChange={(e) => setForm({ ...form, actionType: e.target.value })}
            required
          >
            <option value="">Select Action</option>
            <option value="Used">Used</option>
            <option value="Transfer">Transfer</option>
          </select>

          <label className="block font-semibold text-sm mb-1">
            Destination
          </label>
          <input
            type="text"
            name="destination"
            placeholder="Destination (for Transfer)"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            disabled={form.actionType !== "Transfer"}
          />

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
              disabled={!!qtyError}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemMovementModal;
