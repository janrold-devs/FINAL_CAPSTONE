import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ShoppingCart, Trash2, Plus, Minus, Search, Edit } from "lucide-react";
import LoaderModal from "../../components/modals/LoaderModal";
import DashboardLayout from "../../layouts/DashboardLayout";

const POS = () => {
  const BACKEND_URL =  import.meta.env.MODE === "development" ? "http://localhost:8000" : "https://final-capstone-kb79.onrender.com";

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [cashier, setCashier] = useState(""); // cashier user ID
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [transactionLoading, setTransactionLoading] = useState(false);

  // For editing add-ons
  const [editIdx, setEditIdx] = useState(null);
  const [editAddons, setEditAddons] = useState([]);

  const categories = [
    "All",
    "Iced Latte",
    "Fruit Tea",
    "Amerikano",
    "Bubble Tea",
    "Non Caffeine",
    "Frappe",
  ];

  const ADDONS = [
    { name: "Espresso Shot", value: "espresso", price: 5 },
    { name: "Pearls", value: "pearls", price: 10 },
    { name: "Crystals", value: "crystals", price: 10 },
    { name: "Cream Puff", value: "creamPuff", price: 10 },
  ];

  // Pricing logic (now expects numeric size)
  function getProductPrice(product, size, subcategory, addons = []) {
    let base = 0;
    // Iced Latte, Bubble Tea, Fruit Tea, Non Caffeine
    if (
      ["Iced Latte", "Bubble Tea", "Fruit Tea", "Non Caffeine"].includes(
        product.category
      )
    ) {
      base = size === 32 ? 49 : 39;
    } else if (product.category === "Amerikano") {
      if (size === 12) base = 39; // Hotdrinks
      else base = size === 32 ? 39 : 29;
    } else if (product.category === "Frappe") {
      if (subcategory === "Coffee Based" || subcategory === "Cream Based") {
        base = 59; // 32oz only
      }
    } else {
      base = product.price || 0;
    }
    // Add-ons
    const addonsTotal = (addons || []).reduce(
      (sum, val) => sum + (ADDONS.find((a) => a.value === val)?.price || 0),
      0
    );
    return base + addonsTotal;
  }

  // Fetch products and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, userRes] = await Promise.all([
          api.get("/products"),
          api.get("/users"),
        ]);
        setProducts(prodRes.data.filter((p) => p.status === "available"));
        setUsers(userRes.data);
        const userId = localStorage.getItem("userId") || userRes.data[0]?._id;
        setCashier(userId);
      } catch {
        toast.error("Failed to load products or users");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Add product to cart (default to numeric size)
  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find(
        (item) =>
          item.product._id === product._id &&
          (item.size || product.size || 16) === (product.size || 16) &&
          (item.subcategory || "") === (product.subcategory || "") &&
          JSON.stringify(item.addons || []) === JSON.stringify([])
      );
      if (found) {
        return prev.map((item) =>
          item.product._id === product._id &&
          (item.size || product.size || 16) === (product.size || 16) &&
          (item.subcategory || "") === (product.subcategory || "") &&
          JSON.stringify(item.addons || []) === JSON.stringify([])
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Default size/subcategory
      let size = product.size || 16;
      let subcategory = "";
      if (product.category === "Amerikano") size = 16;
      if (product.category === "Frappe") {
        size = 32;
        subcategory = "Coffee Based";
      }
      if (
        ["Iced Latte", "Bubble Tea", "Fruit Tea", "Non Caffeine"].includes(
          product.category
        )
      ) {
        size = 16;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          size,
          subcategory,
          price: getProductPrice(product, size, subcategory, []),
          addons: [],
        },
      ];
    });
    toast.success(`${product.productName} added to cart`);
  };

  // Remove product from cart
  const removeFromCart = (productId, size, subcategory, addons) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product._id === productId &&
            (item.size || 16) === (size || 16) &&
            (item.subcategory || "") === (subcategory || "") &&
            JSON.stringify(item.addons || []) === JSON.stringify(addons || [])
          )
      )
    );
    toast.info("Item removed from cart");
  };

  // Increment quantity
  const incrementQty = (productId, size, subcategory, addons) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product._id === productId &&
        (item.size || 16) === (size || 16) &&
        (item.subcategory || "") === (subcategory || "") &&
        JSON.stringify(item.addons || []) === JSON.stringify(addons || [])
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // Decrement quantity
  const decrementQty = (productId, size, subcategory, addons) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product._id === productId &&
        (item.size || 16) === (size || 16) &&
        (item.subcategory || "") === (subcategory || "") &&
        JSON.stringify(item.addons || []) === JSON.stringify(addons || [])
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    );
  };

  // Handle size change in cart (now numeric)
  const handleSizeChange = (idx, newSize) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              size: Number(newSize),
              price: getProductPrice(
                item.product,
                Number(newSize),
                item.subcategory,
                item.addons
              ),
            }
          : item
      )
    );
  };

  // Handle subcategory change in cart
  const handleSubcategoryChange = (idx, newSub) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              subcategory: newSub,
              size: 32,
              price: getProductPrice(
                item.product,
                32,
                newSub,
                item.addons
              ),
            }
          : item
      )
    );
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Checkout handler (size is numeric)
  const handleCheckout = async () => {
    if (!cashier) {
      toast.error("Please select a cashier.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (
      (modeOfPayment === "GCash" || modeOfPayment === "Card") &&
      !referenceNumber.trim()
    ) {
      toast.error("Please enter a reference number for non-cash payments.");
      return;
    }
    setTransactionLoading(true);
    try {
      const itemsSold = cart.map((item) => ({
        product: item.product._id,
        category: item.product.category,
        size: item.size, // numeric
        subcategory: item.subcategory,
        price: item.price,
        quantity: item.quantity,
        totalCost: item.price * item.quantity,
        addons: item.addons || [],
      }));

      await api.post("/transactions", {
        cashier,
        itemsSold,
        modeOfPayment,
        referenceNumber: modeOfPayment !== "Cash" ? referenceNumber : "",
      });

      toast.success("Transaction successful!");
      setCart([]);
      setReferenceNumber("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Checkout failed. Please try again."
      );
    } finally {
      setTransactionLoading(false);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category &&
        p.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle opening edit modal for add-ons
  const openEditAddons = (idx, currentAddons) => {
    setEditIdx(idx);
    setEditAddons(currentAddons || []);
  };

  // Handle saving add-ons
  const saveEditAddons = () => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === editIdx
          ? {
              ...item,
              addons: editAddons,
              price: getProductPrice(
                item.product,
                item.size,
                item.subcategory,
                editAddons
              ),
            }
          : item
      )
    );
    setEditIdx(null);
    setEditAddons([]);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50">
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
        />

        <LoaderModal
          show={transactionLoading}
          message="Processing transaction..."
        />

        {/* Add-ons Edit Modal */}
        {editIdx !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
              <h3 className="font-bold mb-3">Edit Add-ons</h3>
              <div className="space-y-2 mb-4">
                {ADDONS.map((addon) => (
                  <label key={addon.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editAddons.includes(addon.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditAddons([...editAddons, addon.value]);
                        } else {
                          setEditAddons(
                            editAddons.filter((a) => a !== addon.value)
                          );
                        }
                      }}
                    />
                    <span>
                      {addon.name} (+₱{addon.price})
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditIdx(null);
                    setEditAddons([]);
                  }}
                  className="px-3 py-1 rounded bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditAddons}
                  className="px-3 py-1 rounded bg-blue-600 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product List Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {/* Search Bar */}
                <div className="mb-6 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#E89271] transition-colors"
                  />
                </div>

                {/* Category Filter */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedCategory === category
                          ? "bg-[#E89271] text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E89271] border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                    {filteredProducts.map((p) => (
                      <div
                        key={p._id}
                        className="border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center hover:shadow-xl hover:border-[#E89271] transition-all cursor-pointer group"
                        onClick={() => addToCart(p)}
                      >
                        {p.image ? (
                          <img
                            src={`${BACKEND_URL}${p.image}`}
                            alt={p.productName}
                            className="w-24 h-24 object-cover mb-3 rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-[#E89271] to-[#d67a5c] rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <span className="text-3xl font-bold text-white">
                              {p.productName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="text-center w-full">
                          <div className="font-semibold text-gray-800 text-sm mb-1">
                            {p.productName}
                          </div>
                          {p.size && (
                            <div className="text-xs text-gray-500 mb-2">
                              {p.size} oz
                            </div>
                          )}
                          <div className="text-[#E89271] font-bold text-lg mb-3">
                            ₱{p.price}
                          </div>
                          <button className="w-full bg-[#E89271] text-white px-3 py-2 rounded-lg hover:bg-[#d67a5c] transition-colors text-sm font-medium">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-6 h-6 text-[#E89271]" />
                  <h2 className="text-xl font-bold text-gray-800">Cart</h2>
                  <span className="ml-auto bg-[#E89271] bg-opacity-10 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {cart.length} items
                  </span>
                </div>

                {/* Cart Items */}
                <div className="max-h-[24.5rem] overflow-y-auto mb-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-20" />
                      <p>Cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={`${item.product._id}-${item.size || 16}-${
                          item.subcategory || ""
                        }-${(item.addons || []).join(",")}`}
                        className="bg-orange-50 rounded-xl p-3 border border-orange-100"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                              {item.product.productName}
                              <button
                                onClick={() =>
                                  openEditAddons(idx, item.addons || [])
                                }
                                className="ml-1 text-blue-500 hover:text-blue-700"
                                title="Edit Add-ons"
                              >
                                <Edit className="w-4 h-4 inline" />
                              </button>
                            </div>
                            {/* Size Selector (numeric) */}
                            {[
                              "Iced Latte",
                              "Bubble Tea",
                              "Fruit Tea",
                              "Non Caffeine",
                              "Amerikano",
                            ].includes(item.product.category) && (
                              <select
                                value={item.size}
                                onChange={(e) =>
                                  handleSizeChange(idx, e.target.value)
                                }
                                className="border rounded px-2 py-1 text-xs mt-1"
                              >
                                {item.product.category === "Amerikano" ? (
                                  <>
                                    <option value={16}>16 oz</option>
                                    <option value={32}>32 oz</option>
                                    <option value={12}>12 oz (Hotdrinks)</option>
                                  </>
                                ) : (
                                  <>
                                    <option value={16}>16 oz</option>
                                    <option value={32}>32 oz</option>
                                  </>
                                )}
                              </select>
                            )}
                            {/* Subcategory Selector for Frappe */}
                            {item.product.category === "Frappe" && (
                              <select
                                value={item.subcategory}
                                onChange={(e) =>
                                  handleSubcategoryChange(idx, e.target.value)
                                }
                                className="border rounded px-2 py-1 text-xs mt-1"
                              >
                                <option value="Coffee Based">Coffee Based</option>
                                <option value="Cream Based">Cream Based</option>
                              </select>
                            )}
                            <div className="text-xs text-gray-500">
                              ₱{item.price} each
                            </div>
                            {/* Show Add-ons */}
                            {item.addons && item.addons.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Add-ons:{" "}
                                {item.addons
                                  .map(
                                    (val) =>
                                      ADDONS.find((a) => a.value === val)?.name
                                  )
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              removeFromCart(
                                item.product._id,
                                item.size,
                                item.subcategory,
                                item.addons
                              )
                            }
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-gray-200">
                            <button
                              onClick={() =>
                                decrementQty(
                                  item.product._id,
                                  item.size,
                                  item.subcategory,
                                  item.addons
                                )
                              }
                              className="px-2 py-1 hover:bg-gray-100 rounded-l-lg transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="px-3 font-semibold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                incrementQty(
                                  item.product._id,
                                  item.size,
                                  item.subcategory,
                                  item.addons
                                )
                              }
                              className="px-2 py-1 hover:bg-gray-100 rounded-r-lg transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                          <div className="font-bold text-[#E89271]">
                            ₱{item.price * item.quantity}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div className="border-t-2 border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-[#E89271]">₱{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cashier
                    </label>
                    <select
                      value={cashier}
                      onChange={(e) => setCashier(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                    >
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mode of Payment
                    </label>
                    <select
                      value={modeOfPayment}
                      onChange={(e) => setModeOfPayment(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  {modeOfPayment !== "Cash" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Enter reference number"
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                        required={modeOfPayment !== "Cash"}
                      />
                    </div>
                  )}
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-gradient-to-r from-[#E89271] to-[#d67a5c] text-white py-3 rounded-xl hover:from-[#d67a5c] hover:to-[#c4633d] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? "Processing..." : "Complete Transaction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default POS;