import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Edit,
  SquarePlus,
  Minus,
  Search,
  Wine,
  Droplet,
  Settings,
  User,
  X,
} from "lucide-react";
import LoaderModal from "../../components/modals/LoaderModal";
import DashboardLayout from "../../layouts/DashboardLayout";

const POS = () => {
  const BACKEND_URL =
    import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : "https://final-capstone-kb79.onrender.com";

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [cashier, setCashier] = useState(""); // cashier user ID
  const [cashierName, setCashierName] = useState(""); // cashier display name
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [transactionLoading, setTransactionLoading] = useState(false);

  // For editing add-ons
  const [editIdx, setEditIdx] = useState(null);
  const [editAddons, setEditAddons] = useState([]);
  // For managing add-on prices - load from localStorage or use defaults
  const defaultAddons = [
    { name: "Espresso Shot", value: "espresso", price: 5 },
    { name: "Pearls", value: "pearls", price: 10 },
    { name: "Crystals", value: "crystals", price: 10 },
    { name: "Cream Puff", value: "creamPuff", price: 10 },
  ];
  const [addons, setAddons] = useState(() => {
    const stored = localStorage.getItem("posAddons");
    return stored ? JSON.parse(stored) : defaultAddons;
  });
  const [editingAddonPrice, setEditingAddonPrice] = useState(null);
  const [tempAddonPrice, setTempAddonPrice] = useState("");
  const [showAddonsManager, setShowAddonsManager] = useState(false);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");

  const categories = [
    "All",
    "Iced Latte",
    "Fruit Tea",
    "Amerikano",
    "Hot Drink",
    "Bubble Tea",
    "Non Caffeine",
    "Frappe",
    "Choco Series",
    "Shiro Series",
  ];

  // Enhanced pricing logic to handle products with same name but different sizes
  function getProductPrice(product, size, subcategory, addonItems = []) {
    // First, check if this specific product has the requested size as its default size
    if (product.size && size === product.size) {
      let base = product.price || 0;

      // Add-ons with current prices and quantities
      const addonsTotal = (addonItems || []).reduce((sum, addonItem) => {
        const addon = addons.find((a) => a.value === addonItem.value);
        return sum + (addon?.price || 0) * (addonItem.quantity || 1);
      }, 0);
      return base + addonsTotal;
    }

    // If not, look for other products with the same name and the requested size
    const matchingProduct = products.find(
      (p) =>
        p.productName === product.productName &&
        p.size === size &&
        p.category === product.category
    );

    if (matchingProduct && matchingProduct.price) {
      let base = matchingProduct.price;

      // Add-ons with current prices and quantities
      const addonsTotal = (addonItems || []).reduce((sum, addonItem) => {
        const addon = addons.find((a) => a.value === addonItem.value);
        return sum + (addon?.price || 0) * (addonItem.quantity || 1);
      }, 0);
      return base + addonsTotal;
    }

    // No matching product found for this size
    return null;
  }

  // Helper function to check if a size is available for a product
  function isSizeAvailable(product, size) {
    // Check if this product itself has the size
    if (product.size === size) {
      return true;
    }

    // Check if there's another product with same name and category that has this size
    return products.some(
      (p) =>
        p.productName === product.productName &&
        p.category === product.category &&
        p.size === size
    );
  }

  // Helper function to format price for display
  function formatPriceDisplay(price) {
    if (price === null || price === undefined) {
      return "no price";
    }
    return `₱${price}`;
  }

  // Fetch current user profile
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found in localStorage");
        return null;
      }

      // Decode the token to get user ID
      const decoded = JSON.parse(atob(token.split(".")[1]));
      console.log("Decoded token:", decoded);

      // Fetch user data from backend
      const response = await api.get(`/users/${decoded.id}`);
      console.log("User profile response:", response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      toast.error("Failed to load user profile");
      return null;
    }
  };

  // Fetch products and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch current user first
        const currentUser = await fetchCurrentUser();

        // Then fetch products and all users
        const [prodRes, userRes] = await Promise.all([
          api.get("/products"),
          api.get("/users"),
        ]);

        setProducts(prodRes.data.filter((p) => p.status === "available"));
        setUsers(userRes.data);

        // Set cashier to current user
        if (currentUser) {
          setCashier(currentUser._id);
          setCashierName(`${currentUser.firstName} ${currentUser.lastName}`);
          console.log(
            "Set cashier to current user:",
            `${currentUser.firstName} ${currentUser.lastName}`
          );
        } else {
          // Fallback: try to find admin user
          const adminUser = userRes.data.find((u) => u.role === "admin");
          if (adminUser) {
            setCashier(adminUser._id);
            setCashierName(`${adminUser.firstName} ${adminUser.lastName}`);
            console.log(
              "Fallback to admin user:",
              `${adminUser.firstName} ${adminUser.lastName}`
            );
          } else if (userRes.data.length > 0) {
            // Final fallback: use first user
            setCashier(userRes.data[0]._id);
            setCashierName(
              `${userRes.data[0].firstName} ${userRes.data[0].lastName}`
            );
            console.log(
              "Fallback to first user:",
              `${userRes.data[0].firstName} ${userRes.data[0].lastName}`
            );
            toast.warning("No logged-in user detected, using default user");
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to load products or users");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Add product to cart with specified size (numeric size)
  const addToCart = (product, size) => {
    const price = getProductPrice(product, size, "", []);

    // Don't add to cart if no price for this size
    if (price === null) {
      toast.error(`No price available for ${product.productName} (${size}oz)`);
      return;
    }

    setCart((prev) => {
      const found = prev.find(
        (item) =>
          item.product._id === product._id &&
          (item.size || 16) === size &&
          (item.subcategory || "") === "" &&
          JSON.stringify(item.addons || []) === JSON.stringify([])
      );
      if (found) {
        return prev.map((item) =>
          item.product._id === product._id &&
          (item.size || 16) === size &&
          (item.subcategory || "") === "" &&
          JSON.stringify(item.addons || []) === JSON.stringify([])
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Add with specified size
      return [
        ...prev,
        {
          product,
          quantity: 1,
          size,
          subcategory: "",
          price,
          addons: [],
        },
      ];
    });
    toast.success(`${product.productName} (${size}oz) added to cart`);
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
    const newSizeNum = Number(newSize);
    const item = cart[idx];
    const newPrice = getProductPrice(
      item.product,
      newSizeNum,
      item.subcategory,
      item.addons
    );

    // Don't allow size change if no price for new size
    if (newPrice === null) {
      toast.error(
        `No price available for ${item.product.productName} (${newSizeNum}oz)`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              size: newSizeNum,
              price: newPrice,
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
              price: getProductPrice(item.product, 32, newSub, item.addons),
            }
          : item
      )
    );
  };

  // Calculate total - handle null prices
  const total = cart.reduce((sum, item) => {
    const itemPrice = item.price === null ? 0 : item.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  // Checkout handler (size is numeric)
  const handleCheckout = async () => {
    if (!cashier) {
      toast.error("No cashier assigned. Please contact administrator.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    // Check if any items have no price
    const itemsWithNoPrice = cart.filter((item) => item.price === null);
    if (itemsWithNoPrice.length > 0) {
      toast.error(
        "Some items in cart have no price. Please remove them or contact administrator."
      );
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

  // Remove duplicates - keep products with images, remove duplicates without images
  const uniqueProducts = filteredProducts.reduce((acc, current) => {
    const existingProduct = acc.find(
      (p) =>
        p.productName === current.productName && p.category === current.category
    );

    if (!existingProduct) {
      // If no existing product with same name and category, add current one
      acc.push(current);
    } else if (current.image && !existingProduct.image) {
      // If current has image but existing doesn't, replace existing with current
      const index = acc.indexOf(existingProduct);
      acc[index] = current;
    } else if (current.image && existingProduct.image) {
      // If both have images, keep the one with the default size or first one
      // You can add additional logic here if needed
      if (!existingProduct.size && current.size) {
        const index = acc.indexOf(existingProduct);
        acc[index] = current;
      }
    }
    // If current doesn't have image but existing does, do nothing (keep existing)

    return acc;
  }, []);

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

  // Handle editing add-on price
  const startEditAddonPrice = (addonIndex) => {
    setEditingAddonPrice(addonIndex);
    setTempAddonPrice(addons[addonIndex].price.toString());
  };

  const saveAddonPrice = (addonIndex) => {
    const newPrice = parseFloat(tempAddonPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const updatedAddons = [...addons];
    updatedAddons[addonIndex] = {
      ...updatedAddons[addonIndex],
      price: newPrice,
    };
    setAddons(updatedAddons);
    localStorage.setItem("posAddons", JSON.stringify(updatedAddons));
    setEditingAddonPrice(null);
    setTempAddonPrice("");

    // Update cart items that have this addon
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.addons &&
          item.addons.some(
            (addon) => addon.value === updatedAddons[addonIndex].value
          )
        ) {
          return {
            ...item,
            price: getProductPrice(
              item.product,
              item.size,
              item.subcategory,
              item.addons
            ),
          };
        }
        return item;
      })
    );

    toast.success(
      `Updated ${updatedAddons[addonIndex].name} price to ₱${newPrice}`
    );
  };

  const cancelEditAddonPrice = () => {
    setEditingAddonPrice(null);
    setTempAddonPrice("");
  };

  // Add new add-on
  const addNewAddon = () => {
    if (!newAddonName.trim() || !newAddonPrice) {
      toast.error("Please enter both name and price for the new add-on");
      return;
    }

    const price = parseFloat(newAddonPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const newAddon = {
      name: newAddonName.trim(),
      value: newAddonName.trim().toLowerCase().replace(/\s+/g, "_"),
      price: price,
    };

    const updatedAddons = [...addons, newAddon];
    setAddons(updatedAddons);
    localStorage.setItem("posAddons", JSON.stringify(updatedAddons));
    setNewAddonName("");
    setNewAddonPrice("");
    toast.success(`Added new add-on: ${newAddonName}`);
  };

  // Delete add-on
  const deleteAddon = (addonIndex) => {
    const addonToDelete = addons[addonIndex];
    const updatedAddons = addons.filter((_, index) => index !== addonIndex);
    setAddons(updatedAddons);
    localStorage.setItem("posAddons", JSON.stringify(updatedAddons));

    // Remove this addon from all cart items
    setCart((prev) =>
      prev.map((item) => {
        const updatedAddons = item.addons.filter(
          (addon) => addon.value !== addonToDelete.value
        );
        return {
          ...item,
          addons: updatedAddons,
          price: getProductPrice(
            item.product,
            item.size,
            item.subcategory,
            updatedAddons
          ),
        };
      })
    );

    toast.success(`Deleted add-on: ${addonToDelete.name}`);
  };

  // Handle add-on quantity changes in cart
  const incrementAddonQty = (cartIndex, addonIndex) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i === cartIndex) {
          const updatedAddons = [...item.addons];
          updatedAddons[addonIndex] = {
            ...updatedAddons[addonIndex],
            quantity: (updatedAddons[addonIndex].quantity || 1) + 1,
          };
          return {
            ...item,
            addons: updatedAddons,
            price: getProductPrice(
              item.product,
              item.size,
              item.subcategory,
              updatedAddons
            ),
          };
        }
        return item;
      })
    );
  };

  const decrementAddonQty = (cartIndex, addonIndex) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i === cartIndex) {
          const updatedAddons = [...item.addons];
          const currentQty = updatedAddons[addonIndex].quantity || 1;

          if (currentQty > 1) {
            updatedAddons[addonIndex] = {
              ...updatedAddons[addonIndex],
              quantity: currentQty - 1,
            };
          } else {
            // Remove addon if quantity becomes 0
            updatedAddons.splice(addonIndex, 1);
          }

          return {
            ...item,
            addons: updatedAddons,
            price: getProductPrice(
              item.product,
              item.size,
              item.subcategory,
              updatedAddons
            ),
          };
        }
        return item;
      })
    );
  };

  const removeAddon = (cartIndex, addonIndex) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i === cartIndex) {
          const updatedAddons = item.addons.filter(
            (_, index) => index !== addonIndex
          );
          return {
            ...item,
            addons: updatedAddons,
            price: getProductPrice(
              item.product,
              item.size,
              item.subcategory,
              updatedAddons
            ),
          };
        }
        return item;
      })
    );
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
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold mb-3 text-lg">Edit Add-ons</h3>
              <div className="space-y-3 mb-4">
                {addons.map((addon) => (
                  <div
                    key={addon.value}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={editAddons.some(
                          (a) => a.value === addon.value
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditAddons([
                              ...editAddons,
                              { value: addon.value, quantity: 1 },
                            ]);
                          } else {
                            setEditAddons(
                              editAddons.filter((a) => a.value !== addon.value)
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span className="font-medium">{addon.name}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E89271]">
                        ₱{addon.price} each
                      </span>
                      {editAddons.some((a) => a.value === addon.value) && (
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300">
                          <button
                            onClick={() => {
                              const existing = editAddons.find(
                                (a) => a.value === addon.value
                              );
                              if (existing && existing.quantity > 1) {
                                setEditAddons(
                                  editAddons.map((a) =>
                                    a.value === addon.value
                                      ? { ...a, quantity: a.quantity - 1 }
                                      : a
                                  )
                                );
                              }
                            }}
                            className="px-2 py-1 hover:bg-gray-100 rounded-l transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-sm font-medium">
                            {editAddons.find((a) => a.value === addon.value)
                              ?.quantity || 1}
                          </span>
                          <button
                            onClick={() => {
                              const existing = editAddons.find(
                                (a) => a.value === addon.value
                              );
                              setEditAddons(
                                editAddons.map((a) =>
                                  a.value === addon.value
                                    ? { ...a, quantity: (a.quantity || 1) + 1 }
                                    : a
                                )
                              );
                            }}
                            className="px-2 py-1 hover:bg-gray-100 rounded-r transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditIdx(null);
                    setEditAddons([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditAddons}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Save Add-ons
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
                    {uniqueProducts.map((p) => {
                      const price16 = getProductPrice(p, 16, "", []);
                      const price32 = getProductPrice(p, 32, "", []);

                      // Use the new isSizeAvailable function to determine which sizes are available
                      const has16oz = isSizeAvailable(p, 16);
                      const has32oz = isSizeAvailable(p, 32);

                      return (
                        <div
                          key={p._id}
                          className="border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center hover:shadow-xl hover:border-[#E89271] transition-all"
                        >
                          {p.image ? (
                            <img
                              src={`${BACKEND_URL}${p.image}`}
                              alt={p.productName}
                              className="w-24 h-24 object-cover mb-3 rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-[#E89271] to-[#d67a5c] rounded-lg flex items-center justify-center mb-3">
                              <span className="text-3xl font-bold text-white">
                                {p.productName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="text-center w-full">
                            <div className="font-semibold text-gray-800 text-sm mb-3">
                              {p.productName}
                            </div>
                            {p.size && (
                              <div className="text-xs text-gray-500 mb-2">
                                Default: {p.size}oz
                              </div>
                            )}
                            {/* Size Buttons with Icons and Prices */}
                            <div className="space-y-2 w-full">
                              {/* 16oz Button */}
                              <button
                                onClick={() => addToCart(p, 16)}
                                disabled={!has16oz}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                                  has16oz
                                    ? "border-gray-200 hover:border-[#E89271] hover:bg-gray-50 text-gray-700 cursor-pointer"
                                    : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                <Wine className="w-4 h-4 text-[#E89271]" />
                                16 oz • {formatPriceDisplay(price16)}
                              </button>

                              {/* 32oz Button */}
                              <button
                                onClick={() => addToCart(p, 32)}
                                disabled={!has32oz}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                                  has32oz
                                    ? "border-gray-200 hover:border-[#E89271] hover:bg-gray-50 text-gray-700 cursor-pointer"
                                    : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                <Droplet className="w-4 h-4 text-[#E89271]" />
                                32 oz • {formatPriceDisplay(price32)}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-[#E89271]" />
                    <h2 className="text-xl font-bold text-gray-800">Cart</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddonsManager(!showAddonsManager)}
                      className="flex items-center gap-1 bg-[#E89271] bg-opacity-10 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-opacity-20 transition-colors border border-[#E89271] border-opacity-20"
                      title="Manage Add-ons"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Add-ons</span>
                    </button>
                    <span className="bg-[#E89271] text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {cart.length} items
                    </span>
                  </div>
                </div>

                {/* Add-ons Manager Panel */}
                {showAddonsManager && (
                  <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center">
                      Manage Add-ons
                    </h4>

                    {/* Add New Add-on */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-700 mb-2">
                        Add New Add-on
                      </h5>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newAddonName}
                          onChange={(e) => setNewAddonName(e.target.value)}
                          placeholder="Add-on name"
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          value={newAddonPrice}
                          onChange={(e) => setNewAddonPrice(e.target.value)}
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <button
                        onClick={addNewAddon}
                        className="w-full bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Add New Add-on
                      </button>
                    </div>

                    {/* Current Add-ons */}
                    <div className="space-y-2">
                      {addons.map((addon, index) => (
                        <div
                          key={addon.value}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-700 block">
                              {addon.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {addon.value}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#E89271]">
                              ₱{addon.price}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditAddonPrice(index)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Edit price"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAddon(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Delete add-on"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cart Items */}
                <div className="max-h-[20rem] overflow-y-auto mb-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={`${item.product._id}-${item.size || 16}-${
                          item.subcategory || ""
                        }-${(item.addons || [])
                          .map((a) => `${a.value}-${a.quantity}`)
                          .join(",")}`}
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
                                className="ml-1 text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                title="Add-ons"
                              >
                                <SquarePlus className="w-4 h-4" />
                                <span className="text-xs">Add-ons</span>
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
                                <option value={16}>16 oz</option>
                                <option value={32}>32 oz</option>
                                {item.product.category === "Amerikano" && (
                                  <option value={12}>12 oz (Hotdrinks)</option>
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
                                <option value="Coffee Based">
                                  Coffee Based
                                </option>
                                <option value="Cream Based">Cream Based</option>
                              </select>
                            )}
                            <div className="text-xs text-gray-500">
                              {formatPriceDisplay(item.price)} each
                            </div>

                            {/* Show Add-ons with quantity controls */}
                            {item.addons && item.addons.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.addons.map((addonItem, addonIdx) => {
                                  const addon = addons.find(
                                    (a) => a.value === addonItem.value
                                  );
                                  return addon ? (
                                    <div
                                      key={addon.value}
                                      className="flex items-center justify-between bg-white px-2 py-1 rounded border border-gray-200"
                                    >
                                      <span className="text-xs text-gray-600">
                                        {addon.name}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <div className="flex items-center gap-1 bg-gray-100 rounded">
                                          <button
                                            onClick={() =>
                                              decrementAddonQty(idx, addonIdx)
                                            }
                                            className="px-1 py-0.5 hover:bg-gray-200 rounded-l transition-colors"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </button>
                                          <span className="px-1 text-xs font-medium min-w-4 text-center">
                                            {addonItem.quantity || 1}
                                          </span>
                                          <button
                                            onClick={() =>
                                              incrementAddonQty(idx, addonIdx)
                                            }
                                            className="px-1 py-0.5 hover:bg-gray-200 rounded-r transition-colors"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <button
                                          onClick={() =>
                                            removeAddon(idx, addonIdx)
                                          }
                                          className="text-red-500 hover:text-red-700 transition-colors ml-1"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : null;
                                })}
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
                            {item.price === null
                              ? "no price"
                              : `₱${item.price * item.quantity}`}
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
                  {/* Cashier Display (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cashier
                    </label>
                    <div className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 font-medium">
                        {cashierName || "Loading..."}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Logged in as current user
                    </p>
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
                  disabled={
                    loading ||
                    cart.length === 0 ||
                    cart.some((item) => item.price === null)
                  }
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
