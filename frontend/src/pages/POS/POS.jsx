import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import AlertDialog from "../../components/AlertDialog";

// Only log in development
const shouldLog = import.meta.env.MODE === "development";

// Sub-components for better performance
const ProductCard = React.memo(
  ({
    product,
    addToCart,
    calculateAvailableQuantity,
    getAvailableSizes,
    formatPriceDisplay,
  }) => {
    const availableSizes = useMemo(
      () => getAvailableSizes(product),
      [product, getAvailableSizes]
    );
    const isOutOfStock = availableSizes.length === 0;

    return (
      <div
        className={`border-2 rounded-xl p-4 flex flex-col items-center transition-all ${isOutOfStock
          ? "border-gray-300 bg-gray-100 opacity-50"
          : "border-gray-200 hover:shadow-xl hover:border-[#E89271]"
          }`}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.productName}
            className="w-24 h-24 object-cover mb-3 rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-24 h-24 bg-gradient-to-br from-[#E89271] to-[#d67a5c] rounded-lg flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {product.productName.charAt(0)}
            </span>
          </div>
        )}
        <div className="text-center w-full">
          <div className="font-semibold text-gray-800 text-sm mb-3 min-h-[3rem] flex items-center justify-center">
            {product.productName}
          </div>

          <div className="text-xs mb-2">
            {isOutOfStock ? (
              <span className="text-red-600 font-semibold">Out of Stock</span>
            ) : (
              <span className="text-green-600 font-semibold">
                Available: {Math.max(...availableSizes.map((s) => s.available))}
              </span>
            )}
          </div>

          <div className="space-y-2 w-full">
            {availableSizes.map((sizeInfo) => (
              <button
                key={sizeInfo.size}
                onClick={() => addToCart(product, sizeInfo.size)}
                disabled={isOutOfStock}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium border-gray-200 hover:border-[#E89271] hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                {sizeInfo.size === 16 ? (
                  <Wine className="w-4 h-4 text-[#E89271]" />
                ) : (
                  <Droplet className="w-4 h-4 text-[#E89271]" />
                )}
                {sizeInfo.size} oz • {formatPriceDisplay(sizeInfo.price)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

const CartItem = React.memo(
  ({
    item,
    index,
    updateQuantity,
    removeFromCart,
    openEditAddons,
    handleSizeChange,
    handleSubcategoryChange,
    incrementAddonQty,
    decrementAddonQty,
    confirmRemoveAddon,
    formatPriceDisplay,
    addons,
    handleManualQuantityInput,
  }) => {
    const [manualQuantity, setManualQuantity] = useState(item.quantity);
    const [isEditing, setIsEditing] = useState(false);

    // Update local state when item quantity changes
    useEffect(() => {
      setManualQuantity(item.quantity);
    }, [item.quantity]);

    const handleManualSubmit = () => {
      const newQty = parseInt(manualQuantity, 10);
      if (!isNaN(newQty) && newQty > 0 && newQty !== item.quantity) {
        handleManualQuantityInput(item, newQty);
      }
      setIsEditing(false);
    };

    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        handleManualSubmit();
      } else if (e.key === "Escape") {
        setManualQuantity(item.quantity);
        setIsEditing(false);
      }
    };

    const handleInputChange = (e) => {
      const value = e.target.value;
      // Allow empty input temporarily for clearing
      if (value === "") {
        setManualQuantity("");
        return;
      }

      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 999) {
        setManualQuantity(numValue);
      }
    };

    return (
      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="font-semibold text-gray-800 text-sm flex items-center gap-1">
              {item.product.productName}
              <button
                onClick={() => openEditAddons(index, item.addons || [])}
                className="ml-1 text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                title="Add-ons"
              >
                <SquarePlus className="w-4 h-4" />
                <span className="text-xs">Add-ons</span>
              </button>
            </div>

            {[
              "Iced Latte",
              "Bubble Tea",
              "Fruit Tea",
              "Non Caffeine",
              "Amerikano",
            ].includes(item.product.category) && (
                <select
                  value={item.size}
                  onChange={(e) => handleSizeChange(index, e.target.value)}
                  className="border rounded px-2 py-1 text-xs mt-1"
                >
                  <option value={16}>16 oz</option>
                  <option value={22}>22 oz</option>
                  {item.product.category === "Amerikano" && (
                    <option value={12}>12 oz (Hotdrinks)</option>
                  )}
                </select>
              )}

            {item.product.category === "Frappe" && (
              <select
                value={item.subcategory}
                onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                className="border rounded px-2 py-1 text-xs mt-1"
              >
                <option value="Coffee Based">Coffee Based</option>
                <option value="Cream Based">Cream Based</option>
              </select>
            )}

            <div className="text-xs text-gray-500">
              {formatPriceDisplay(item.price)} each
            </div>

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
                            onClick={() => decrementAddonQty(index, addonIdx)}
                            className="px-1 py-0.5 hover:bg-gray-200 rounded-l transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1 text-xs font-medium min-w-4 text-center">
                            {addonItem.quantity || 1}
                          </span>
                          <button
                            onClick={() => incrementAddonQty(index, addonIdx)}
                            className="px-1 py-0.5 hover:bg-gray-200 rounded-r transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            confirmRemoveAddon(
                              index,
                              addonIdx,
                              addonProduct?.productName || "Add-on"
                            );
                          }}
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
            onClick={() => removeFromCart(item)}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          {/* Quantity controls with manual input */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={manualQuantity}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  onBlur={handleManualSubmit}
                  autoFocus
                  className="w-20 border-2 border-[#E89271] rounded-lg px-2 py-1 text-center font-semibold focus:outline-none focus:ring-1 focus:ring-[#E89271]"
                />
                <button
                  onClick={handleManualSubmit}
                  className="bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700 transition-colors text-xs"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setManualQuantity(item.quantity);
                    setIsEditing(false);
                  }}
                  className="bg-gray-600 text-white px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-lg border-2 border-gray-200">
                  <button
                    onClick={() => updateQuantity(item, -1)}
                    className="px-2 py-1 hover:bg-gray-100 rounded-l-lg transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span
                    onClick={() => setIsEditing(true)}
                    className="px-3 font-semibold text-gray-800 cursor-pointer hover:bg-gray-50 hover:rounded min-w-[40px] text-center"
                    title="Click to edit quantity"
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item, 1)}
                    className="px-2 py-1 hover:bg-gray-100 rounded-r-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#E89271] hover:text-[#d67a5c] font-medium underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div className="font-bold text-[#E89271]">
            {item.price === null
              ? "no price"
              : `₱${(item.price * item.quantity).toFixed(2)}`}
          </div>
        </div>
      </div>
    );
  }
);

