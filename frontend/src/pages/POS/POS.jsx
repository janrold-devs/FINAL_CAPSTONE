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
  Pencil,
} from "lucide-react";
import LoaderModal from "../../components/modals/LoaderModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import AddonModal from "../../components/modals/AddonModal";

const POS = () => {
  const BACKEND_URL =
    import.meta.env.MODE === "development"
      ? "http://localhost:8000"
      : "https://final-capstone-kb79.onrender.com";

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [cashier, setCashier] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [addons, setAddons] = useState([]);
  const [availableQuantities, setAvailableQuantities] = useState({});
  const [ingredientsList, setIngredientsList] = useState([]);

  // Add-ons management states
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showAddonsManager, setShowAddonsManager] = useState(false);

  // For editing add-ons in cart
  const [editIdx, setEditIdx] = useState(null);
  const [editAddons, setEditAddons] = useState([]);

  // Fetch categories from products
  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(products.map((p) => p.category))];
    return ["All", ...uniqueCategories];
  }, [products]);

  // Calculate available quantity for a product
  const calculateAvailableQuantity = (product, size) => {
    if (!product.ingredients || product.ingredients.length === 0) {
      return Infinity;
    }

    let maxAvailable = Infinity;

    product.ingredients.forEach((ingredientItem) => {
      const ingredient = ingredientItem.ingredient;
      if (!ingredient) return;

      const requiredQuantity = ingredientItem.quantity || 0;
      const sizeMultiplier = size === 32 ? 2 : 1;
      const adjustedRequiredQuantity = requiredQuantity * sizeMultiplier;

      if (ingredient.quantity > 0) {
        const availableForIngredient = Math.floor(
          ingredient.quantity / adjustedRequiredQuantity
        );
        maxAvailable = Math.min(maxAvailable, availableForIngredient);
      } else {
        maxAvailable = 0;
      }
    });

    return maxAvailable === Infinity ? 0 : maxAvailable;
  };

  // Enhanced pricing logic
  function getProductPrice(product, size, subcategory, addonItems = []) {
    if (product.sizes && product.sizes.length > 0) {
      const sizeObj = product.sizes.find((s) => s.size === size);
      if (sizeObj && sizeObj.price) {
        let base = sizeObj.price;

        // Add-ons with current prices
        const addonsTotal = (addonItems || []).reduce((sum, addonItem) => {
          const addonProduct = addons.find((a) => a._id === addonItem.value);
          return (
            sum +
            (addonProduct?.sizes?.[0]?.price || 0) * (addonItem.quantity || 1)
          );
        }, 0);

        return base + addonsTotal;
      }
    }

    // Fallback for old products
    if (product.size && size === product.size) {
      let base = product.price || 0;
      const addonsTotal = (addonItems || []).reduce((sum, addonItem) => {
        const addonProduct = addons.find((a) => a._id === addonItem.value);
        return (
          sum +
          (addonProduct?.sizes?.[0]?.price || 0) * (addonItem.quantity || 1)
        );
      }, 0);
      return base + addonsTotal;
    }

    return null;
  }

  // Helper function to check available sizes for a product
  function getAvailableSizes(product) {
    const sizes = [];

    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach((sizeObj) => {
        const availableQty = calculateAvailableQuantity(product, sizeObj.size);
        if (availableQty > 0) {
          sizes.push({
            size: sizeObj.size,
            price: sizeObj.price,
            available: availableQty,
          });
        }
      });
    } else if (product.size) {
      const availableQty = calculateAvailableQuantity(product, product.size);
      if (availableQty > 0) {
        sizes.push({
          size: product.size,
          price: product.price,
          available: availableQty,
        });
      }
    }

    return sizes;
  }

  // Fetch current user profile
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found in localStorage");
        return null;
      }

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const response = await api.get(`/users/${decoded.id}`);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      toast.error("Failed to load user profile");
      return null;
    }
  };

  // Fetch add-ons from products
  // Fetch add-ons from products
  const fetchAddons = async () => {
    try {
      console.log("Fetching add-ons...");
      const response = await api.get("/products?includeAddons=true");
      const allProducts = response.data;
      console.log("All products for add-ons:", allProducts.length, "items");

      const addonProducts = allProducts.filter(
        (product) => product.category === "Add-ons" || product.isAddon
      );
      console.log("Filtered addons:", addonProducts.length, "items");
      console.log("Fetched addons:", addonProducts); // Debug log
      setAddons(addonProducts);
    } catch (err) {
      console.error("Failed to fetch add-ons:", err);
      console.error("Add-ons error details:", err.response?.data);
      toast.error("Failed to load add-ons");
    }
  };

  // Fetch ingredients
  const fetchIngredients = async () => {
    try {
      const res = await api.get("/ingredients");
      setIngredientsList(res.data);
    } catch (err) {
      console.error("Failed to fetch ingredients:", err);
      toast.error("Failed to load ingredients");
    }
  };

  // Fetch products, users, add-ons, and ingredients
  const fetchData = async () => {
    console.log("Starting fetchData...");
    setLoading(true);
    try {
      console.log("Fetching current user...");
      const currentUser = await fetchCurrentUser();
      console.log("Current user:", currentUser);

      console.log("Fetching products and users...");
      const [prodRes, userRes] = await Promise.all([
        api.get("/products?includeAddons=true"),
        api.get("/users"),
      ]);

      console.log("Products response:", prodRes.data.length, "items");
      console.log("Users response:", userRes.data.length, "users");

      // Filter out add-ons from regular products
      const regularProducts = prodRes.data.filter(
        (p) =>
          p.status === "available" && !p.isAddon && p.category !== "Add-ons"
      );
      console.log(
        "Regular products after filtering:",
        regularProducts.length,
        "items"
      );

      setProducts(regularProducts);
      setUsers(userRes.data);

      // Fetch add-ons and ingredients
      console.log("Fetching add-ons and ingredients...");
      await fetchAddons();
      await fetchIngredients();

      // Set cashier to current user
      if (currentUser) {
        setCashier(currentUser._id);
        setCashierName(`${currentUser.firstName} ${currentUser.lastName}`);
        console.log(
          "Cashier set to:",
          currentUser.firstName,
          currentUser.lastName
        );
      } else {
        const adminUser = userRes.data.find((u) => u.role === "admin");
        if (adminUser) {
          setCashier(adminUser._id);
          setCashierName(`${adminUser.firstName} ${adminUser.lastName}`);
          console.log(
            "Cashier set to admin:",
            adminUser.firstName,
            adminUser.lastName
          );
        } else if (userRes.data.length > 0) {
          setCashier(userRes.data[0]._id);
          setCashierName(
            `${userRes.data[0].firstName} ${userRes.data[0].lastName}`
          );
          console.log(
            "Cashier set to first user:",
            userRes.data[0].firstName,
            userRes.data[0].lastName
          );
          toast.warning("No logged-in user detected, using default user");
        } else {
          console.log("No users found in the system");
          toast.error("No users found in the system");
        }
      }
    } catch (err) {
      console.error("Error in fetchData:", err);
      console.error("Error details:", err.response?.data);
      console.error("Error message:", err.message);
      toast.error("Failed to load products or users");
    } finally {
      setLoading(false);
      console.log("fetchData completed");
    }
  };

  // Don't forget to call it in useEffect!
  useEffect(() => {
    console.log("POS component mounted, calling fetchData...");
    fetchData();
  }, []);

  // Update available quantities when products change
  useEffect(() => {
    const quantities = {};
    products.forEach((product) => {
      if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach((sizeObj) => {
          quantities[`${product._id}-${sizeObj.size}`] =
            calculateAvailableQuantity(product, sizeObj.size);
        });
      } else if (product.size) {
        quantities[`${product._id}-${product.size}`] =
          calculateAvailableQuantity(product, product.size);
      }
    });
    setAvailableQuantities(quantities);
  }, [products]);

  // Add product to cart
  const addToCart = (product, size) => {
    const price = getProductPrice(product, size, "", []);
    const availableQty = calculateAvailableQuantity(product, size);

    if (price === null) {
      toast.error(`No price available for ${product.productName} (${size}oz)`);
      return;
    }

    if (availableQty <= 0) {
      toast.error(
        `Insufficient ingredients for ${product.productName} (${size}oz)`
      );
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

  // Handle size change in cart
  const handleSizeChange = (idx, newSize) => {
    const newSizeNum = Number(newSize);
    const item = cart[idx];
    const newPrice = getProductPrice(
      item.product,
      newSizeNum,
      item.subcategory,
      item.addons
    );

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

  // Calculate total
  const total = cart.reduce((sum, item) => {
    const itemPrice = item.price === null ? 0 : item.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  // Checkout handler
  // In handleCheckout function - around line 500
  const handleCheckout = async () => {
    if (!cashier) {
      toast.error("No cashier assigned. Please contact administrator.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

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
      console.log("🔄 Starting checkout process...");

      // FIX: Include add-on names and prices in the transaction data
      const itemsSold = cart.map((item) => {
        // Process add-ons with names and prices
        const processedAddons = (item.addons || []).map((addonItem) => {
          const addonProduct = addons.find((a) => a._id === addonItem.value);
          return {
            addonId: addonItem.value,
            addonName: addonProduct?.productName || "Unknown Add-on",
            quantity: addonItem.quantity || 1,
            price: addonProduct?.sizes?.[0]?.price || 0,
          };
        });

        return {
          product: item.product._id,
          category: item.product.category,
          size: item.size,
          subcategory: item.subcategory,
          price: item.price,
          quantity: item.quantity,
          totalCost: item.price * item.quantity,
          addons: processedAddons,
        };
      });

      console.log("📦 Sending transaction data:", {
        cashier,
        itemsSold,
        modeOfPayment,
        referenceNumber: modeOfPayment !== "Cash" ? referenceNumber : "",
      });

      const response = await api.post("/transactions", {
        cashier,
        itemsSold,
        modeOfPayment,
        referenceNumber: modeOfPayment !== "Cash" ? referenceNumber : "",
      });

      console.log("✅ Transaction successful:", response.data);

      toast.success("Transaction successful!");
      setCart([]);
      setReferenceNumber("");

      // Refresh products to update availability
      const prodRes = await api.get("/products?includeAddons=true");
      const regularProducts = prodRes.data.filter(
        (p) =>
          p.status === "available" && p.category !== "Add-ons" && !p.isAddon
      );
      setProducts(regularProducts);
    } catch (err) {
      console.error("❌ Checkout error:", err);
      console.error("Error response:", err.response?.data);

      const errorMessage =
        err.response?.data?.message || "Checkout failed. Please try again.";
      toast.error(errorMessage);

      // Log detailed error for debugging
      if (err.response?.data) {
        console.error("Server error details:", err.response.data);
      }
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

  // Remove duplicates
  const uniqueProducts = filteredProducts.reduce((acc, current) => {
    const existingProduct = acc.find(
      (p) =>
        p.productName === current.productName && p.category === current.category
    );

    if (!existingProduct) {
      acc.push(current);
    } else if (current.image && !existingProduct.image) {
      const index = acc.indexOf(existingProduct);
      acc[index] = current;
    } else if (current.image && existingProduct.image) {
      if (!existingProduct.size && current.size) {
        const index = acc.indexOf(existingProduct);
        acc[index] = current;
      }
    }
    return acc;
  }, []);

  // Add-ons Management Functions
  const handleSaveAddon = async (formData) => {
    try {
      if (editingAddon) {
        await api.put(`/products/${editingAddon._id}`, formData);
        toast.success("Add-on updated successfully!");
      } else {
        await api.post("/products", formData);
        toast.success("Add-on created successfully!");
      }
      setShowAddonModal(false);
      setEditingAddon(null);
      await fetchAddons(); // Refresh add-ons list
    } catch (err) {
      console.error("Error saving add-on:", err);
      toast.error("Failed to save add-on");
    }
  };

  const handleEditAddon = (addon) => {
    setEditingAddon(addon);
    setShowAddonModal(true);
  };

  const handleDeleteAddon = async (addonId) => {
    try {
      await api.delete(`/products/${addonId}`);
      toast.success("Add-on deleted successfully!");
      await fetchAddons(); // Refresh add-ons list
    } catch (err) {
      console.error("Error deleting add-on:", err);
      toast.error("Failed to delete add-on");
    }
  };

  // Handle opening edit modal for add-ons in cart
  const openEditAddons = (idx, currentAddons) => {
    setEditIdx(idx);
    setEditAddons(currentAddons || []);
  };

  // Handle saving add-ons to cart item
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

  // Format price for display
  function formatPriceDisplay(price) {
    if (price === null || price === undefined) {
      return "no price";
    }
    return `₱${price.toFixed(2)}`;
  }

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

        {/* Add-ons Edit Modal for Cart Items */}
        {editIdx !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold mb-3 text-lg">Edit Add-ons</h3>
              <div className="space-y-3 mb-4">
                {addons.map((addon) => (
                  <div
                    key={addon._id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={editAddons.some((a) => a.value === addon._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditAddons([
                              ...editAddons,
                              { value: addon._id, quantity: 1 },
                            ]);
                          } else {
                            setEditAddons(
                              editAddons.filter((a) => a.value !== addon._id)
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span className="font-medium">{addon.productName}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#E89271]">
                        ₱{addon.sizes?.[0]?.price?.toFixed(2)} each
                      </span>
                      {editAddons.some((a) => a.value === addon._id) && (
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300">
                          <button
                            onClick={() => {
                              const existing = editAddons.find(
                                (a) => a.value === addon._id
                              );
                              if (existing && existing.quantity > 1) {
                                setEditAddons(
                                  editAddons.map((a) =>
                                    a.value === addon._id
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
                            {editAddons.find((a) => a.value === addon._id)
                              ?.quantity || 1}
                          </span>
                          <button
                            onClick={() => {
                              const existing = editAddons.find(
                                (a) => a.value === addon._id
                              );
                              setEditAddons(
                                editAddons.map((a) =>
                                  a.value === addon._id
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

        {/* Add-on Management Modal */}
        {showAddonModal && (
          <AddonModal
            show={showAddonModal}
            onClose={() => {
              setShowAddonModal(false);
              setEditingAddon(null);
            }}
            onSubmit={handleSaveAddon}
            editingAddon={editingAddon}
            ingredientsList={ingredientsList}
          />
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
                      const availableSizes = getAvailableSizes(p);
                      const isOutOfStock = availableSizes.length === 0;

                      return (
                        <div
                          key={p._id}
                          className={`border-2 rounded-xl p-4 flex flex-col items-center transition-all ${
                            isOutOfStock
                              ? "border-gray-300 bg-gray-100 opacity-50"
                              : "border-gray-200 hover:shadow-xl hover:border-[#E89271]"
                          }`}
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

                            {/* Stock Status */}
                            <div className="text-xs mb-2">
                              {isOutOfStock ? (
                                <span className="text-red-600 font-semibold">
                                  Out of Stock
                                </span>
                              ) : (
                                <span className="text-green-600 font-semibold">
                                  Available:{" "}
                                  {Math.max(
                                    ...availableSizes.map((s) => s.available)
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Dynamic Size Buttons */}
                            <div className="space-y-2 w-full">
                              {availableSizes.map((sizeInfo) => (
                                <button
                                  key={sizeInfo.size}
                                  onClick={() => addToCart(p, sizeInfo.size)}
                                  disabled={isOutOfStock}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium border-gray-200 hover:border-[#E89271] hover:bg-gray-50 text-gray-700 cursor-pointer"
                                >
                                  {sizeInfo.size === 16 ? (
                                    <Wine className="w-4 h-4 text-[#E89271]" />
                                  ) : (
                                    <Droplet className="w-4 h-4 text-[#E89271]" />
                                  )}
                                  {sizeInfo.size} oz •{" "}
                                  {formatPriceDisplay(sizeInfo.price)}
                                </button>
                              ))}
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

                    {/* Add New Add-on Button */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-gray-700">
                          Add-ons List
                        </h5>
                        <button
                          onClick={() => {
                            setEditingAddon(null);
                            setShowAddonModal(true);
                          }}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          New Add-on
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Add-ons are managed separately from regular products
                      </p>
                    </div>

                    {/* Current Add-ons List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {addons.map((addon) => (
                        <div
                          key={addon._id}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {addon.productName}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Add-on
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Ingredient:{" "}
                              {addon.ingredients?.[0]?.ingredient?.name ||
                                "N/A"}{" "}
                              • Qty: {addon.ingredients?.[0]?.quantity}{" "}
                              {addon.ingredients?.[0]?.ingredient?.unit}
                            </div>
                            <div className="text-xs font-semibold text-[#E89271]">
                              Price: ₱{addon.sizes?.[0]?.price?.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditAddon(addon)}
                              className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                              title="Edit add-on"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddon(addon._id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Delete add-on"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {addons.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">No add-ons created yet</p>
                        </div>
                      )}
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
                            {/* Size Selector */}
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
                                  const addonProduct = addons.find(
                                    (a) => a._id === addonItem.value
                                  );
                                  return addonProduct ? (
                                    <div
                                      key={addonProduct._id}
                                      className="flex items-center justify-between bg-white px-2 py-1 rounded border border-gray-200"
                                    >
                                      <span className="text-xs text-gray-600">
                                        {addonProduct.productName}
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
                              : `₱${(item.price * item.quantity).toFixed(2)}`}
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
                  {/* Cashier Display */}
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
