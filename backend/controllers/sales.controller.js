// backend/controllers/sales.controller.js
import Sales from "../models/Sales.js";
import Transaction from "../models/Transaction.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// CREATE Sales manually
export const createSales = async (req, res) => {
  try {
    const { batchNumber, transactions = [], totalSales } = req.body;

    const doc = await Sales.create({
      batchNumber,
      transactions,
      totalSales,
      transactionDate: req.body.transactionDate || Date.now(),
    });

    // log activity
    await logActivity(
      req,
      "CREATE_SALES",
      `Created sales batch ${doc.batchNumber} with total ₱${doc.totalSales}`
    );

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE Sales batch from transactions
export const createSalesFromTransactions = async (req, res) => {
  try {
    const { batchNumber, transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: "transactions array is required" });
    }

    const txs = await Transaction.find({ _id: { $in: transactions } });
    const totalSales = txs.reduce((s, t) => s + (t.totalAmount || 0), 0);

    const sales = await Sales.create({ batchNumber, transactions, totalSales });

    // log activity
    await logActivity(
      req,
      "CREATE_SALES",
      `Created sales batch ${sales.batchNumber} from ${transactions.length} transactions with total ₱${sales.totalSales}`
    );

    res.status(201).json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all Sales
export const getSales = async (req, res) => {
  try {
    const list = await Sales.find()
      .populate({ path: "transactions", populate: { path: "itemsSold.product" } })
      .sort({ transactionDate: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single Sales batch by ID
export const getSale = async (req, res) => {
  try {
    const doc = await Sales.findById(req.params.id).populate({
      path: "transactions",
      populate: { path: "itemsSold.product" },
    });

    if (!doc) return res.status(404).json({ message: "Sales batch not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET summarized sales data (from Sales collection)
export const getSalesSummary = async (req, res) => {
  try {
    // Query the Sales collection directly
    const salesBatches = await Sales.find()
      .select('batchNumber transactionDate totalSales transactions')
      .sort({ transactionDate: -1 })
      .lean();

    console.log("Sales batches from DB:", salesBatches);

    // Format for frontend
    const formatted = salesBatches.map((batch, index) => ({
      _id: batch._id,
      batchNumber: batch.batchNumber,
      transactionDate: batch.transactionDate,
      totalSales: batch.totalSales,
      transactionsCount: batch.transactions?.length || 0,
    }));

    console.log("Formatted summary:", formatted);
    res.json(formatted);
  } catch (err) {
    console.error("Sales summary error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET Sales batch by date string (YYYY-MM-DD)
export const getSalesByDate = async (req, res) => {
  try {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    console.log("Fetching sales for date:", date);

    // Find sales batch by batchNumber (which includes the date)
    let salesBatch = await Sales.findOne({ 
      batchNumber: { $regex: date } 
    })
    .populate({
      path: "transactions",
      populate: [
        { path: "cashier", select: "firstName lastName" },
        { path: "itemsSold.product" }
      ]
    });

    // If not found by batchNumber, try finding by date range
    if (!salesBatch) {
      const [year, month, day] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      salesBatch = await Sales.findOne({
        transactionDate: {
          $gte: startDate,
          $lte: endDate,
        }
      })
      .populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" }
        ]
      });
    }

    if (!salesBatch) {
      return res.status(404).json({ message: "No sales batch found for this date" });
    }

    console.log(`Found sales batch: ${salesBatch.batchNumber} with ${salesBatch.transactions.length} transactions`);
    console.log("Total sales:", salesBatch.totalSales);

    res.json(salesBatch);
  } catch (err) {
    console.error("Sales by date error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET Sales batch by batchNumber
export const getSalesByBatchNumber = async (req, res) => {
  try {
    const { batchNumber } = req.params;
    
    const salesBatch = await Sales.findOne({ batchNumber })
      .populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" }
        ]
      });

    if (!salesBatch) {
      return res.status(404).json({ message: "Sales batch not found" });
    }

    res.json(salesBatch);
  } catch (err) {
    console.error("Sales by batch number error:", err);
    res.status(500).json({ message: err.message });
  }
};