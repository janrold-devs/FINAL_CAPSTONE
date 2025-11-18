import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import ProductModal from "../../components/modals/ProductModal";
import AlertDialog from "../../components/AlertDialog";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Pencil, Trash2 } from "lucide-react";
import ExportButtons from "../../components/ExportButtons"

const Product = () => {
  const BACKEND_URL =  import.meta.env.MODE === "development" ? "http://localhost:8000" : "https://final-capstone-kb79.onrender.com";

  const [products, setProducts] = useState([]);
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

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Product
          </button>
        </div>

        <ExportButtons data={products} fileName="Products" 
        columns={[
          {key: "productName", label: "Product Name" },
          {key: "size", label: "Size" },
          {key: "price", label: "Price" },
          {key: "category", label: "Category" },
          {key: "ingredients.length", label: "Ingredients" },
          {key: "status", label: "Status" },
        ]}
        />

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2 text-center">Image</th>
                  <th className="border px-4 py-2 text-left">Product Name</th>
                  <th className="border px-4 py-2 text-left">Size</th>
                  <th className="border px-4 py-2 text-left">Price</th>
                  <th className="border px-4 py-2 text-center">Category</th>
                  <th className="border px-4 py-2 text-left">Ingredients</th>
                  <th className="border px-4 py-2 text-center">Status</th>
                  <th className="border px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td className="border px-4 py-2 text-center">
                      {p.image ? (
                        <img
                          src={`${BACKEND_URL}${p.image}`}
                          alt={p.productName}
                          className="w-16 h-16 object-cover rounded mx-auto"
                        />
                      ) : (
                        <span className="text-gray-400 italic">No image</span>
                      )}
                    </td>
                    <td className="border px-4 py-2">{p.productName}</td>
                    <td className="border px-4 py-2 text-center">
                      <div className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-600">
                        {p.size}
                        <span className="ml-1 text-xs text-indigo-600 font-medium">
                          oz
                        </span>
                      </div>
                    </td>

                    <td className="border px-4 py-2">₱{p.price.toFixed(2)}</td>
                    <td className="border px-4 py-2 text-center">
                      {p.category}
                    </td>
                    <td className="border px-4 py-2">
                      {p.ingredients && p.ingredients.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {p.ingredients.map((i) => (
                            <span
                              key={i._id || i.ingredient?._id}
                              className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                            >
                              {i.ingredient?.name || "Unknown"} ({i.quantity}
                              {i.ingredient?.unit || i.unit || ""})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>

                    <td className="border px-4 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          p.status === "available"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(p._id);
                            setShowAlert(true);
                          }}
                          className="inline-flex items-center gap-1 text-red-600 hover:underline"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product Modal */}
        {showModal && (
          <ProductModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSaveProduct}
            editingProduct={editingProduct}
            ingredientsList={ingredientsList} // now passed
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
