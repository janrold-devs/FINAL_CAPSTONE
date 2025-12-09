import React, { useState, useEffect, useRef } from "react";

const ProductModal = ({
  show,
  onClose,
  onSubmit,
  editingProduct,
  ingredientsList,
}) => {
  // Predefined categories (must match Product.jsx)
  const initialPredefinedCategories = [
    "iced latte",
    "bubble tea",
    "fruit tea",
    "amerikano",
    "non caffeine",
    "frappe",
    "choco Series",
    "hot drink",
    "shiro Series"
  ];

  // Load saved custom categories from localStorage
  const [savedCustomCategories, setSavedCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('productCustomCategories');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading custom categories:', error);
      return [];
    }
  });

  // Combine predefined and saved custom categories
  const allCategories = [...initialPredefinedCategories, ...savedCustomCategories];

  const [form, setForm] = useState({
    image: "",
    productName: "",
    category: "",
    selectedCategoryType: "predefined", // 'predefined' or 'custom'
    customCategory: "",
    status: "available",
    sizes: [
      {
        size: 16,
        price: "",
      },
    ],
    ingredientCategory: "",
    ingredients: [],
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get unique ingredient categories (include both ingredients and materials)
  const uniqueCategories = [
    ...new Set(ingredientsList.map((i) => i.category || "Uncategorized")),
  ];

  // Check if selected category is for materials
  const isMaterialCategory = () => {
    const selectedCat = form.ingredientCategory;
    if (!selectedCat) return false;
    
    const itemsInCategory = ingredientsList.filter(i => 
      (i.category || "Uncategorized") === selectedCat
    );
    return itemsInCategory.some(item => item.unit === "pcs");
  };

  // Prefill when editing
  useEffect(() => {
    if (editingProduct) {
      const category = editingProduct.category || "";
      
      // Check if category exists in any category list
      const categoryExistsInPredefined = initialPredefinedCategories.some(predefined => 
        predefined.toLowerCase() === category.toLowerCase()
      );
      
      const categoryExistsInSaved = savedCustomCategories.some(saved => 
        saved.toLowerCase() === category.toLowerCase()
      );
      
      const categoryExists = categoryExistsInPredefined || categoryExistsInSaved;
      
      setForm({
        image: editingProduct.image || "",
        productName: editingProduct.productName,
        category: category,
        selectedCategoryType: categoryExists ? "predefined" : "custom",
        customCategory: categoryExists ? "" : category,
        status: editingProduct.status || "available",
        sizes:
          editingProduct.sizes?.length > 0
            ? editingProduct.sizes.map((s) => ({
                size: Number(s.size),
                price: Number(s.price),
              }))
            : [
                {
                  size: Number(editingProduct.size || 16),
                  price: Number(editingProduct.price || ""),
                },
              ],
        ingredients:
          editingProduct.ingredients?.map((i) => ({
            ingredient: i.ingredient?._id || i.ingredient,
            name: i.ingredient?.name || i.name,
            quantity: i.quantity || 1,
            category: i.ingredient?.category || "",
            unit: i.ingredient?.unit || i.unit || "",
          })) || [],
        ingredientCategory: "",
      });

      const imageUrl = editingProduct.image ? editingProduct.image : "";
      setImagePreview(imageUrl);
    } else {
      setForm({
        image: "",
        productName: "",
        category: "",
        selectedCategoryType: "predefined",
        customCategory: "",
        status: "available",
        sizes: [{ size: 16, price: "" }],
        ingredientCategory: "",
        ingredients: [],
      });
      setImagePreview("");
      setImageFile(null);
    }
  }, [editingProduct, show]);

  // Close ingredient dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Save custom category to localStorage
  const saveCustomCategory = (categoryName) => {
    if (!categoryName.trim()) return;
    
    const formattedCategory = categoryName.trim().toLowerCase();
    
    // Check if category already exists
    const alreadyExists = allCategories.some(cat => 
      cat.toLowerCase() === formattedCategory
    );
    
    if (!alreadyExists) {
      const updatedCategories = [...savedCustomCategories, formattedCategory];
      setSavedCustomCategories(updatedCategories);
      
      try {
        localStorage.setItem('productCustomCategories', JSON.stringify(updatedCategories));
        console.log('Saved custom category:', formattedCategory);
      } catch (error) {
        console.error('Error saving custom category:', error);
      }
    }
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/"))
      return alert("Please select an image file");
    if (file.size > 5 * 1024 * 1024)
      return alert("Image must be less than 5MB");

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm({ ...form, image: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle category type change
  const handleCategoryTypeChange = (type) => {
    setForm(prev => ({
      ...prev,
      selectedCategoryType: type,
      category: type === "predefined" ? "" : prev.customCategory
    }));
  };

  // Handle predefined category selection
  const handlePredefinedCategoryChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({
      ...prev,
      category: value,
      customCategory: ""
    }));
  };

  // Handle custom category input
  const handleCustomCategoryChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({
      ...prev,
      customCategory: value,
      category: value
    }));
  };

  // SIZE MANAGEMENT
  const addSize = () => {
    setForm({
      ...form,
      sizes: [...form.sizes, { size: 16, price: "" }],
    });
  };

  const removeSize = (index) => {
    if (form.sizes.length === 1) return;
    setForm({
      ...form,
      sizes: form.sizes.filter((_, i) => i !== index),
    });
  };

  const updateSize = (index, field, value) => {
    const newSizes = [...form.sizes];
    newSizes[index][field] = value;
    setForm({ ...form, sizes: newSizes });
  };

  // INGREDIENT/MATERIAL SELECTION
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
          {
            ingredient: ingredient._id,
            name: ingredient.name,
            quantity: 1,
            category: ingredient.category,
            unit: ingredient.unit || "",
          },
        ],
      });
    }
  };

  const handleQuantityChange = (id, value) => {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredient === id ? { ...i, quantity: value } : i
      ),
    });
  };

  // SUBMIT
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.productName.trim()) return alert("Product name is required");

    // Validate category
    if (form.selectedCategoryType === "custom") {
      if (!form.customCategory.trim()) {
        alert("Please enter a custom category name");
        return;
      }
      // Save the custom category
      saveCustomCategory(form.customCategory);
    }

    if (form.selectedCategoryType === "predefined" && !form.category) {
      alert("Please select a category");
      return;
    }

    // Validate prices
    for (const s of form.sizes) {
      if (!s.price || Number(s.price) <= 0)
        return alert("All sizes must have valid prices");
    }

    const formData = new FormData();

    if (imageFile) formData.append("image", imageFile);
    else if (form.image) formData.append("image", form.image);

    formData.append("productName", form.productName);
    formData.append("category", form.category);
    formData.append("status", form.status);
    formData.append("sizes", JSON.stringify(form.sizes));
    formData.append(
      "ingredients",
      JSON.stringify(
        form.ingredients.map((i) => ({
          ingredient: i.ingredient,
          quantity: Number(i.quantity),
          unit: i.unit,
        }))
      )
    );

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 relative">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingProduct ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* IMAGE UPLOAD */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Product Image
            </label>
            {imagePreview ? (
              <div className="relative h-48 w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-48 w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <svg
                  className="w-10 h-10 text-gray-400 mb-2"
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
                <p className="text-gray-500 text-sm">Click to upload image</p>
                <p className="text-gray-400 text-xs mt-1">PNG, JPG up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {/* PRODUCT CATEGORY - UPDATED */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Product Category <span className="text-red-500">*</span>
            </label>
            
            {/* Category Type Selection */}
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleCategoryTypeChange("predefined")}
                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors text-sm font-medium ${
                  form.selectedCategoryType === "predefined"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                Predefined Categories
              </button>
              <button
                type="button"
                onClick={() => handleCategoryTypeChange("custom")}
                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors text-sm font-medium ${
                  form.selectedCategoryType === "custom"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                Custom Category
              </button>
            </div>

            {/* Predefined Categories Dropdown (now includes saved custom categories) */}
            {form.selectedCategoryType === "predefined" && (
              <div>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.category}
                  onChange={handlePredefinedCategoryChange}
                  required
                >
                  <option value="">Select Product Category</option>
                  
                  {/* Original Predefined Categories */}
                  <optgroup label="Standard Categories">
                    {initialPredefinedCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </option>
                    ))}
                  </optgroup>
                  
                  {/* Saved Custom Categories */}
                  {savedCustomCategories.length > 0 && (
                    <optgroup label="Custom Categories">
                      {savedCustomCategories.map((category) => (
                        <option key={category} value={category}>
                          {category.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {savedCustomCategories.length > 0 
                    ? "Includes both standard and previously saved custom categories"
                    : "Choose from our standard categories. Custom categories will appear here after saving."}
                </p>
              </div>
            )}

            {/* Custom Category Input */}
            {form.selectedCategoryType === "custom" && (
              <div>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.customCategory}
                  onChange={handleCustomCategoryChange}
                  placeholder="Enter your custom category name"
                  required
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">
                    This category will be saved and available in the dropdown for future products
                  </p>
                  {form.customCategory.trim() && !allCategories.some(cat => 
                    cat.toLowerCase() === form.customCategory.trim().toLowerCase()
                  ) && (
                    <span className="text-xs text-green-600 font-medium">
                      New category
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PRODUCT NAME */}
          <div>
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
              placeholder="Enter product name"
              required
            />
          </div>

          {/* SIZES SECTION */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <label className="font-medium text-gray-700 text-sm">
              </label>
              {/* Add Size Button */}
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={addSize}
                  className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <span className="text-sm font-medium">Add Size</span>
                  <div className="w-6 h-6 border border-orange-500 rounded flex items-center justify-center hover:bg-orange-50 transition-colors">
                    <span className="text-lg font-light">+</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {form.sizes.map((s, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700 text-sm">
                      Size {i + 1}
                    </h4>
                    {form.sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSize(i)}
                        className="text-red-500 hover:text-red-700 transition-colors text-xl leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Size (oz)
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={s.size}
                        onChange={(e) =>
                          updateSize(i, "size", Number(e.target.value))
                        }
                      >
                        <option value="">Select</option>
                        <option value={12}>12 oz</option>
                        <option value={16}>16 oz</option>
                        <option value={20}>20 oz</option>
                        <option value={22}>22 oz</option>
                        <option value={24}>24 oz</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
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
                          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={s.price}
                          onChange={(e) =>
                            updateSize(i, "price", e.target.value)
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INGREDIENTS/MATERIALS SECTION */}
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block font-medium text-gray-700 text-sm mb-2">
              Ingredients & Materials <span className="text-red-500">*</span>
            </label>

            {/* CATEGORY FILTER */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-2">
                Filter by Category
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.ingredientCategory}
                onChange={(e) => {
                  setForm({
                    ...form,
                    ingredientCategory: e.target.value,
                  });
                  setDropdownOpen(false);
                }}
              >
                <option value="">-- Select Category --</option>
                {uniqueCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient/Material Selection */}
            {form.ingredientCategory ? (
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs text-gray-600 mb-2">
                  {isMaterialCategory() ? "Select Materials" : "Select Ingredients"}
                </label>
                <div
                  className="border border-gray-300 rounded-lg px-4 py-3 bg-white cursor-pointer min-h-[44px] hover:border-gray-400 transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {form.ingredients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.ingredients.map((ing) => (
                        <div
                          key={ing.ingredient}
                          className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs gap-2 border border-blue-200"
                        >
                          <span className="font-medium">{ing.name}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              className="w-12 border border-blue-300 rounded px-2 py-1 text-xs bg-white"
                              value={ing.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  ing.ingredient,
                                  e.target.value
                                )
                              }
                            />
                            {ing.unit && (
                              <span className="text-xs text-gray-600">
                                {ing.unit.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 transition-colors text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIngredient({
                                _id: ing.ingredient,
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      {isMaterialCategory() 
                        ? "Click to select materials..." 
                        : "Click to select ingredients..."}
                    </span>
                  )}
                </div>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1 z-10">
                    {ingredientsList
                      .filter(
                        (i) =>
                          (i.category || "Uncategorized") === form.ingredientCategory &&
                          !form.ingredients.some(
                            (x) => x.ingredient === i._id
                          )
                      )
                      .map((ingredient) => (
                        <div
                          key={ingredient._id}
                          className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          onClick={() => toggleIngredient(ingredient)}
                        >
                          <div className="flex justify-between items-center">
                            <span>{ingredient.name}</span>
                            {ingredient.unit && (
                              <span className="text-xs text-gray-600">
                                {ingredient.unit.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Please select a category first to add items
                </p>
              </div>
            )}
          </div>

          {/* BUTTONS */}
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
              {editingProduct ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;