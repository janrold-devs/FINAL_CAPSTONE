// backend/controllers/transaction.controller.js
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";
import Ingredient from "../models/Ingredient.js";
import Sales from "../models/Sales.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// Helper function to determine if an ingredient should be deducted based on selected size
const shouldDeductIngredient = (ingredientName, selectedSize) => {
  if (!ingredientName) return true;

  const ingredientNameUpper = ingredientName.toUpperCase();

  // Check if this is a cup ingredient
  if (ingredientNameUpper.includes("CUP")) {
    // Extract size number from ingredient name (e.g., "16" from "PLASTIC CUPS (16 OZ)")
    const sizeMatch = ingredientNameUpper.match(/\((\d+)\s*OZ\)/);

    if (sizeMatch) {
      const cupSize = parseInt(sizeMatch[1], 10);
      // Only deduct if the cup size matches the selected size
      return cupSize === selectedSize;
    }
  }

  // For non-cup ingredients, always deduct
  return true;
};

const updateSalesBatchCalculation = async (salesBatch) => {
  try {
    const transactions = await Transaction.find({
      _id: { $in: salesBatch.transactions },
    });

    const recalculatedTotal = transactions.reduce((sum, t) => {
      return sum + (t.totalAmount || 0);
    }, 0);

    salesBatch.totalSales = recalculatedTotal;
    salesBatch.calculatedTotal = recalculatedTotal;
    salesBatch.lastRecalculated = new Date();
    await salesBatch.save();
  } catch (error) {
    console.error("Error updating sales batch calculation:", error);
  }
};

