// backend/controllers/transaction.controller.js
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";
import Ingredient from "../models/Ingredient.js";
import Sales from "../models/Sales.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// NEW: Stock validation before transaction
export const checkStockAvailability = async (req, res) => {
  try {
    const { itemsSold } = req.body;
    const outOfStock = [];

    for (const item of itemsSold) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient"
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // Calculate required quantity
        const requiredQuantity = recipe.quantity * item.quantity;
        
        // Check if enough stock
        if (ingredient.quantity < requiredQuantity) {
          outOfStock.push({
            productName: product.productName,
            ingredientName: ingredient.name,
            requiredQuantity,
            availableQuantity: ingredient.quantity
          });
        }
      }
    }

    res.json({
      hasEnoughStock: outOfStock.length === 0,
      outOfStock
    });
  } catch (err) {
    console.error("Stock check error:", err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATED: CREATE Transaction with stock validation
export const createTransaction = async (req, res) => {
  try {
    const { cashier, itemsSold, modeOfPayment, referenceNumber } = req.body;

    // Check stock availability first
    const outOfStock = [];
    for (const item of itemsSold) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient"
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        const requiredQuantity = recipe.quantity * item.quantity;
        if (ingredient.quantity < requiredQuantity) {
          outOfStock.push({
            productName: product.productName,
            ingredientName: ingredient.name,
            requiredQuantity,
            availableQuantity: ingredient.quantity
          });
        }
      }
    }

    // If any ingredient is out of stock, reject transaction
    if (outOfStock.length > 0) {
      let errorMessage = "Not enough ingredients in stock:\n";
      outOfStock.forEach(item => {
        errorMessage += `• ${item.ingredientName}: Need ${item.requiredQuantity}, but only ${item.availableQuantity} available\n`;
      });
      return res.status(400).json({ message: errorMessage });
    }

    // compute per-item totalCost if not provided
    const items = itemsSold.map((i) => {
      const totalCost = i.totalCost ?? i.price * i.quantity;
      return { ...i, totalCost };
    });

    // compute grand total
    const totalAmount = items.reduce((s, it) => s + (it.totalCost || 0), 0);

    const transaction = await Transaction.create({
      transactionDate: req.body.transactionDate || Date.now(),
      cashier,
      itemsSold: items,
      modeOfPayment,
      referenceNumber,
      totalAmount,
    });

    // Deduct ingredients from inventory (now safe since we checked stock)
    for (const item of items) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient"
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // how much to deduct = recipe.quantity * items sold
        const deductQty = recipe.quantity * item.quantity;
        ingredient.quantity = Math.max(0, ingredient.quantity - deductQty);
        await ingredient.save();
        
        console.log(`Deducted ${deductQty} ${ingredient.unit || 'units'} of ${ingredient.name}. Remaining: ${ingredient.quantity}`);
      }
    }

    // Create or update Sales batch for today
    const transDate = transaction.transactionDate;
    const year = transDate.getFullYear();
    const month = String(transDate.getMonth() + 1).padStart(2, "0");
    const day = String(transDate.getDate()).padStart(2, "0");
    const batchNumber = `BATCH-${year}-${month}-${day}`;

    // Set to start of day in local timezone
    const startOfDay = new Date(year, transDate.getMonth(), transDate.getDate(), 0, 0, 0, 0);

    let salesBatch = await Sales.findOne({ batchNumber });

    if (salesBatch) {
      // Update existing batch
      salesBatch.transactions.push(transaction._id);
      salesBatch.totalSales += totalAmount;
      await salesBatch.save();
      console.log(`Updated sales batch ${batchNumber}: +₱${totalAmount}, new total: ₱${salesBatch.totalSales}`);
    } else {
      // Create new daily batch
      salesBatch = await Sales.create({
        batchNumber,
        transactions: [transaction._id],
        totalSales: totalAmount,
        transactionDate: startOfDay,
      });
      console.log(`Created new sales batch ${batchNumber}: ₱${totalAmount}`);
    }

    // log activity
    await logActivity(
      req,
      "CREATE_TRANSACTION",
      `Transaction recorded by cashier: ${cashier}. Total: ₱${totalAmount}. Added to ${batchNumber}.`
    );

    res.status(201).json(transaction);
  } catch (err) {
    console.error("Transaction creation error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET all Transactions
export const getTransactions = async (req, res) => {
  try {
    const list = await Transaction.find()
      .populate("cashier", "-password")
      .populate("itemsSold.product")
      .sort({ transactionDate: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single Transaction
export const getTransaction = async (req, res) => {
  try {
    const doc = await Transaction.findById(req.params.id)
      .populate("cashier", "-password")
      .populate("itemsSold.product");

    if (!doc) return res.status(404).json({ message: "Transaction not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE Transaction
export const deleteTransaction = async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Transaction not found" });

    // Remove from sales batch and update total
    const transDate = deleted.transactionDate;
    const year = transDate.getFullYear();
    const month = String(transDate.getMonth() + 1).padStart(2, "0");
    const day = String(transDate.getDate()).padStart(2, "0");
    const batchNumber = `BATCH-${year}-${month}-${day}`;

    const salesBatch = await Sales.findOne({ batchNumber });
    if (salesBatch) {
      salesBatch.transactions = salesBatch.transactions.filter(
        t => t.toString() !== req.params.id
      );
      salesBatch.totalSales -= deleted.totalAmount;
      
      if (salesBatch.transactions.length === 0) {
        // Delete batch if no transactions left
        await Sales.findByIdAndDelete(salesBatch._id);
        console.log(`Deleted empty sales batch ${batchNumber}`);
      } else {
        await salesBatch.save();
        console.log(`Updated sales batch ${batchNumber}: -₱${deleted.totalAmount}, new total: ₱${salesBatch.totalSales}`);
      }
    }

    // Restore ingredients to inventory
    for (const item of deleted.itemsSold) {
      const product = await Product.findById(item.product).populate(
        "ingredients.ingredient"
      );
      if (!product) continue;

      for (const recipe of product.ingredients) {
        const ingredient = await Ingredient.findById(recipe.ingredient._id);
        if (!ingredient) continue;

        // Restore the deducted quantity
        const restoreQty = recipe.quantity * item.quantity;
        ingredient.quantity += restoreQty;
        await ingredient.save();
        
        console.log(`Restored ${restoreQty} ${ingredient.unit || 'units'} of ${ingredient.name}. New quantity: ${ingredient.quantity}`);
      }
    }

    // log activity
    await logActivity(
      req,
      "DELETE_TRANSACTION",
      `Transaction deleted. Total: ₱${deleted.totalAmount}. Removed from ${batchNumber}. Ingredients restored to inventory.`
    );

    res.json({ message: "Transaction removed and ingredients restored" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};