import React, { useState, useEffect, useRef } from "react";
import axios from "../../api/axios";
import { Plus, Trash2 } from "lucide-react";

const ProductModal = ({
  show,
  onClose,
  onSubmit,
  editingProduct,
  ingredientsList,
}) => {
  // Predefined categories (must match Product.jsx)
  const initialPredefinedCategories = [
    "ICED LATTE",
    "BUBBLE TEA",
    "FRUIT TEA",
    "AMERIKANO",
    "NON CAFFEINE",
    "FRAPPE",
    "CHOCO SERIES",
    "HOT DRINK",
    "SHIRO SERIES",
  ];

  // Load saved custom categories from localStorage
  const [savedCustomCategories, setSavedCustomCategories] = useState(() => {
    try {
      const raw = localStorage.getItem("customCategories");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((c) => (c || "").toString().trim().toUpperCase()) : [];
    } catch {
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
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Size-specific inventory UI state
  const [activeSizeDropdown, setActiveSizeDropdown] = useState(null);
  const [filterType, setFilterType] = useState("ingredient"); // 'ingredient' | 'material'

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
          editingProduct.ingredients?.map((i) => {
            const defaultQuantities = editingProduct.sizes?.map(s => ({
              size: Number(s.size),
              quantity: (i.ingredient?.category === 'Material' && i.ingredient?.unit === 'pcs')
                ? 1
                : (i.quantity || 1)
            })) || [];

            return {
              ingredient: i.ingredient?._id || i.ingredient,
              name: i.ingredient?.name || i.name,
              quantity: i.quantity || 1,
              category: i.ingredient?.category || "",
              unit: (i.ingredient?.unit || i.unit || "").toLowerCase(),
              quantities: (i.quantities && i.quantities.length > 0) ? i.quantities : defaultQuantities
            };
          }) || [],
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

  // Fetch all products for duplicate checking
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("/products");
        setAllProducts(res.data);
      } catch (err) {
        console.error("Failed to fetch products for duplicate check:", err);
      }
    };

    if (show) {
      fetchProducts();
    }
  }, [show]);

  // Check for duplicate product name
  useEffect(() => {
    if (!form.productName.trim()) {
      setIsDuplicateName(false);
      return;
    }

    const normalizedName = form.productName.trim().toUpperCase();
    const duplicate = allProducts.find(
      (product) =>
        product.productName.trim().toUpperCase() === normalizedName &&
        product._id !== editingProduct?._id // Exclude current product when editing
    );

    setIsDuplicateName(!!duplicate);
  }, [form.productName, allProducts, editingProduct]);

  // Save custom category to localStorage
  const saveCustomCategory = (newCat) => {
    const upper = (newCat || "").trim().toUpperCase();
    const next = Array.from(new Set([upper, ...savedCustomCategories]));
    setSavedCustomCategories(next);
    localStorage.setItem("customCategories", JSON.stringify(next));
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
    const raw = e.target.value || "";
    const upper = raw.toUpperCase();
    setForm((prev) => ({
      ...prev,
      customCategory: upper, // visual: ALL CAPS
      category: upper.trim(), // stored value: ALL CAPS
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
  const addIngredientToSize = (ingredient, size) => {
    let newIngredients = [...form.ingredients];
    const ingId = String(ingredient._id);
    let existingIngIndex = newIngredients.findIndex(i => String(i.ingredient) === ingId);

    if (existingIngIndex >= 0) {
      let existingIng = { ...newIngredients[existingIngIndex] };
      let newQuantities = existingIng.quantities ? [...existingIng.quantities] : [];

      let existingQtyIndex = newQuantities.findIndex(q => Number(q.size) === Number(size));

      if (existingQtyIndex === -1) {
        newQuantities.push({ size: Number(size), quantity: 1 });
        existingIng.quantities = newQuantities;
        newIngredients[existingIngIndex] = existingIng;
      }
    } else {
      newIngredients.push({
        ingredient: ingId,
        name: ingredient.name,
        quantity: 0,
        category: ingredient.category,
        unit: (ingredient.unit || "").toLowerCase(),
        quantities: [{ size: Number(size), quantity: 1 }]
      });
    }
    setForm({ ...form, ingredients: newIngredients });
  };

  const removeIngredientFromSize = (ingredientId, size) => {
    const ingId = String(ingredientId);
    let newIngredients = form.ingredients.map(ing => {
      if (String(ing.ingredient) !== ingId) return ing;
      const newQuantities = (ing.quantities || []).filter(q => Number(q.size) !== Number(size));
      return { ...ing, quantities: newQuantities };
    }).filter(ing => (ing.quantities && ing.quantities.length > 0));

    setForm({ ...form, ingredients: newIngredients });
  };

  const handleIngredientSizeQuantityChange = (ingId, size, value) => {
    const targetIngId = String(ingId);
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => {
        if (String(ing.ingredient) !== targetIngId) return ing;

        const existingQtyIndex = ing.quantities ? ing.quantities.findIndex(q => Number(q.size) === Number(size)) : -1;
        let newQuantities = ing.quantities ? [...ing.quantities] : [];

        if (existingQtyIndex >= 0) {
          newQuantities[existingQtyIndex] = { ...newQuantities[existingQtyIndex], quantity: Number(value) };
        } else {
          newQuantities.push({ size: Number(size), quantity: Number(value) });
        }

        return { ...ing, quantities: newQuantities };
      })
    }));
  };

  // SUBMIT
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.productName.trim()) return alert("Product name is required");

    // Check for duplicate product name
    if (isDuplicateName) {
      alert("A product with this name already exists. Please use a different name.");
      return;
    }

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

    // Validate ingredients/materials are selected
    if (!form.ingredients || form.ingredients.length === 0) {
      alert("Please select at least one ingredient or material");
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

    formData.append("productName", form.productName.trim());
    // Always send category in UPPERCASE (custom or predefined)
    formData.append("category", (form.category || "").trim().toUpperCase());
    formData.append("status", form.status);
    formData.append("sizes", JSON.stringify(form.sizes));
    formData.append(
      "ingredients",
      JSON.stringify(
        form.ingredients.map((i) => ({
          ingredient: i.ingredient,
          quantity: Number(i.quantity),
          unit: i.unit,
          quantities: i.quantities || []
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
                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors text-sm font-medium ${form.selectedCategoryType === "predefined"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
              >
                Predefined Categories
              </button>
              <button
                type="button"
                onClick={() => handleCategoryTypeChange("custom")}
                className={`flex-1 py-2.5 px-4 rounded-lg border transition-colors text-sm font-medium ${form.selectedCategoryType === "custom"
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
                        <option key={category} value={(category || "").toUpperCase()}>
                          {(category || "").toUpperCase()}
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
              data-no-uppercase
              className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${isDuplicateName
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
                }`}
              value={form.productName}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, productName: value.toUpperCase() });
              }}
              placeholder="Enter product name"
              required
            />
            {isDuplicateName && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  A product with this name already exists. Please use a different name.
                </p>
              </div>
            )}
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
                  className="bg-white border border-gray-200 rounded-lg p-4 relative"
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

                  {/* Size-Specific Ingredients */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-medium text-gray-700">
                        Ingredients & Materials
                        <span className="text-gray-400 font-normal ml-1">(Specific to this size)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSizeDropdown(activeSizeDropdown === i ? null : i);
                          setFilterType('ingredient');
                        }}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus size={14} /> Add Item
                      </button>
                    </div>

                    {/* Added Ingredients List for this Size */}
                    <div className="space-y-2 mb-3">
                      {form.ingredients
                        .filter(ing => ing.quantities && ing.quantities.some(q => Number(q.size) === Number(s.size)))
                        .map((ing, idx) => {
                          const qtyObj = ing.quantities.find(q => Number(q.size) === Number(s.size));
                          return (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border border-gray-100">
                              <div>
                                <span className="font-medium text-gray-700">{ing.name}</span>
                                <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded ml-2 uppercase font-bold">{ing.category}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden shadow-sm">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="w-16 px-2 py-1 text-right outline-none text-sm font-medium"
                                    value={qtyObj.quantity}
                                    onChange={(e) => handleIngredientSizeQuantityChange(ing.ingredient, s.size, e.target.value)}
                                  />
                                  <span className="bg-gray-100 px-2 py-1 text-[10px] text-gray-500 border-l font-black uppercase">
                                    {ing.unit}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeIngredientFromSize(ing.ingredient, s.size)}
                                  className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      {(!form.ingredients.some(ing => ing.quantities && ing.quantities.some(q => Number(q.size) === Number(s.size)))) && (
                        <div className="text-center py-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-400 italic">No recipe items defined for this size</p>
                        </div>
                      )}
                    </div>

                    {/* Dropdown for Adding Items */}
                    {activeSizeDropdown === i && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-3 absolute z-20 left-4 right-4 animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
                        {/* Tabs */}
                        <div className="flex border-b mb-3 bg-gray-50 rounded-t-lg overflow-hidden">
                          <button
                            type="button"
                            className={`flex-1 py-2.5 text-xs font-black text-center transition-all ${filterType === 'ingredient' ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setFilterType('ingredient')}
                          >
                            INGREDIENTS
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-2.5 text-xs font-black text-center transition-all ${filterType === 'material' ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setFilterType('material')}
                          >
                            MATERIALS
                          </button>
                        </div>

                        {/* Search/Filter List */}
                        <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                          {ingredientsList
                            .filter(item => {
                              const unit = (item.unit || "").toLowerCase();
                              if (filterType === 'material') {
                                return unit === 'pcs' || item.category === 'Material';
                              } else {
                                return unit !== 'pcs' && item.category !== 'Material';
                              }
                            })
                            .map((item) => {
                              const isAdded = form.ingredients.some(
                                ing => String(ing.ingredient) === String(item._id) &&
                                  ing.quantities?.some(q => Number(q.size) === Number(s.size))
                              );
                              return (
                                <button
                                  key={item._id}
                                  type="button"
                                  onClick={() => addIngredientToSize(item, s.size)}
                                  disabled={isAdded}
                                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex justify-between items-center transition-all group ${isAdded ? 'bg-green-50 text-green-700 cursor-default opacity-50' : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                                    }`}
                                >
                                  <span className="font-semibold">{item.name}</span>
                                  {isAdded ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded ring-1 ring-green-600/20">ADDED</span>
                                  ) : (
                                    <div className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                      <Plus size={12} />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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