const POS = () => {
  // State declarations
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [cashier, setCashier] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [addons, setAddons] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);

  // Add-ons management states
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showAddonsManager, setShowAddonsManager] = useState(false);

  // For editing add-ons in cart
  const [editIdx, setEditIdx] = useState(null);
  const [editAddons, setEditAddons] = useState([]);

  // Alert dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Delete",
    confirmColor: "red",
  });

  // Memoized calculations
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map((p) => p.category))];
    return ["All", ...uniqueCategories];
  }, [products]);

  const calculateAvailableQuantity = useCallback((product, size) => {
    if (!product.ingredients || product.ingredients.length === 0) {
      return Infinity;
    }

    let maxAvailable = Infinity;
    let hasCriticalConstraint = false;

    product.ingredients.forEach((recipe) => {
      // Use the freshest ingredient data if it exists in ingredientsList
      const baseIngredient = recipe.ingredient;
      if (!baseIngredient) return;

      const ingredient = ingredientsList.find(ing => ing._id === (baseIngredient._id || baseIngredient)) || baseIngredient;
      if (typeof ingredient.quantity === 'undefined') return;

      const ingredientName = (ingredient.name || "").toUpperCase();
      const isCritical = (ingredient.category || "").toLowerCase() !== "material" || ingredientName.includes("CUP");

      if (!isCritical) return;

      let requiredPerUnit = 0;
      const sizeQty = recipe.quantities?.find(q => Number(q.size) === Number(size));

      if (sizeQty) {
        requiredPerUnit = sizeQty.quantity;
      } else {
        // Legacy Fallback
        const productCategory = (product.category || "").toUpperCase();

        const shouldDeduct = (name, s, cat) => {
          if (name.includes("CUP")) {
            // Handle both "16OZ" and "16 OZ"
            const sizePattern = new RegExp(s + "\\s*OZ", "i");
            return sizePattern.test(name);
          }
          if (name.includes("LID")) {
            if (cat === "HOT DRINK") return name.includes("HOT");
            return name.includes("95MM");
          }
          return true;
        };

        if (!shouldDeduct(ingredientName, size, productCategory)) return;

        const getMultiplier = (s) => (s === 22 ? 1.375 : s === 12 ? 0.75 : 1);
        let multiplier = getMultiplier(size);
        if (ingredient.category === "Material") multiplier = 1;
        requiredPerUnit = (recipe.quantity || 0) * multiplier;
      }

      if (requiredPerUnit <= 0) return;

      hasCriticalConstraint = true;
      const availableForThis = Math.floor(ingredient.quantity / requiredPerUnit);
      maxAvailable = Math.min(maxAvailable, availableForThis);
    });

    if (!hasCriticalConstraint) return 999;
    return maxAvailable === Infinity ? 0 : maxAvailable;
  }, [ingredientsList]);

  const getProductPrice = useCallback(
    (product, size, subcategory, addonItems = []) => {
      if (product.sizes && product.sizes.length > 0) {
        const sizeObj = product.sizes.find((s) => s.size === size);
        if (sizeObj && sizeObj.price) {
          let base = sizeObj.price;
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
    },
    [addons]
  );

  const getAvailableSizes = useCallback(
    (product) => {
      const sizes = [];
      if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach((sizeObj) => {
          const availableQty = calculateAvailableQuantity(
            product,
            sizeObj.size
          );
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
    },
    [calculateAvailableQuantity]
  );

  // Helper function to generate receipt HTML
  const generateReceiptHTML = useCallback(
    ({
      items,
      totalAmount,
      modeOfPayment,
      referenceNumber,
      cashReceived,
      change,
      transactionDate,
    }) => {
      const formattedDate = transactionDate.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - KKPOPI.TEA</title>
        <style>
          @media print {
            body {
              font-family: 'Courier New', monospace !important;
              font-size: 12px !important;
              margin: 0 !important;
              padding: 10px !important;
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              margin: 0;
              size: auto;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
            width: 300px;
            max-width: 100%;
          }
          * {
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 2px dashed #000;
          }
          .header h1 {
            font-size: 16px;
            margin: 5px 0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 10px;
            margin: 5px 0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p {
            margin: 3px 0;
            font-size: 11px;
          }
          .transaction-info {
            text-align: center;
            margin: 8px 0;
            padding: 5px;
          }
          .transaction-date {
            font-size: 11px;
            color: #666;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .item {
            margin: 8px 0;
          }
          .item-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .item-name {
            flex: 1;
          }
          .item-price {
            text-align: right;
            min-width: 70px;
          }
          .addon {
            display: flex;
            justify-content: space-between;
            margin: 1px 0 1px 15px;
            color: #666;
            font-size: 10px;
          }
          .total {
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 14px;
          }
          .thank-you {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-style: italic;
            font-size: 11px;
          }
          .payment-info {
            margin-top: 15px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .payment-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .cash-info {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
          }
          .cash-line {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .gcash-info {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KKPOPI.TEA</h1>
          <h2>CONGRESSIONAL AVE., DASMARIÑAS, CAVITE</h2>
          <p>--------------------------------</p>
          <div class="transaction-info">
            <div class="transaction-date">${formattedDate}</div>
          </div>
          <p>--------------------------------</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${items.length > 0
          ? items
            .map((item) => {
              const productName =
                item.productName ||
                item.snapshot?.productName ||
                "Product";
              const size = item.size ? `${item.size}oz` : "";
              const quantity = item.quantity || 1;
              const price = item.price || item.totalCost / quantity || 0;
              const itemTotal = (price * quantity).toFixed(2);

              return `
                    <div class="item">
                      <div class="item-line">
                        <span class="item-name">${productName} ${size} x${quantity}</span>
                        <span class="item-price">₱${itemTotal}</span>
                      </div>
                      ${item.addons && item.addons.length > 0
                  ? item.addons
                    .map(
                      (addon) => `
                          <div class="addon">
                            <span>+ ${addon.addonName || "Add-on"} x${addon.quantity || 1
                        }</span>
                            <span>₱${(
                          (addon.price || 0) * (addon.quantity || 1)
                        ).toFixed(2)}</span>
                          </div>
                        `
                    )
                    .join("")
                  : ""
                }
                    </div>
                  `;
            })
            .join("")
          : "<div class='item-line'><span>No items</span></div>"
        }
        </div>
        
        <div class="divider"></div>
        
        <div class="total">
          <span>TOTAL AMOUNT:</span>
          <span>₱${totalAmount.toFixed(2)}</span>
        </div>
        
        <div class="payment-info">
          <div class="payment-line">
            <span>Payment Method:</span>
            <span><strong>${modeOfPayment}</strong></span>
          </div>
          ${modeOfPayment === "GCash" && referenceNumber
          ? `
            <div class="gcash-info">
              <div class="payment-line">
                <span>Reference Number:</span>
                <span>${referenceNumber}</span>
              </div>
            </div>
          `
          : ""
        }
          ${modeOfPayment === "Cash" && cashReceived > 0
          ? `
            <div class="cash-info">
              <div class="cash-line">
                <span>Cash Received:</span>
                <span>₱${cashReceived.toFixed(2)}</span>
              </div>
              <div class="cash-line">
                <span>Change:</span>
                <span>₱${change.toFixed(2)}</span>
              </div>
            </div>
          `
          : ""
        }
        </div>
        
        <div class="thank-you">
          <p>Thank you for your purchase!</p>
          <p>Please come again!</p>
        </div>
        
        <div class="footer">
          <p>--------------------------------</p>
        </div>
        
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              try {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              } catch (e) {
                console.log('Auto-print failed');
              }
            }, 300);
          });
          
          if (document.readyState === 'complete') {
            setTimeout(function() {
              try {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              } catch (e) {
                console.log('Auto-print failed');
              }
            }, 300);
          }
        </script>
      </body>
      </html>
    `;
    },
    []
  );

  // Print receipt function
  const printReceipt = useCallback(
    (receiptData) => {
      try {
        console.log("🖨️ Printing receipt...", receiptData);

        // Extract data with fallbacks
        const items = receiptData.itemsSold || [];
        const totalAmount = receiptData.totalAmount || receiptData.total || 0;
        const modeOfPayment = receiptData.modeOfPayment || "Cash";
        const referenceNumber = receiptData.referenceNumber || "";

        // For cash payments, use receiptData.cashReceived, otherwise use 0
        const cashReceived =
          modeOfPayment === "Cash" ? receiptData.cashReceived || 0 : 0;

        // For cash payments, calculate change, otherwise 0
        const change =
          modeOfPayment === "Cash"
            ? receiptData.change ||
            (cashReceived >= totalAmount ? cashReceived - totalAmount : 0)
            : 0;

        const transactionDate = receiptData.transactionDate
          ? new Date(receiptData.transactionDate)
          : new Date();

        // Generate receipt HTML
        const receiptHTML = generateReceiptHTML({
          items,
          totalAmount,
          modeOfPayment,
          referenceNumber,
          cashReceived,
          change,
          transactionDate,
        });

        // Try to open print window
        const printWindow = window.open(
          "",
          "_blank",
          "width=900,height=700,scrollbars=no,toolbar=no,menubar=no"
        );

        if (printWindow) {
          printWindow.document.write(receiptHTML);
          printWindow.document.close();

          // Focus on the new window
          printWindow.focus();

          console.log("✅ Receipt window opened successfully");
        } else {
          console.warn("Popup blocked. Using fallback method...");

          // Fallback method - create hidden iframe
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";

          document.body.appendChild(iframe);

          let iframeDoc = iframe.contentWindow || iframe.contentDocument;
          if (iframeDoc.document) iframeDoc = iframeDoc.document;

          iframeDoc.open();
          iframeDoc.write(receiptHTML);
          iframeDoc.close();

          // Wait for content to load then focus
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
            } catch (printError) {
              console.error("Iframe focus error:", printError);
            }

            // Clean up
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }, 500);
        }
      } catch (error) {
        console.error("❌ Receipt printing error:", error);
        toast.error("Failed to print receipt, but transaction was successful!");
      }
    },
    [generateReceiptHTML]
  );

  // API calls
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        shouldLog && console.log("No token found");
        return null;
      }
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const response = await api.get(`/users/${decoded.id}`);
      return response.data;
    } catch (err) {
      shouldLog && console.error("Failed to fetch user profile:", err);
      toast.error("Failed to load user profile");
      return null;
    }
  }, []);

  const fetchAddons = useCallback(async () => {
    try {
      shouldLog && console.log("Fetching add-ons...");
      const response = await api.get("/products?includeAddons=true");
      const allProducts = response.data;
      const addonProducts = allProducts.filter(
        (product) => product.category === "Add-ons" || product.isAddon
      );
      setAddons(addonProducts);
    } catch (err) {
      shouldLog && console.error("Failed to fetch add-ons:", err);
      toast.error("Failed to load add-ons");
    }
  }, []);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await api.get("/ingredients");
      setIngredientsList(res.data);
    } catch (err) {
      shouldLog && console.error("Failed to fetch ingredients:", err);
      toast.error("Failed to load ingredients");
    }
  }, []);

  const fetchData = useCallback(async () => {
    shouldLog && console.log("Starting fetchData...");
    setLoading(true);
    try {
      const [currentUser, prodRes, userRes] = await Promise.all([
        fetchCurrentUser(),
        api.get("/products?includeAddons=true"),
        api.get("/users"),
      ]);

      const regularProducts = prodRes.data.filter(
        (p) =>
          p.status === "available" && !p.isAddon && p.category !== "Add-ons"
      );

      setProducts(regularProducts);
      setUsers(userRes.data);

      await Promise.all([fetchAddons(), fetchIngredients()]);

      // Set cashier
      if (currentUser) {
        setCashier(currentUser._id);
        setCashierName(`${currentUser.firstName} ${currentUser.lastName}`);
      } else {
        const adminUser = userRes.data.find((u) => u.role === "admin");
        if (adminUser) {
          setCashier(adminUser._id);
          setCashierName(`${adminUser.firstName} ${adminUser.lastName}`);
        } else if (userRes.data.length > 0) {
          setCashier(userRes.data[0]._id);
          setCashierName(
            `${userRes.data[0].firstName} ${userRes.data[0].lastName}`
          );
        }
      }
    } catch (err) {
      shouldLog && console.error("Error in fetchData:", err);
      toast.error("Failed to load products or users");
    } finally {
      setLoading(false);
      shouldLog && console.log("fetchData completed");
    }
  }, [fetchCurrentUser, fetchAddons, fetchIngredients]);

  // Effects
  useEffect(() => {
    shouldLog && console.log("POS component mounted, calling fetchData...");
    fetchData();
  }, [fetchData]);

  // Cart operations
  const addToCart = useCallback(
    (product, size) => {
      const price = getProductPrice(product, size, "", []);
      const availableQty = calculateAvailableQuantity(product, size);

      if (price === null) {
        toast.error(
          `No price available for ${product.productName} (${size}oz)`
        );
        return;
      }

      if (availableQty <= 0) {
        toast.error(
          `Insufficient ingredients for ${product.productName} (${size}oz)`
        );
        return;
      }

      setCart((prev) => {
        const existingItemIndex = prev.findIndex(
          (item) =>
            item.product._id === product._id &&
            item.size === size &&
            item.subcategory === "" &&
            JSON.stringify(item.addons || []) === JSON.stringify([])
        );

        if (existingItemIndex !== -1) {
          const updatedCart = [...prev];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: updatedCart[existingItemIndex].quantity + 1,
          };
          return updatedCart;
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
    },
    [getProductPrice, calculateAvailableQuantity]
  );

  const updateCartQuantity = useCallback((item, change) => {
    setCart((prev) =>
      prev.map((cartItem) =>
        cartItem.product._id === item.product._id &&
          cartItem.size === item.size &&
          cartItem.subcategory === item.subcategory &&
          JSON.stringify(cartItem.addons || []) ===
          JSON.stringify(item.addons || [])
          ? { ...cartItem, quantity: Math.max(1, cartItem.quantity + change) }
          : cartItem
      )
    );
  }, []);

  // Manual quantity input handler
  const handleManualQuantityInput = useCallback((item, newQuantity) => {
    if (newQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (newQuantity > 999) {
      toast.error("Maximum quantity is 999");
      return;
    }

    setCart((prev) =>
      prev.map((cartItem) =>
        cartItem.product._id === item.product._id &&
          cartItem.size === item.size &&
          cartItem.subcategory === item.subcategory &&
          JSON.stringify(cartItem.addons || []) ===
          JSON.stringify(item.addons || [])
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    );

    toast.info(`Quantity updated to ${newQuantity}`);
  }, []);

  const removeFromCart = useCallback((item) => {
    setCart((prev) =>
      prev.filter(
        (cartItem) =>
          !(
            cartItem.product._id === item.product._id &&
            cartItem.size === item.size &&
            cartItem.subcategory === item.subcategory &&
            JSON.stringify(cartItem.addons || []) ===
            JSON.stringify(item.addons || [])
          )
      )
    );
    toast.info("Item removed from cart");
  }, []);

  const handleSizeChange = useCallback(
    (idx, newSize) => {
      const newSizeNum = Number(newSize);
      setCart((prev) =>
        prev.map((item, i) => {
          if (i === idx) {
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
              return item;
            }
            return { ...item, size: newSizeNum, price: newPrice };
          }
          return item;
        })
      );
    },
    [getProductPrice]
  );

  const handleSubcategoryChange = useCallback(
    (idx, newSub) => {
      setCart((prev) =>
        prev.map((item, i) => {
          if (i === idx) {
            const newPrice = getProductPrice(
              item.product,
              32,
              newSub,
              item.addons
            );
            return { ...item, subcategory: newSub, size: 32, price: newPrice };
          }
          return item;
        })
      );
    },
    [getProductPrice]
  );

  // Add-ons operations
  const incrementAddonQty = useCallback(
    (cartIndex, addonIndex) => {
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
    },
    [getProductPrice]
  );

  const decrementAddonQty = useCallback(
    (cartIndex, addonIndex) => {
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
    },
    [getProductPrice]
  );

  const removeAddon = useCallback(
    (cartIndex, addonIndex) => {
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
    },
    [getProductPrice]
  );

  // Checkout and receipt
  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.price === null ? 0 : item.price;
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [cart]);

  // Calculate change
  const change = useMemo(() => {
    const cash = parseFloat(cashReceived) || 0;
    return cash >= total ? cash - total : 0;
  }, [cashReceived, total]);

  // Handle checkout function
  const handleCheckout = useCallback(async () => {
    if (!cashier || cart.length === 0) {
      toast.error(
        cart.length === 0 ? "Cart is empty." : "No cashier assigned."
      );
      return;
    }

    // Validate prices and payment
    const itemsWithNoPrice = cart.filter((item) => item.price === null);
    if (itemsWithNoPrice.length > 0) {
      toast.error(
        "Some items in cart have no price. Please remove them or contact administrator."
      );
      return;
    }

    // Cash payment validation
    if (modeOfPayment === "Cash") {
      const cash = parseFloat(cashReceived);
      if (!cash || cash <= 0) {
        toast.error("Please enter cash amount received");
        return;
      }
      if (cash < total) {
        toast.error(`Insufficient cash. Total: ₱${total.toFixed(2)}`);
        return;
      }
    }

    // GCash payment validation
    if (modeOfPayment === "GCash" && !referenceNumber.trim()) {
      toast.error("Please enter a reference number for GCash payment.");
      return;
    }

    if (modeOfPayment === "GCash" && referenceNumber.length !== 13) {
      toast.error("GCash reference number must be exactly 13 digits.");
      return;
    }

    setTransactionLoading(true);

    try {
      // Prepare data efficiently
      const itemsSold = cart.map((item) => ({
        product: item.product._id,
        productName: item.product.productName,
        category: item.product.category,
        size: item.size,
        subcategory: item.subcategory,
        price: item.price,
        quantity: item.quantity,
        totalCost: item.price * item.quantity,
        addons: (item.addons || []).map((addonItem) => ({
          addonId: addonItem.value,
          addonName:
            addons.find((a) => a._id === addonItem.value)?.productName ||
            "Add-on",
          quantity: addonItem.quantity || 1,
          price:
            addons.find((a) => a._id === addonItem.value)?.sizes?.[0]?.price ||
            0,
        })),
      }));

      console.log("🛒 Sending transaction data:", itemsSold);

      const transactionPayload = {
        cashier,
        itemsSold,
        modeOfPayment,
        referenceNumber: modeOfPayment !== "Cash" ? referenceNumber : "",
        cashReceived: modeOfPayment === "Cash" ? parseFloat(cashReceived) : 0,
        change: modeOfPayment === "Cash" ? parseFloat(cashReceived) - total : 0,
        totalAmount: total,
      };

      // Create transaction
      console.log("📤 Creating transaction...");
      const response = await api.post("/transactions", transactionPayload);

      console.log("✅ Transaction successful:", response.data);

      if (!response.data || !response.data._id) {
        throw new Error("Transaction created but no transaction ID returned");
      }

      // Prepare receipt data
      const receiptData = {
        ...response.data,
        itemsSold: itemsSold,
        totalAmount: total,
        modeOfPayment: modeOfPayment,
        referenceNumber: modeOfPayment !== "Cash" ? referenceNumber : "",
        cashReceived: modeOfPayment === "Cash" ? parseFloat(cashReceived) : 0,
        change: modeOfPayment === "Cash" ? parseFloat(cashReceived) - total : 0,
      };

      // Immediate UI updates
      setCart([]);
      setReferenceNumber("");
      if (modeOfPayment === "Cash") {
        setCashReceived(""); // Only clear cashReceived if it was Cash payment
      }
      setModeOfPayment("Cash");

      toast.success("Transaction successful!");

      // Print receipt
      console.log("🖨️ Printing receipt...");
      printReceipt(receiptData);

      // Background refresh without blocking user
      setTimeout(async () => {
        try {
          await fetchData();
          console.log("🔄 Data refreshed after transaction");
        } catch (error) {
          console.error("Background refresh failed:", error);
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Checkout error:", err);
      console.error("Error response:", err.response?.data);

      const errorMessage =
        err.response?.data?.message || "Checkout failed. Please try again.";
      toast.error(errorMessage);

      // If it's a stock error, refresh product data
      if (err.response?.data?.message?.includes("ingredients in stock")) {
        setTimeout(async () => {
          try {
            await fetchData();
            console.log("🔄 Data refreshed after stock error");
          } catch (error) {
            console.error("Background refresh failed:", error);
          }
        }, 500);
      }
    } finally {
      setTransactionLoading(false);
    }
  }, [
    cashier,
    cart,
    modeOfPayment,
    referenceNumber,
    cashReceived,
    total,
    addons,
    printReceipt,
    fetchData,
  ]);

  // Filtering and formatting
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category &&
          p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const uniqueProducts = useMemo(() => {
    return filteredProducts.reduce((acc, current) => {
      const existingProduct = acc.find(
        (p) =>
          p.productName === current.productName &&
          p.category === current.category
      );
      if (!existingProduct) {
        acc.push(current);
      }
      return acc;
    }, []);
  }, [filteredProducts]);

  const formatPriceDisplay = useCallback((price) => {
    if (price === null || price === undefined) return "no price";
    return `₱${price.toFixed(2)}`;
  }, []);

  // Add-ons management
  const handleSaveAddon = useCallback(
    async (formData) => {
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
        await fetchAddons();
      } catch (err) {
        shouldLog && console.error("Error saving add-on:", err);
        toast.error("Failed to save add-on");
      }
    },
    [editingAddon, fetchAddons]
  );

  const handleEditAddon = useCallback((addon) => {
    setEditingAddon(addon);
    setShowAddonModal(true);
  }, []);

  const handleDeleteAddon = useCallback(
    async (addonId) => {
      const addonToDelete = addons.find((a) => a._id === addonId);
      setDeleteConfirmation({
        show: true,
        title: "Delete Add-on",
        message: `Are you sure you want to delete "${addonToDelete?.productName}"?`,
        onConfirm: async () => {
          try {
            await api.delete(`/products/${addonId}`);
            toast.success("Add-on deleted successfully!");
            await fetchAddons();
            setDeleteConfirmation((prev) => ({ ...prev, show: false }));
          } catch (err) {
            shouldLog && console.error("Error deleting add-on:", err);
            toast.error("Failed to delete add-on");
            setDeleteConfirmation((prev) => ({ ...prev, show: false }));
          }
        },
        confirmText: "Delete",
        confirmColor: "red",
      });
    },
    [addons, fetchAddons]
  );

  const openEditAddons = useCallback((idx, currentAddons) => {
    setEditIdx(idx);
    setEditAddons(currentAddons || []);
  }, []);

  const saveEditAddons = useCallback(() => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === editIdx
          ? {
            ...item,
            addons: editAddons.map((addon) => ({
              value: addon.value,
              quantity: addon.quantity || 1,
            })),
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
  }, [editIdx, editAddons, getProductPrice]);

  // Confirmation functions
  const confirmRemoveFromCart = useCallback(
    (item, productName) => {
      setDeleteConfirmation({
        show: true,
        title: "Remove from Cart",
        message: `Are you sure you want to remove "${productName}" from your cart?`,
        onConfirm: () => {
          removeFromCart(item);
          setDeleteConfirmation((prev) => ({ ...prev, show: false }));
        },
        confirmText: "Remove",
        confirmColor: "red",
      });
    },
    [removeFromCart]
  );

  const confirmRemoveAddon = useCallback(
    (cartIndex, addonIndex, addonName) => {
      setDeleteConfirmation({
        show: true,
        title: "Remove Add-on",
        message: `Are you sure you want to remove "${addonName}" from this item?`,
        onConfirm: () => {
          removeAddon(cartIndex, addonIndex);
          setDeleteConfirmation((prev) => ({ ...prev, show: false }));
        },
        confirmText: "Remove",
        confirmColor: "red",
      });
    },
    [removeAddon]
  );

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

        <AlertDialog
          show={deleteConfirmation.show}
          title={deleteConfirmation.title}
          message={deleteConfirmation.message}
          onCancel={() =>
            setDeleteConfirmation((prev) => ({ ...prev, show: false }))
          }
          onConfirm={deleteConfirmation.onConfirm}
          confirmText={deleteConfirmation.confirmText}
          confirmColor={deleteConfirmation.confirmColor}
          cancelText="Cancel"
        />

        {/* Add-ons Edit Modal */}
        {editIdx !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-800">
                  Edit Add-ons
                </h3>
                <button
                  onClick={() => {
                    setEditIdx(null);
                    setEditAddons([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                {addons.map((addon) => {
                  const calculateAddonAvailability = (addonProduct, currentSize) => {
                    if (
                      !addonProduct.ingredients ||
                      addonProduct.ingredients.length === 0
                    )
                      return Infinity;
                    let maxAvailable = Infinity;
                    let hasCriticalConstraint = false;

                    addonProduct.ingredients.forEach((recipe) => {
                      const baseIngredient = recipe.ingredient;
                      if (!baseIngredient) return;

                      const ingredient = ingredientsList.find(ing => ing._id === (baseIngredient._id || baseIngredient)) || baseIngredient;
                      if (typeof ingredient.quantity === 'undefined') return;

                      const ingredientName = (ingredient.name || "").toUpperCase();
                      const isCritical = (ingredient.category || "").toLowerCase() !== "material" || ingredientName.includes("CUP");

                      if (!isCritical) return;

                      let requiredPerUnit = 0;
                      const sizeQty = recipe.quantities?.find(q => Number(q.size) === Number(currentSize));

                      if (sizeQty) {
                        requiredPerUnit = sizeQty.quantity;
                      } else {
                        // Legacy Fallback
                        const getMultiplier = (s) => (s === 22 ? 1.375 : s === 12 ? 0.75 : 1);
                        let multiplier = getMultiplier(currentSize);
                        if (ingredient.category === "Material") multiplier = 1;
                        requiredPerUnit = (recipe.quantity || 0) * multiplier;
                      }

                      if (requiredPerUnit <= 0) return;

                      hasCriticalConstraint = true;
                      const availableForIngredient = Math.floor(
                        ingredient.quantity / requiredPerUnit
                      );
                      maxAvailable = Math.min(
                        maxAvailable,
                        availableForIngredient
                      );
                    });

                    if (!hasCriticalConstraint) return 999;
                    return maxAvailable === Infinity ? 0 : maxAvailable;
                  };

                  const availableQuantity = calculateAddonAvailability(addon, cart[editIdx].size);
                  const isOutOfStock = availableQuantity <= 0;
                  const isLowStock =
                    availableQuantity > 0 && availableQuantity <= 10;
                  const isChecked = editAddons.some(
                    (a) => a.value === addon._id
                  );
                  const currentQuantity =
                    editAddons.find((a) => a.value === addon._id)?.quantity ||
                    1;

                  return (
                    <div
                      key={addon._id}
                      className={`border rounded-lg p-3 transition-all ${isChecked
                        ? "ring-2 ring-blue-500 border-blue-300"
                        : "border-gray-200"
                        } ${isOutOfStock ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked && !isOutOfStock)
                                setEditAddons([
                                  ...editAddons,
                                  { value: addon._id, quantity: 1 },
                                ]);
                              else
                                setEditAddons(
                                  editAddons.filter(
                                    (a) => a.value !== addon._id
                                  )
                                );
                            }}
                            disabled={isOutOfStock}
                            className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800">
                                {addon.productName}
                              </span>
                              {isOutOfStock && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  Out of Stock
                                </span>
                              )}
                              {isLowStock && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                  Low Stock
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-[#E89271]">
                                ₱{addon.sizes?.[0]?.price?.toFixed(2)} each
                              </div>
                              <div
                                className={`text-xs ${isOutOfStock
                                  ? "text-red-600"
                                  : "text-green-600"
                                  }`}
                              >
                                {isOutOfStock
                                  ? "Not available"
                                  : `${availableQuantity} available`}
                              </div>
                            </div>
                          </div>
                        </label>

                        {isChecked && !isOutOfStock && (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300">
                              <button
                                onClick={() => {
                                  const existing = editAddons.find(
                                    (a) => a.value === addon._id
                                  );
                                  if (existing && existing.quantity > 1)
                                    setEditAddons(
                                      editAddons.map((a) =>
                                        a.value === addon._id
                                          ? { ...a, quantity: a.quantity - 1 }
                                          : a
                                      )
                                    );
                                }}
                                className="px-2 py-1 hover:bg-gray-100 rounded-l transition-colors"
                                disabled={currentQuantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-sm font-medium min-w-8 text-center">
                                {currentQuantity}
                              </span>
                              <button
                                onClick={() => {
                                  const existing = editAddons.find(
                                    (a) => a.value === addon._id
                                  );
                                  if (
                                    !existing ||
                                    currentQuantity < availableQuantity
                                  )
                                    setEditAddons(
                                      editAddons.map((a) =>
                                        a.value === addon._id
                                          ? {
                                            ...a,
                                            quantity: (a.quantity || 1) + 1,
                                          }
                                          : a
                                      )
                                    );
                                }}
                                disabled={currentQuantity >= availableQuantity}
                                className="px-2 py-1 hover:bg-gray-100 rounded-r transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {currentQuantity >= availableQuantity &&
                              availableQuantity > 0 && (
                                <span className="text-xs text-red-500 text-center">
                                  Max: {availableQuantity}
                                </span>
                              )}
                          </div>
                        )}
                      </div>

                      {isLowStock && !isOutOfStock && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                          Only {availableQuantity} servings left
                        </div>
                      )}

                      {isOutOfStock && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          This add-on is currently out of stock
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {editAddons.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">
                    Selected Add-ons:
                  </h4>
                  <div className="space-y-1">
                    {editAddons.map((addonItem) => {
                      const addonProduct = addons.find(
                        (a) => a._id === addonItem.value
                      );
                      return addonProduct ? (
                        <div
                          key={addonProduct._id}
                          className="flex justify-between text-xs text-blue-700"
                        >
                          <span>
                            {addonProduct.productName} × {addonItem.quantity}
                          </span>
                          <span>
                            ₱
                            {(
                              addonProduct.sizes?.[0]?.price *
                              addonItem.quantity
                            ).toFixed(2)}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex justify-between font-semibold text-blue-800 text-sm mt-2 pt-2 border-t border-blue-200">
                    <span>Total Add-ons Cost:</span>
                    <span>
                      ₱
                      {editAddons
                        .reduce((sum, addonItem) => {
                          const addonProduct = addons.find(
                            (a) => a._id === addonItem.value
                          );
                          return (
                            sum +
                            (addonProduct?.sizes?.[0]?.price || 0) *
                            (addonItem.quantity || 1)
                          );
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditIdx(null);
                    setEditAddons([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditAddons}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Add-ons
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddonModal && (
          <AddonModal
            show={showAddonModal}
            onClose={() => {
              setShowAddonModal(false);
              setEditingAddon(null);
            }}
            onSubmit={handleSaveAddon}
            onDelete={handleDeleteAddon}
            editingAddon={editingAddon}
            ingredientsList={ingredientsList}
          />
        )}

        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product List Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
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

                <div className="mb-6 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedCategory === category
                        ? "bg-[#E89271] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E89271] border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                    {uniqueProducts.map((p) => (
                      <ProductCard
                        key={p._id}
                        product={p}
                        addToCart={addToCart}
                        calculateAvailableQuantity={calculateAvailableQuantity}
                        getAvailableSizes={getAvailableSizes}
                        formatPriceDisplay={formatPriceDisplay}
                      />
                    ))}
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
                          <Plus className="w-4 h-4" /> New Add-on
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Add-ons are managed separately from regular products
                      </p>
                    </div>
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
                      <CartItem
                        key={`${item.product._id}-${item.size}-${item.subcategory
                          }-${item.addons
                            ?.map((a) => `${a.value}-${a.quantity}`)
                            .join(",")}`}
                        item={item}
                        index={idx}
                        updateQuantity={updateCartQuantity}
                        removeFromCart={(item) =>
                          confirmRemoveFromCart(item, item.product.productName)
                        }
                        openEditAddons={openEditAddons}
                        handleSizeChange={handleSizeChange}
                        handleSubcategoryChange={handleSubcategoryChange}
                        incrementAddonQty={incrementAddonQty}
                        decrementAddonQty={decrementAddonQty}
                        confirmRemoveAddon={confirmRemoveAddon}
                        formatPriceDisplay={formatPriceDisplay}
                        addons={addons}
                        handleManualQuantityInput={handleManualQuantityInput}
                      />
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
                      onChange={(e) => {
                        setModeOfPayment(e.target.value);
                        if (e.target.value === "Cash") {
                          setReferenceNumber("");
                        }
                      }}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                    </select>
                  </div>

                  {modeOfPayment !== "Cash" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Number{" "}
                        {modeOfPayment === "GCash" ? "(13 digits)" : ""}
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => {
                          if (modeOfPayment === "GCash") {
                            const numbersOnly = e.target.value.replace(
                              /\D/g,
                              ""
                            );
                            if (numbersOnly.length <= 13)
                              setReferenceNumber(numbersOnly);
                          } else setReferenceNumber(e.target.value);
                        }}
                        placeholder={
                          modeOfPayment === "GCash"
                            ? "Enter 13-digit reference"
                            : "Enter reference number"
                        }
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                        required={modeOfPayment !== "Cash"}
                        maxLength={modeOfPayment === "GCash" ? 13 : undefined}
                      />
                      {modeOfPayment === "GCash" &&
                        referenceNumber.length > 0 &&
                        referenceNumber.length !== 13 && (
                          <p className="text-red-500 text-xs mt-1">
                            GCash reference number must be exactly 13 digits
                          </p>
                        )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cash Received
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={cashReceived}
                            onChange={(e) => {
                              const value = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              setCashReceived(
                                value > 0 ? value.toString() : ""
                              );
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full border-2 border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-[#E89271] transition-colors"
                          />
                        </div>
                        {parseFloat(cashReceived) > 0 &&
                          parseFloat(cashReceived) < total && (
                            <p className="text-red-500 text-xs mt-1">
                              Insufficient cash. Total: ₱{total.toFixed(2)}
                            </p>
                          )}
                      </div>

                      {parseFloat(cashReceived) > 0 &&
                        parseFloat(cashReceived) >= total && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-green-800 font-medium">
                                Change:
                              </span>
                              <span className="text-green-800 font-bold text-lg">
                                ₱{change.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={
                    loading ||
                    cart.length === 0 ||
                    cart.some((item) => item.price === null) ||
                    (modeOfPayment === "GCash" &&
                      referenceNumber.length !== 13) ||
                    (modeOfPayment === "Cash" &&
                      (cashReceived === "" || parseFloat(cashReceived) < total))
                  }
                  className="w-full bg-gradient-to-r from-[#E89271] to-[#d67a5c] text-white py-3 rounded-xl hover:from-[#d67a5c] hover:to-[#c4633d] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {transactionLoading
                    ? "Processing..."
                    : "Complete Transaction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default React.memo(POS);