// Stock validation before transaction
export const checkStockAvailability = async (req, res) => {
  try {
    const { itemsSold } = req.body;
    const outOfStock = [];

    for (const item of itemsSold) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient",
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // Skip this ingredient if it doesn't match the selected size
        if (!shouldDeductIngredient(ingredient.name, item.size)) {
          continue;
        }

        const requiredQuantity = recipe.quantity * item.quantity;
        if (ingredient.quantity < requiredQuantity) {
          outOfStock.push({
            productName: product.productName,
            ingredientName: ingredient.name,
            requiredQuantity,
            availableQuantity: ingredient.quantity,
          });
        }
      }

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          const addonProduct = await Product.findById(addon.addonId).populate(
            "ingredients.ingredient",
          );
          if (!addonProduct) continue;

          for (const addonRecipe of addonProduct.ingredients) {
            if (!addonRecipe.ingredient) continue;

            const addonIngredient = await Ingredient.findById(
              addonRecipe.ingredient._id,
            );
            if (!addonIngredient) continue;

            // Skip this addon ingredient if it doesn't match the selected size
            if (!shouldDeductIngredient(addonIngredient.name, item.size)) {
              continue;
            }

            const addonRequiredQuantity =
              addonRecipe.quantity * addon.quantity * item.quantity;
            if (addonIngredient.quantity < addonRequiredQuantity) {
              outOfStock.push({
                productName: `${product.productName} + ${addonProduct.productName}`,
                ingredientName: addonIngredient.name,
                requiredQuantity: addonRequiredQuantity,
                availableQuantity: addonIngredient.quantity,
              });
            }
          }
        }
      }
    }

    res.json({
      hasEnoughStock: outOfStock.length === 0,
      outOfStock,
    });
  } catch (err) {
    console.error("Stock check error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Optimized transaction creation
export const createTransaction = async (req, res) => {
  try {
    const { cashier, itemsSold, modeOfPayment, referenceNumber } = req.body;

    // Validate required fields
    if (!cashier) {
      return res.status(400).json({ message: "Cashier is required" });
    }

    if (!itemsSold || !Array.isArray(itemsSold) || itemsSold.length === 0) {
      return res.status(400).json({ message: "Items sold are required" });
    }

    // Create items with snapshots in parallel
    const itemsWithSnapshots = await Promise.all(
      itemsSold.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        // Create snapshot for main product
        const productSnapshot = {
          productName: product.productName,
          category: product.category,
          size: item.size,
          price: item.price,
          basePrice:
            product.sizes?.find((s) => s.size === item.size)?.price ||
            product.price ||
            0,
          image: product.image,
          addons: [],
        };

        // Process addons if any
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            const addonProduct = await Product.findById(addon.addonId);
            if (addonProduct) {
              productSnapshot.addons.push({
                addonId: addon.addonId,
                addonName: addonProduct.productName,
                price: addon.price,
                quantity: addon.quantity,
              });
            } else {
              productSnapshot.addons.push({
                addonId: addon.addonId,
                addonName: "Unknown Add-on",
                price: addon.price || 0,
                quantity: addon.quantity || 1,
              });
            }
          }
        }

        // Build transaction item
        const transactionItem = {
          product: item.product,
          category: item.category,
          size: item.size,
          subcategory: item.subcategory,
          price: item.price,
          quantity: item.quantity,
          totalCost: item.totalCost || item.price * item.quantity,
          snapshot: productSnapshot,
        };

        // Add addons to transaction item
        if (item.addons && item.addons.length > 0) {
          transactionItem.addons = await Promise.all(
            item.addons.map(async (addon) => {
              const addonProduct = await Product.findById(addon.addonId);
              return {
                addonId: addon.addonId,
                addonName: addonProduct?.productName || "Unknown Add-on",
                quantity: addon.quantity || 1,
                price: addon.price || addonProduct?.sizes?.[0]?.price || 0,
              };
            }),
          );
        }

        return transactionItem;
      }),
    );

    // Check stock availability
    const outOfStock = [];
    for (const item of itemsWithSnapshots) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient",
      );
      if (!product) continue;

      // Check main product ingredients
      for (const recipe of product.ingredients) {
        if (!recipe.ingredient) continue;

        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // Skip this ingredient if it doesn't match the selected size
        if (!shouldDeductIngredient(ingredient.name, item.size)) {
          continue;
        }

        const requiredQuantity = recipe.quantity * item.quantity;
        if (ingredient.quantity < requiredQuantity) {
          outOfStock.push({
            productName: product.productName,
            ingredientName: ingredient.name,
            requiredQuantity,
            availableQuantity: ingredient.quantity,
          });
        }
      }

      // Check add-ons ingredients
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          const addonProduct = await Product.findById(addon.addonId).populate(
            "ingredients.ingredient",
          );
          if (!addonProduct) continue;

          for (const addonRecipe of addonProduct.ingredients) {
            if (!addonRecipe.ingredient) continue;

            const addonIngredient = await Ingredient.findById(
              addonRecipe.ingredient._id,
            );
            if (!addonIngredient) continue;

            // Skip this addon ingredient if it doesn't match the selected size
            if (!shouldDeductIngredient(addonIngredient.name, item.size)) {
              continue;
            }

            const addonRequiredQuantity =
              addonRecipe.quantity * addon.quantity * item.quantity;
            if (addonIngredient.quantity < addonRequiredQuantity) {
              outOfStock.push({
                productName: `${product.productName} + ${addonProduct.productName}`,
                ingredientName: addonIngredient.name,
                requiredQuantity: addonRequiredQuantity,
                availableQuantity: addonIngredient.quantity,
              });
            }
          }
        }
      }
    }

    // Reject if out of stock
    if (outOfStock.length > 0) {
      let errorMessage = "Not enough ingredients in stock:\n";
      outOfStock.forEach((item) => {
        errorMessage += `• ${item.productName}: ${item.ingredientName} - Need ${item.requiredQuantity}, but only ${item.availableQuantity} available\n`;
      });
      return res.status(400).json({ message: errorMessage });
    }

    // Compute grand total
    const totalAmount = itemsWithSnapshots.reduce(
      (s, it) => s + (it.totalCost || 0),
      0,
    );

    // Create transaction
    const transaction = await Transaction.create({
      transactionDate: req.body.transactionDate || Date.now(),
      cashier,
      itemsSold: itemsWithSnapshots,
      modeOfPayment,
      referenceNumber,
      totalAmount,
    });

    // Deduct ingredients in parallel
    await Promise.all(
      itemsWithSnapshots.map(async (item) => {
        const product = await Product.findById(item.product).populate(
          "ingredients.ingredient",
        );
        if (!product) return;

        // Deduct main product ingredients
        for (const recipe of product.ingredients) {
          if (!recipe.ingredient) continue;

          const ingredient = await Ingredient.findById(recipe.ingredient._id);
          if (!ingredient) continue;

          // Skip this ingredient if it doesn't match the selected size
          if (!shouldDeductIngredient(ingredient.name, item.size)) {
            continue;
          }

          const deductQty = recipe.quantity * item.quantity;
          ingredient.quantity = Math.max(0, ingredient.quantity - deductQty);
          await ingredient.save();
        }

        // Deduct add-ons ingredients
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            const addonProduct = await Product.findById(addon.addonId).populate(
              "ingredients.ingredient",
            );
            if (!addonProduct) continue;

            for (const addonRecipe of addonProduct.ingredients) {
              if (!addonRecipe.ingredient) continue;

              const addonIngredient = await Ingredient.findById(
                addonRecipe.ingredient._id,
              );
              if (!addonIngredient) continue;

              // Skip this addon ingredient if it doesn't match the selected size
              if (!shouldDeductIngredient(addonIngredient.name, item.size)) {
                continue;
              }

              const addonDeductQty =
                addonRecipe.quantity * addon.quantity * item.quantity;
              addonIngredient.quantity = Math.max(
                0,
                addonIngredient.quantity - addonDeductQty,
              );
              await addonIngredient.save();
            }
          }
        }
      }),
    );

    // In the createTransaction function, replace the sales batch section:

    // Create or update Sales batch - FIXED: Use proper calculation
    const transDate = transaction.transactionDate;
    const year = transDate.getFullYear();
    const month = String(transDate.getMonth() + 1).padStart(2, "0");
    const day = String(transDate.getDate()).padStart(2, "0");
    const batchNumber = `BATCH-${year}-${month}-${day}`;

    let salesBatch = await Sales.findOne({ batchNumber });

    if (salesBatch) {
      // Add transaction if not already included
      if (!salesBatch.transactions.includes(transaction._id)) {
        salesBatch.transactions.push(transaction._id);
      }

      // Recalculate total from ALL transactions in the batch
      const allTransactions = await Transaction.find({
        _id: { $in: salesBatch.transactions },
      });

      const recalculatedTotal = allTransactions.reduce((sum, t) => {
        return sum + (t.totalAmount || 0);
      }, 0);

      salesBatch.totalSales = recalculatedTotal;
      salesBatch.calculatedTotal = recalculatedTotal;
      salesBatch.lastRecalculated = new Date();
      await salesBatch.save();

      console.log(
        `✅ Updated sales batch ${batchNumber}: ₱${recalculatedTotal}`,
      );
    } else {
      salesBatch = await Sales.create({
        batchNumber,
        transactions: [transaction._id],
        totalSales: totalAmount,
        calculatedTotal: totalAmount,
        transactionDate: transDate,
        lastRecalculated: new Date(),
      });

      console.log(`✅ Created sales batch ${batchNumber}: ₱${totalAmount}`);
    }

    // Log activity
    await logActivity(
      req,
      "CREATE_TRANSACTION",
      `Transaction recorded by cashier: ${cashier}. Total: ₱${totalAmount}. Added to ${batchNumber}.`,
    );

    // Return populated transaction for receipt
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("cashier", "firstName lastName")
      .lean();

    res.status(201).json(populatedTransaction);
  } catch (err) {
    console.error("Transaction creation error:", err);

    if (err.name === "ValidationError") {
      const validationErrors = Object.values(err.errors).map(
        (error) => error.message,
      );
      return res.status(400).json({
        message: "Transaction validation failed",
        errors: validationErrors,
      });
    }

    res.status(500).json({ message: err.message });
  }
};

