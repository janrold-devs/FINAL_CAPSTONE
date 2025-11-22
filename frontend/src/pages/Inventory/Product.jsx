import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import ProductModal from "../../components/modals/ProductModal";
import AlertDialog from "../../components/AlertDialog";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2, Plus } from "lucide-react";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Product = () => {
  const BACKEND_URL =
    import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : "https://final-capstone-kb79.onrender.com";

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/products");
      setProducts(res.data);
      setFilteredProducts(res.data);
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
      toast.error("Failed to save product");
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
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "available", label: "Available" },
        { value: "unavailable", label: "Unavailable" },
      ],
    },
    {
      key: "size",
      label: "Size",
      options: [
        { value: "16", label: "16 oz" },
        { value: "32", label: "32 oz" },
      ],
    },
  ];

  // Sort configuration for products
  const productSortConfig = [
    { key: "productName", label: "Alphabetical" },
    { key: "price", label: "Price" },
    { key: "size", label: "Size" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
  ];

  return (
    <DashboardLayout>
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
              { key: "status", label: "Status" },
            ]}
          />
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={products}
          onFilteredDataChange={setFilteredProducts}
          searchFields={["productName", "category"]}
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Ingredients
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
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
                        <td className="px-6 py-4 text-center">
                          {p.image ? (
                            <img
                              src={`${BACKEND_URL}${p.image}`}
                              alt={p.productName}
                              className="w-16 h-16 object-cover rounded-lg mx-auto shadow-sm"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                              <span className="text-gray-400 text-xs italic">
                                No image
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {p.productName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {p.size}
                            <span className="ml-1 text-xs text-indigo-600 font-medium">
                              oz
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₱{p.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                          {p.category}
                        </td>
                        <td className="px-6 py-4">
                          {p.ingredients && p.ingredients.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.ingredients.slice(0, 2).map((i) => (
                                <span
                                  key={i._id || i.ingredient?._id}
                                  className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200"
                                >
                                  {i.ingredient?.name || "Unknown"} (
                                  {i.quantity}
                                  {i.ingredient?.unit || i.unit || ""})
                                </span>
                              ))}
                              {p.ingredients.length > 2 && (
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border border-gray-200">
                                  +{p.ingredients.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.status === "available"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
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
