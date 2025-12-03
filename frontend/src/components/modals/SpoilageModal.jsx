// components/modals/SpoilageModal.jsx
import React, { useState, useRef, useEffect } from "react";

/*
  SpoilageModal
  - Option B behavior implemented:
    1) User selects a Category (Material / Liquid Ingredient / Solid Ingredient)
    2) A second control shows only ingredients belonging to that category
    3) Selected ingredients appear as chips where quantity and unit can be edited
  - "Person in Charge" renamed to "Assigned Personnel"
  - Assigned Personnel is auto-filled from logged-in user (localStorage "user") and is non-editable
  - All previous behavior (view mode, payload structure, validations) preserved
  - Comments only, no emojis
*/

const SpoilageModal = ({
  show,
  onClose,
  onSubmit,
  ingredientsList = [],
  usersList = [],
  viewMode = false,
  spoilageData = null,
}) => {
  // try to read logged-in user from localStorage; keep optional chaining safe
  const loggedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  // form state
  const [form, setForm] = useState({
    personInCharge: loggedUser?._id || "", // auto-filled assigned personnel
    ingredients: [], // { ingredient, name, quantity, unit }
    remarks: "",
  });

  // UI state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // category selected by user for filtering ingredients
  const [selectedCategory, setSelectedCategory] = useState("");

  // derived filtered ingredients for the chosen category
  // NOTE: user said the category field name in ingredient objects is "Item"
  const filteredIngredients = selectedCategory
    ? ingredientsList.filter((i) => i.category === selectedCategory)
    : [];

  // when opening in view mode, initialize form from spoilageData
  useEffect(() => {
    if (viewMode && spoilageData) {
      setForm({
        personInCharge: spoilageData.personInCharge?._id || loggedUser?._id || "",
        ingredients:
          spoilageData.ingredients?.map((i) => ({
            ingredient: i.ingredient?._id || i.ingredient,
            name: i.ingredient?.name || "Unknown",
            quantity: i.quantity || 0,
            unit: i.unit || "",
          })) || [],
        remarks: spoilageData.remarks || "",
      });

      // derive category? keep as empty (view shows actual items)
      setSelectedCategory("");
    }
  }, [viewMode, spoilageData, loggedUser]);

  // ensure personInCharge is set to logged user on modal open in create mode
  useEffect(() => {
    if (show && !viewMode) {
      setForm((prev) => ({
        ...prev,
        personInCharge: loggedUser?._id || prev.personInCharge || "",
      }));
    }
  }, [show, viewMode, loggedUser]);

  // Close ingredient dropdown if clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // toggle ingredient selection (add/remove)
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
          unit: ingredient.unit.toLowerCase(), 
        },
      ],
    });
  }
};

  // handle quantity change for a selected ingredient
  const handleQuantityChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, quantity: value } : i
      ),
    });
  };

  // remove ingredient chip
  const removeIngredient = (id) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((i) => i.ingredient !== id),
    });
  };

  // validate & submit
  const handleSubmit = (e) => {
    e.preventDefault();

    // ensure assigned personnel exists; if not, try to use loggedUser
    if (!form.personInCharge && loggedUser?._id) {
      setForm((prev) => ({ ...prev, personInCharge: loggedUser._id }));
    }

    // assigned personnel should always be present now (auto-filled)
    if (!form.personInCharge) {
      alert("Assigned Personnel is not set. Please login or contact admin.");
      return;
    }

    if (form.ingredients.length === 0) {
      alert("Please select at least one ingredient.");
      return;
    }

    // calculate total waste as sum of quantities
    const totalWaste = form.ingredients.reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );

    const payload = {
      personInCharge: form.personInCharge,
      ingredients: form.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unit: i.unit,
      })),
      totalWaste,
      remarks: form.remarks || "",
    };

    onSubmit(payload);
  };

  if (!show) return null;

  // VIEW MODE (single render path)
  if (viewMode && spoilageData) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Spoilage Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Assigned Personnel */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Assigned Personnel
              </label>
              <p className="text-lg">
                {spoilageData.personInCharge
                  ? `${spoilageData.personInCharge.firstName} ${spoilageData.personInCharge.lastName}`
                  : "Unknown"}
              </p>
            </div>

            {/* Date */}
            <div className="border-b pb-3">
              <label className="block text-sm font-semibold text-gray-600 mb-1">Date & Time</label>
              <p className="text-lg">{new Date(spoilageData.createdAt).toLocaleString()}</p>
            </div>

            {/* Spoiled Ingredients */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Spoiled Ingredients</label>
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
                          <td className="py-2">{item.ingredient?.name || "Unknown"}</td>
                          <td className="text-right py-2 font-medium">{item.quantity}</td>
                          <td className="text-right py-2 text-gray-600">{item.unit.toLowerCase()}</td>                       
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
                <label className="block text-sm font-semibold text-gray-600 mb-1">Remarks</label>
                <p className="text-gray-700 whitespace-pre-wrap">{spoilageData.remarks}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
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
          {/* Assigned Personnel (auto-filled, disabled) */}
          <div>
            <label className="block font-semibold text-sm mb-1">Assigned Personnel</label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded bg-gray-100"
              value={
                // prefer showing full name from loggedUser; fallback to usersList if available
                loggedUser?.firstName
                  ? `${loggedUser.firstName} ${loggedUser.lastName || ""}`.trim()
                  : (usersList.find((u) => u._id === form.personInCharge)
                      ? `${usersList.find((u) => u._id === form.personInCharge)?.firstName} ${usersList.find((u) => u._id === form.personInCharge)?.lastName}`
                      : "")
              }
              disabled
            />
          </div>

          {/* Category select (Material / Liquid Ingredient / Solid Ingredient) */}
          <div>
            <label className="block font-semibold text-sm mb-1">Category</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                // close dropdown and reset selected chips if category changes? keep selected items (better UX: clear)
                setForm((prev) => ({ ...prev, ingredients: [] }));
              }}
            >
              <option value="">Select Category</option>
              <option value="Material">Material</option>
              <option value="Liquid Ingredient">Liquid Ingredient</option>
              <option value="Solid Ingredient">Solid Ingredient</option>
            </select>
          </div>

          {/* Ingredients dropdown: shows filtered items based on selectedCategory */}
          <div className="relative" ref={dropdownRef}>
            <label className="block font-semibold text-sm mb-1">Items</label>

            <div
              className="border rounded px-3 py-2 bg-white cursor-pointer"
              onClick={() => {
                // only open dropdown when a category is selected
                if (selectedCategory) setDropdownOpen((v) => !v);
                else alert("Please select a category first.");
              }}
            >
              {form.ingredients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.ingredients.map((ing) => (
                    <div
                      key={ing.ingredient}
                      className="flex items-center bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full gap-1"
                    >
                      <span className="max-w-[120px] truncate">{ing.name}</span>
                      <input
                        type="number"
                        min="0"
                        value={ing.quantity}
                        onChange={(e) => handleQuantityChange(ing.ingredient, e.target.value)}
                        className="w-12 text-xs border rounded px-1 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs font-medium px-1 py-0.5 bg-gray-100 rounded">
                        {ing.unit.toLowerCase()}
                      </span>
                      <button
                        type="button"
                        className="text-red-500 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeIngredient(ing.ingredient);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select items</span>
              )}
            </div>

            {dropdownOpen && (
              <div className="absolute mt-1 w-full border rounded-lg bg-white shadow-md max-h-48 overflow-y-auto z-10">
                {/* if no category selected, show a hint */}
                {!selectedCategory && (
                  <div className="p-3 text-sm text-gray-500">Select a category first.</div>
                )}

                {selectedCategory && filteredIngredients.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No items found in this category.</div>
                )}

                {selectedCategory &&
                  filteredIngredients.map((ingredient) => (
                    <div
                      key={ingredient._id}
                      onClick={() => toggleIngredient(ingredient)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>{ingredient.name}</span>
                      <span className="text-xs text-gray-400">{ingredient.unit ? ingredient.unit.toLowerCase() : ""}</span>
                    </div>
                  ))}
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpoilageModal;
