// Updated IngredientModal component with fixes

import React, { useEffect, useRef } from "react";

const IngredientModal = ({
  show,
  onClose,
  onSubmit,
  form,
  setForm,
  editingId,
  formErrors = {},
  archiveConflict = null,
  onRestoreArchived = null,
  isLoading = false,
}) => {
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Get today's date in YYYY-MM-DD format for min date restriction
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayDate();

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  // Focus first input when modal opens
  useEffect(() => {
    if (show && firstInputRef.current && !archiveConflict) {
      firstInputRef.current.focus();
    }
  }, [show, archiveConflict]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!show) return null;

  const handleNameBlur = (e) => {
    const trimmedValue = e.target.value.trim();
    if (trimmedValue !== e.target.value) {
      setForm({ ...form, name: trimmedValue });
    }
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const unitsByCategory = {
    "Solid Ingredient": ["kg", "g", "pcs"],
    "Liquid Ingredient": ["L", "mL"],
    "Material": ["kg", "g", "pcs", "L", "mL"]
  };

  const categoryUnits = unitsByCategory[form.category] || Object.values(unitsByCategory).flat();

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-white/40 transform transition-all duration-200 scale-100 opacity-100"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-xl font-bold text-gray-900">
            {editingId ? "Edit Item" : "Add Item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {archiveConflict ? (
          <ArchiveConflictView
            conflict={archiveConflict}
            onRestore={onRestoreArchived}
            onUseDifferentName={() => {
              setForm({ ...form, name: "" });
              onClose();
            }}
            isLoading={isLoading}
          />
        ) : (
          <FormView
            form={form}
            formErrors={formErrors}
            editingId={editingId}
            onSubmit={onSubmit}
            onClose={onClose}
            handleNameBlur={handleNameBlur}
            handleInputChange={handleInputChange}
            categoryUnits={categoryUnits}
            firstInputRef={firstInputRef}
            isLoading={isLoading}
            todayDate={todayDate} // Pass today's date to FormView
          />
        )}
      </div>
    </div>
  );
};

// ... ArchiveConflictView component remains unchanged ...

// Subcomponent for Form View - UPDATED
const FormView = ({
  form,
  formErrors,
  editingId,
  onSubmit,
  onClose,
  handleNameBlur,
  handleInputChange,
  categoryUnits,
  firstInputRef,
  isLoading,
  todayDate, // NEW: Receive today's date
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-1 gap-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={firstInputRef}
          type="text"
          placeholder="Enter item name"
          className={`w-full px-3 py-2.5 border ${formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'} rounded-lg transition-colors focus:outline-none`}
          value={form.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={handleNameBlur}
          required
          maxLength={100}
          disabled={isLoading}
        />
        {formErrors.name && (
          <p className="mt-1.5 text-sm text-red-600">{formErrors.name}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          value={form.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          required
          disabled={isLoading}
        >
          <option value="">Select a category</option>
          <option value="Solid Ingredient">Solid Ingredient</option>
          <option value="Liquid Ingredient">Liquid Ingredient</option>
          <option value="Material">Material</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            placeholder="0.00"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            value={form.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            required
            min="0"
            step="0.01"
            disabled={isLoading}
          />
        </div>

        {/* Unit - UPDATED: Disabled when no category is selected */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors focus:outline-none ${
              !form.category || isLoading ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
            value={form.unit}
            onChange={(e) => handleInputChange('unit', e.target.value)}
            required
            disabled={!form.category || isLoading} // Disabled when no category
          >
            <option value="">{form.category ? "Select unit" : "Select category first"}</option>
            {categoryUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit} {unit === 'L' ? '(liters)' : unit === 'mL' ? '(milliliters)' : unit === 'kg' ? '(kilograms)' : unit === 'g' ? '(grams)' : '(pieces)'}
              </option>
            ))}
          </select>
          {!form.category && (
            <p className="mt-1.5 text-xs text-gray-500">
              Please select a category first
            </p>
          )}
        </div>
      </div>

      {/* Alert Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Alert Quantity
        </label>
        <input
          type="number"
          placeholder="0.00"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          value={form.alert}
          onChange={(e) => handleInputChange('alert', e.target.value)}
          min="0"
          step="0.01"
          disabled={isLoading}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          System will send an alert when quantity falls below this level
        </p>
      </div>

      {/* Expiration Date - UPDATED: Prevent past dates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Expiration Date
        </label>
        <div className="relative">
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            value={form.expiration}
            onChange={(e) => handleInputChange('expiration', e.target.value)}
            min={todayDate} // NEW: Prevent past dates
            disabled={isLoading}
          />
          {!form.expiration && (
            <span className="absolute right-3 top-2.5 text-sm text-gray-400 pointer-events-none" />
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Cannot select past dates
        </p>
      </div>
    </div>

    {/* Duplicate Prevention Note */}
    {editingId && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800">
            <span className="font-medium">Note:</span> Changing the name will check for duplicates. Trailing spaces are automatically trimmed.
          </p>
        </div>
      </div>
    )}

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {editingId ? 'Saving...' : 'Adding...'}
          </>
        ) : (
          editingId ? 'Save Changes' : 'Add Item'
        )}
      </button>
    </div>
  </form>
);

export default IngredientModal;