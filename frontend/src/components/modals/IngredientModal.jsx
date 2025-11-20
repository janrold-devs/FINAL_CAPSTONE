import React from "react";

const IngredientModal = ({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  editingId,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-2xl w-96 border border-white/40">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {editingId ? "Edit Ingredient" : "Add Ingredient"}
        </h2>
{/*todo: change the unit to dropdown it should contain L, mL, kg, g, pcs */}
{/*todo: remove remarks*/}
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block font-semibold text-sm mb-1">Ingredient Name</label>
          <input
            type="text"
            placeholder="Name"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label className="block font-semibold text-sm mb-1">Quantity</label>
          <input
            type="number"
            placeholder="Quantity"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <label className="block font-semibold text-sm mb-1">Unit</label>
          <input
            type="text"
            placeholder="Unit (e.g., kg, ml, pcs)"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            required
          />
          <label className="block font-semibold text-sm mb-1">Alert Quantity</label>
          <input
            type="number"
            placeholder="Alert Quantity"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.alert}
            onChange={(e) => setForm({ ...form, alert: e.target.value })}
          />
          
          <label className="block font-semibold text-sm mb-1">Expiration Date</label>
          <input
            type="date"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.expiration}
            onChange={(e) => setForm({ ...form, expiration: e.target.value })}
          />
          <label className="block font-semibold text-sm mb-1">Remarks</label>
          <input
            type="text"
            placeholder="Remarks"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
