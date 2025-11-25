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
      return res
        .status(400)
        .json({ message: "transactions array is required" });
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
      .populate({
        path: "transactions",
        populate: { path: "itemsSold.product" },
      })
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

// Update getSalesSummary
export const getSalesSummary = async (req, res) => {
  try {
    // Get sales batches with proper transaction counting
    const salesBatches = await Sales.find()
      .populate("transactions")
      .select("batchNumber transactionDate totalSales transactions")
      .sort({ transactionDate: -1 })
      .lean();

    console.log("Raw sales batches:", salesBatches);

    // Format for frontend with accurate counts
    const formatted = salesBatches.map((batch) => {
      const transactionCount = Array.isArray(batch.transactions)
        ? batch.transactions.length
        : 0;

      // Recalculate total sales if needed
      const calculatedTotal = Array.isArray(batch.transactions)
        ? batch.transactions.reduce((sum, transaction) => {
            return sum + (transaction.totalAmount || 0);
          }, 0)
        : batch.totalSales || 0;

      return {
        _id: batch._id,
        batchNumber: batch.batchNumber,
        transactionDate: batch.transactionDate,
        totalSales: calculatedTotal,
        transactionsCount: transactionCount,
        transactions: batch.transactions || [],
      };
    });

    console.log("Formatted summary with recalculated totals:", formatted);
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
      batchNumber: { $regex: date },
    }).populate({
      path: "transactions",
      populate: [
        { path: "cashier", select: "firstName lastName" },
        { path: "itemsSold.product" },
      ],
    });

    // If not found by batchNumber, try finding by date range
    if (!salesBatch) {
      const [year, month, day] = date.split("-").map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      salesBatch = await Sales.findOne({
        transactionDate: {
          $gte: startDate,
          $lte: endDate,
        },
      }).populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" },
        ],
      });
    }

    if (!salesBatch) {
      return res
        .status(404)
        .json({ message: "No sales batch found for this date" });
    }

    console.log(
      `Found sales batch: ${salesBatch.batchNumber} with ${salesBatch.transactions.length} transactions`
    );
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

    const salesBatch = await Sales.findOne({ batchNumber }).populate({
      path: "transactions",
      populate: [
        { path: "cashier", select: "firstName lastName" },
        { path: "itemsSold.product" },
      ],
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
// ADD this function to generate missing sales batches
export const generateSalesFromTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Find transactions in date range
    const transactions = await Transaction.find({
      transactionDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    console.log(
      `Found ${transactions.length} transactions from ${startDate} to ${endDate}`
    );

    // Group transactions by date
    const transactionsByDate = {};
    transactions.forEach((transaction) => {
      const dateStr = new Date(transaction.transactionDate)
        .toISOString()
        .split("T")[0];
      if (!transactionsByDate[dateStr]) {
        transactionsByDate[dateStr] = [];
      }
      transactionsByDate[dateStr].push(transaction);
    });

    // Create sales batches for each date
    const salesBatches = [];
    for (const [date, dateTransactions] of Object.entries(transactionsByDate)) {
      const totalSales = dateTransactions.reduce(
        (sum, t) => sum + (t.totalAmount || 0),
        0
      );
      const batchNumber = `BATCH-${date}`;

      // Check if sales batch already exists
      const existingBatch = await Sales.findOne({ batchNumber });
      if (existingBatch) {
        console.log(`Sales batch ${batchNumber} already exists, skipping`);
        salesBatches.push(existingBatch);
        continue;
      }

      const salesBatch = await Sales.create({
        batchNumber,
        transactions: dateTransactions.map((t) => t._id),
        totalSales,
        transactionDate: new Date(date),
      });

      console.log(
        `Created sales batch ${batchNumber} with ${dateTransactions.length} transactions, total: ₱${totalSales}`
      );
      salesBatches.push(salesBatch);
    }

    res.json({
      message: `Created ${salesBatches.length} sales batches`,
      salesBatches,
    });
  } catch (err) {
    console.error("Generate sales error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET best selling products
// FIXED: GET best selling products
export const getBestSellingProducts = async (req, res) => {
  try {
    const { period = "monthly", year, month } = req.query;

    // Calculate date range based on period
    let startDate, endDate;
    const now = new Date();

    if (period === "monthly") {
      const targetYear = parseInt(year) || now.getFullYear();
      const targetMonth = parseInt(month) || now.getMonth() + 1;

      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    } else if (period === "weekly") {
      const currentDay = now.getDay();
      const currentMonday = new Date(now);
      currentMonday.setDate(
        now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
      );
      startDate = new Date(currentMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(currentMonday);
      endDate.setDate(currentMonday.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // daily
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(
      `Fetching best selling products from ${startDate} to ${endDate}`
    );

    // Find sales batches in the date range
    const salesBatches = await Sales.find({
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).populate({
      path: "transactions",
      populate: {
        path: "itemsSold.product",
        model: "Product",
      },
    });

    // Aggregate product sales data
    const productSales = {};

    salesBatches.forEach((batch) => {
      batch.transactions.forEach((transaction) => {
        if (transaction.itemsSold && Array.isArray(transaction.itemsSold)) {
          transaction.itemsSold.forEach((item) => {
            if (item.product && item.product._id) {
              const productId = item.product._id.toString();

              if (!productSales[productId]) {
                productSales[productId] = {
                  product: item.product,
                  totalUnits: 0,
                  totalAmount: 0,
                };
              }

              productSales[productId].totalUnits += item.quantity || 0;
              productSales[productId].totalAmount +=
                (item.price || 0) * (item.quantity || 0);
            }
          });
        }
      });
    });

    // FIXED: Convert to array and sort by total units sold - use productName instead of name
    const bestSellingProducts = Object.values(productSales)
      .map((item) => ({
        _id: item.product._id,
        productName: item.product.productName, // CHANGED FROM name TO productName
        category: item.product.category,
        size: item.product.size,
        price: item.product.price,
        unitsSold: item.totalUnits,
        totalAmount: item.totalAmount,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold);

    console.log(`Found ${bestSellingProducts.length} products with sales data`);

    res.json({
      period,
      startDate,
      endDate,
      products: bestSellingProducts,
    });
  } catch (err) {
    console.error("Best selling products error:", err);
    res.status(500).json({ message: err.message });
  }
};
