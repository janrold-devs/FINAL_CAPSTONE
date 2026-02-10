import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProductModal from "../../components/modals/ProductModal";
import AlertDialog from "../../components/AlertDialog";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2, Plus } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Product = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Predefined categories list (must match ProductModal)
  const predefinedCategories = [
    "iced latte",
    "bubble tea",
    "fruit tea",
    "amerikano",
    "non caffeine",
    "frappe",
    "choco Series",
    "hot drink",
    "shiro Series",
  ];

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/products");
      // Filter out add-ons from the product list
      const regularProducts = res.data.filter(
        (product) => !product.isAddon && product.category !== "Add-ons",
      );
      setProducts(regularProducts);
      setFilteredProducts(regularProducts);
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ingredients
  const fetchIngredients = async () => {
    try {
      const res = await axios.get("/ingredients");
      setIngredientsList(res.data);
    } catch (err) {
      toast.error("Failed to fetch ingredients");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchIngredients();
  }, []);

  // Save product (Add or Edit)
  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        await axios.put(`/products/${editingProduct._id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Product updated successfully!");
      } else {
        await axios.post("/products", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Product added successfully!");
      }
      fetchProducts();
      setShowModal(false);
      setEditingProduct(null);
    } catch (err) {
      // Display specific error message from backend
      const errorMessage =
        err.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    }
  };

  // Delete product
  const handleDelete = async () => {
    try {
      await axios.delete(`/products/${deleteId}`);
      toast.success("Product deleted successfully!");
      setShowAlert(false);
      fetchProducts();
    } catch (err) {
      toast.error("Failed to delete product");
    }
  };

  // Filter configuration for products
  const productFilterConfig = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "iced latte", label: "Iced Latte" },
        { value: "bubble tea", label: "Bubble Tea" },
        { value: "fruit tea", label: "Fruit Tea" },
        { value: "amerikano", label: "Amerikano" },
        { value: "non caffeine", label: "Non Caffeine" },
        { value: "coffee-based frappe", label: "Coffee-Based Frappe" },
        { value: "cream-based frappe", label: "Cream-Based Frappe" },
        { value: "choco Series", label: "Choco Series" },
        { value: "hot drink", label: "Hot Drink" },
        { value: "shiro Series", label: "Shiro Series" },
        { value: "others", label: "Others" },
      ],
      customFilter: (item, filterValue) => {
        if (filterValue === "others") {
          // Show items with categories NOT in predefined list
          return !predefinedCategories.includes(item.category?.toLowerCase());
        }
        // Normal filter for predefined categories
        return item.category?.toLowerCase() === filterValue;
      },
    },
    {
      key: "size",
      label: "Size",
      options: [
        { value: "16", label: "16 oz" },
        { value: "22", label: "22 oz" },
      ],
    },
  ];

  // Sort configuration for products
  const productSortConfig = [
    { key: "productName", label: "Alphabetical" },
    { key: "category", label: "Category" },
  ];

  // Format category for display
  const formatCategory = (category) => {
    if (!category) return "";

    // Check if it's a predefined category
    const isPredefined = predefinedCategories.some(
      (predefined) => predefined.toLowerCase() === category.toLowerCase(),
    );

    if (isPredefined) {
      // Capitalize each word
      return category
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    // For custom categories, just capitalize first letter
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <DashboardLayout>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
            <p className="text-gray-600">
              Manage your product catalog and inventory
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium mt-4 lg:mt-0"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Export Buttons */}
        <div>
          <ExportButtons
            data={filteredProducts || products}
            fileName="Products"
            columns={[
              { key: "productName", label: "Product Name" },
              { key: "size", label: "Size" },
              { key: "price", label: "Price" },
              { key: "category", label: "Category" },
              { key: "ingredients.length", label: "Ingredients" },
            ]}
          />
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={products}
          onFilteredDataChange={setFilteredProducts}
          searchFields={["productName", "category", "size"]}
          filterConfig={productFilterConfig}
          sortConfig={productSortConfig}
          placeholder="Search products by name or category..."
        />

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 w-28">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-40">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Ingredients & Materials
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 w-29">
                      Sizes
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 w-29">
                      Prices
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 w-36">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-5 text-center align-top">
                          {p.image ? (
                            <div className="relative w-20 h-20 mx-auto group cursor-pointer">
                              {/* MAIN IMAGE */}
                              <img
                                src={p.image}
                                alt={p.productName}
                                className="w-full h-full object-cover rounded-lg shadow-sm transition-transform duration-200 ease-out group-hover:scale-105 group-hover:brightness-90"
                              />

                              {/* ==== BLURRED BACKGROUND ==== */}
                              <div
                                className="
                                  fixed inset-0
                                  bg-black/40 backdrop-blur-sm
                                  opacity-0
                                  transition-all duration-200
                                  pointer-events-none
                                  z-[9998]
                                  group-hover:opacity-100
                                "
                              ></div>

                              {/* ==== CENTER SCREEN PREVIEW IMAGE ==== */}
                              <div
                                className="
                                  fixed top-1/2 left-1/2
                                  w-[350px] h-[350px]
                                  opacity-0 scale-75
                                  -translate-x-1/2 -translate-y-1/2
                                  rounded-xl overflow-hidden
                                  shadow-2xl border-2 border-white
                                  transition-all duration-200 ease-out
                                  pointer-events-none
                                  bg-white z-[9999]
                                  group-hover:opacity-100
                                  group-hover:scale-100
                                "
                              >
                                <img
                                  src={p.image}
                                  alt={p.productName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                              <span className="text-gray-400 text-xs italic">
                                No image
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-gray-900 align-top">
                          <div className="truncate max-w-[200px]">
                            {p.productName}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-gray-700 capitalize align-top">
                          {formatCategory(p.category)}
                        </td>

                        <td className="px-6 py-5 align-top">
                          {p.ingredients && p.ingredients.length > 0 ? (
                            <div className="flex flex-wrap gap-2 max-w-[300px]">
                              {p.ingredients.map((i, idx) => (
                                <span
                                  key={i._id || i.ingredient?._id || idx}
                                  className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200 break-words whitespace-normal"
                                  title={`${i.ingredient?.name || "Unknown"} (${
                                    i.quantity
                                  }${i.ingredient?.unit || i.unit || ""})`}
                                >
                                  {i.ingredient?.name || "Unknown"} (
                                  {i.quantity}
                                  {(i.ingredient?.unit || i.unit || "")
                                    .toLowerCase()
                                    .replace("ml", "ml")}
                                  )
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">
                              None
                            </span>
                          )}
                        </td>

                        {/* Sizes Column - PERFECT ALIGNMENT */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            {/* For old single-size products */}
                            {!p.sizes && p.size && (
                              <div className="h-7 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {p.size} oz
                                </span>
                              </div>
                            )}
                            {/* For new multi-size products */}
                            {p.sizes &&
                              p.sizes.map((sizeObj, index) => (
                                <div
                                  key={index}
                                  className="h-7 flex items-center justify-center"
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    {sizeObj.size} oz
                                  </span>
                                </div>
                              ))}
                          </div>
                        </td>

                        {/* Prices Column - PERFECT ALIGNMENT */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            {/* For old single-price products */}
                            {!p.sizes && p.price && (
                              <div className="h-7 flex items-center justify-center">
                                <span className="text-sm font-semibold text-gray-900">
                                  ₱{(p.price || 0).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {/* For new multi-price products */}
                            {p.sizes &&
                              p.sizes.map((sizeObj, index) => (
                                <div
                                  key={index}
                                  className="h-7 flex items-center justify-center"
                                >
                                  <span className="text-sm font-semibold text-gray-900">
                                    ₱{(sizeObj.price || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center align-top">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setShowModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(p._id);
                                setShowAlert(true);
                              }}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                              Loading...
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-medium text-gray-900 mb-2">
                                No products found
                              </p>
                              <p className="text-gray-600">
                                Try adjusting your search or filters
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {showModal && (
          <ProductModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSaveProduct}
            editingProduct={editingProduct}
            ingredientsList={ingredientsList}
          />
        )}

        {/* Reusable Alert Dialog */}
        {showAlert && (
          <AlertDialog
            show={showAlert}
            title="Are you absolutely sure?"
            message="This action cannot be undone. This will permanently delete the product and remove it from the system."
            onCancel={() => setShowAlert(false)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Product;