// GET all Transactions
export const getTransactions = async (req, res) => {
  try {
    const list = await Transaction.find()
      .populate("cashier", "-password")
      .populate("itemsSold.product")
      .populate("itemsSold.addons.addonId")
      .sort({ transactionDate: -1 });

    const transactionsWithSnapshots = list.map((transaction) => {
      const itemsWithSnapshotData = transaction.itemsSold.map((item) => {
        if (item.snapshot && item.snapshot.productName) {
          return {
            ...item.toObject(),
            product: {
              _id: item.product?._id || null,
              productName: item.snapshot.productName,
              category: item.snapshot.category,
              image: item.snapshot.image,
            },
            snapshot: item.snapshot,
          };
        }
        return item;
      });

      return {
        ...transaction.toObject(),
        itemsSold: itemsWithSnapshotData,
      };
    });

    res.json(transactionsWithSnapshots);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET single Transaction
export const getTransaction = async (req, res) => {
  try {
    const doc = await Transaction.findById(req.params.id)
      .populate("cashier", "-password")
      .populate("itemsSold.product")
      .populate("itemsSold.addons.addonId");

    if (!doc) return res.status(404).json({ message: "Transaction not found" });

    const itemsWithSnapshotData = doc.itemsSold.map((item) => {
      if (item.snapshot && item.snapshot.productName) {
        return {
          ...item.toObject(),
          product: {
            _id: item.product?._id || null,
            productName: item.snapshot.productName,
            category: item.snapshot.category,
            image: item.snapshot.image,
          },
          snapshot: item.snapshot,
        };
      }
      return item;
    });

    const transactionWithSnapshots = {
      ...doc.toObject(),
      itemsSold: itemsWithSnapshotData,
    };

    res.json(transactionWithSnapshots);
  } catch (err) {
    console.error("Error fetching transaction:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE Transaction
export const deleteTransaction = async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Transaction not found" });

    // Restore ingredients
    for (const item of deleted.itemsSold) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient",
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // Skip this ingredient if it doesn't match the selected size
        if (!shouldDeductIngredient(ingredient.name, item.size)) {
          continue;
        }

        const restoreQty = recipe.quantity * item.quantity;
        ingredient.quantity += restoreQty;
        await ingredient.save();
      }

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          const addonProduct = await Product.findById(addon.addonId).populate(
            "ingredients.ingredient",
          );
          if (!addonProduct) continue;

          for (const addonRecipe of addonProduct.ingredients) {
            const addonIngredient = await Ingredient.findById(
              addonRecipe.ingredient._id,
            );
            if (!addonIngredient) continue;

            // Skip this addon ingredient if it doesn't match the selected size
            if (!shouldDeductIngredient(addonIngredient.name, item.size)) {
              continue;
            }

            const addonRestoreQty =
              addonRecipe.quantity * addon.quantity * item.quantity;
            addonIngredient.quantity += addonRestoreQty;
            await addonIngredient.save();
          }
        }
      }
    }

    // Update sales batch - FIXED: Use proper recalculation
    const transDate = deleted.transactionDate;
    const year = transDate.getFullYear();
    const month = String(transDate.getMonth() + 1).padStart(2, "0");
    const day = String(transDate.getDate()).padStart(2, "0");
    const batchNumber = `BATCH-${year}-${month}-${day}`;

    const salesBatch = await Sales.findOne({ batchNumber });
    if (salesBatch) {
      // Remove the transaction
      salesBatch.transactions = salesBatch.transactions.filter(
        (t) => t.toString() !== req.params.id,
      );

      // Recalculate total from remaining transactions
      const remainingTransactions = await Transaction.find({
        _id: { $in: salesBatch.transactions },
      });

      const recalculatedTotal = remainingTransactions.reduce((sum, t) => {
        return sum + (t.totalAmount || 0);
      }, 0);

      salesBatch.totalSales = recalculatedTotal;
      salesBatch.calculatedTotal = recalculatedTotal;
      salesBatch.lastRecalculated = new Date();

      if (salesBatch.transactions.length === 0) {
        await Sales.findByIdAndDelete(salesBatch._id);
      } else {
        await salesBatch.save();
      }
    }

    await logActivity(
      req,
      "DELETE_TRANSACTION",
      `Transaction deleted. Total: ₱${deleted.totalAmount}. Removed from ${batchNumber}. Ingredients restored to inventory.`,
    );

    res.json({ message: "Transaction removed and ingredients restored" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ message: err.message });
  }
};
