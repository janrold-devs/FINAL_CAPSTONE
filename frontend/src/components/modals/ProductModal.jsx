import React, { useState, useEffect, useRef } from "react";

const ProductModal = ({
  show,
  onClose,
  onSubmit,
  editingProduct,
  ingredientsList,
}) => {
  const [form, setForm] = useState({
    image: "",
    productName: "",
    size: 16, // default numeric size (e.g., 16 oz)
    price: "",
    category: "Iced Latte",
    status: "available",
    ingredients: [],
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Prefill when editing
  useEffect(() => {
    if (editingProduct) {
      setForm({
        image: editingProduct.image || "",
        productName: editingProduct.productName || "",
        // make sure we cast whatever comes from backend to Number if possible
        size:
          typeof editingProduct.size === "number"
            ? editingProduct.size
            : Number(editingProduct.size) || 16,
        price: editingProduct.price || "",
        category: editingProduct.category || "Iced Latte",
        status: editingProduct.status || "available",
        ingredients:
          editingProduct.ingredients?.map((i) => ({
            ingredient: i.ingredient?._id || i.ingredient || i._id,
            name: i.ingredient?.name || i.name,
            quantity: i.quantity || 0,
          })) || [],
      });
      const imageUrl = editingProduct.image
        ? // adjust host if needed
          editingProduct.image.startsWith("http")
          ? editingProduct.image
          : `${window.location.origin}${editingProduct.image}`
        : "";
      setImagePreview(imageUrl);
    } else {
      setForm({
        image: "",
        productName: "",
        size: 16,
        price: "",
        category: "Iced Latte",
        status: "available",
        ingredients: [],
      });
      setImagePreview("");
      setImageFile(null);
    }
  }, [editingProduct]);

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

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm({ ...form, image: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
          { ingredient: ingredient._id, name: ingredient.name, quantity: 1 },
        ],
      });
    }
  };

  // Handle quantity change
  const handleQuantityChange = (ingredientId, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === ingredientId ? { ...i, quantity: value } : i
      ),
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.productName.trim()) {
      alert("Product name is required");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      alert("Valid price is required");
      return;
    }

    const formData = new FormData();

    // image: either new file (imageFile) or keep existing image path (form.image)
    if (imageFile) {
      formData.append("image", imageFile);
    } else if (form.image) {
      formData.append("image", form.image);
    }

    formData.append("productName", form.productName);
    // ensure numeric size gets sent; FormData will stringify, mongoose will cast
    formData.append("size", Number(form.size));
    formData.append("price", Number(form.price));
    formData.append("category", form.category);
    formData.append("status", form.status);

    // ingredients as JSON string
    formData.append(
      "ingredients",
      JSON.stringify(
        form.ingredients.map(({ ingredient, quantity }) => ({
          ingredient,
          quantity: Number(quantity),
        }))
      )
    );

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]">
      {/**todo: asterisk should be red */}
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {editingProduct ? "Edit Product" : "Add Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Image Upload */}
          <div>
            <label className="block font-semibold text-sm mb-1">
              Product Image
            </label>

            {imagePreview ? (
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-500">Click to upload image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">Category</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="Iced Latte">Iced Latte</option>
              <option value="Fruit Tea">Fruit Tea</option>
              <option value="Amerikano">Amerikano</option>
              <option value="Bubble Tea">Bubble Tea</option>
              <option value="Non Caffeine">Non Caffeine</option>
              <option value="Frappe">Frappe</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">
              Product Name *
            </label>
            <input
              type="text"
              placeholder="Product Name"
              className="w-full border px-3 py-2 rounded"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">
              Product Size (oz)
            </label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={form.size}
              onChange={(e) =>
                setForm({ ...form, size: Number(e.target.value) })
              }
            >
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">Price *</label>
            <input
              type="number"
              placeholder="Price"
              className="w-full border px-3 py-2 rounded"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">Status</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

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
                  ingredientsList
                    .filter(
                      (ingredient) =>
                        !form.ingredients.some(
                          (i) => i.ingredient === ingredient._id
                        )
                    )
                    .map((ingredient) => (
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

export default ProductModal;
