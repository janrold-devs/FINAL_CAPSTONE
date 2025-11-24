// backend/controllers/dashboard.controller.js
import Transaction from "../models/Transaction.js";
import Sales from "../models/Sales.js";
import StockIn from "../models/StockIn.js";
import Spoilage from "../models/Spoilage.js";
import Product from "../models/Product.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // --- UNIVERSAL HELPERS ---

    const countDocuments = async (Model, field, start, end = new Date()) =>
      await Model.countDocuments({ [field]: { $gte: start, $lte: end } });

    const sumSales = async (start) => {
      const result = await Sales.aggregate([
        { $match: { transactionDate: { $gte: start, $lte: new Date() } } },
        { $group: { _id: null, total: { $sum: "$totalSales" } } },
      ]);
      return result.length ? result[0].total : 0;
    };

    const countSpoilageItems = async (start) => {
      const data = await Spoilage.aggregate([
        { $match: { createdAt: { $gte: start, $lte: new Date() } } },
        { $unwind: "$ingredients" },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]);
      return data.length ? data[0].total : 0;
    };

    // --- DAILY / WEEKLY / MONTHLY METRICS ---

    const [
      dailyTransactions,
      weeklyTransactions,
      monthlyTransactions,

      dailyStockIns,
      weeklyStockIns,
      monthlyStockIns,

      dailySpoilage,
      weeklySpoilage,
      monthlySpoilage,

      dailySalesAmount,
      weeklySalesAmount,
      monthlySalesAmount,
    ] = await Promise.all([
      // TRANSACTIONS
      countDocuments(Transaction, "transactionDate", today),
      countDocuments(Transaction, "transactionDate", startOfWeek),
      countDocuments(Transaction, "transactionDate", startOfMonth),

      // STOCK INS
      countDocuments(StockIn, "date", today),
      countDocuments(StockIn, "date", startOfWeek),
      countDocuments(StockIn, "date", startOfMonth),

      // SPOILAGE
      countSpoilageItems(today),
      countSpoilageItems(startOfWeek),
      countSpoilageItems(startOfMonth),

      // SALES
      sumSales(today),
      sumSales(startOfWeek),
      sumSales(startOfMonth),
    ]);

    // --- SALES GRAPH (YOUR ORIGINAL LOGIC KEPT) ---

    const dailySales = await Sales.aggregate([
      { $match: { transactionDate: { $gte: startOfMonth, $lte: new Date() } } },
      {
        $project: {
          totalSales: 1,
          day: { $dayOfMonth: "$transactionDate" },
          month: { $month: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: "$day",
          amount: { $sum: "$totalSales" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedDailySales = dailySales.map((item) => ({
      day: item._id,
      amount: item.amount,
    }));

    const weeklySales = [{ week: "Week 1", amount: weeklySalesAmount }];

    const monthlySales = [{ month: "This Month", amount: monthlySalesAmount }];

    // --- BEST SELLING PRODUCTS (YOUR ORIGINAL LOGIC KEPT) ---

    const bestSellingByCategory = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startOfMonth, $lte: new Date() },
        },
      },
      { $unwind: "$itemsSold" },
      {
        $group: {
          _id: "$itemsSold.product",
          totalUnits: { $sum: "$itemsSold.quantity" },
        },
      },
      { $sort: { totalUnits: -1 } },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          name: "$productInfo.productName",
          category: "$productInfo.category",
          units: "$totalUnits",
        },
      },
    ]);

    const categories = {
      coffee: [],
      milktea: [],
      frappe: [],
      choco: [],
      fruitTea: [],
    };

    // In dashboard.controller.js - UPDATE THIS SECTION:
    bestSellingByCategory.forEach((item) => {
      const cat = item.category.toLowerCase();

      // Match your actual product categories
      if (cat.includes("latte") || cat.includes("coffee")) {
        categories.coffee.push(item);
      } else if (cat.includes("bubble") || cat.includes("milk")) {
        categories.milktea.push(item);
      } else if (cat.includes("frappe")) {
        categories.frappe.push(item);
      } else if (cat.includes("choco")) {
        categories.choco.push(item);
      } else if (cat.includes("fruit")) {
        categories.fruitTea.push(item);
      } else {
        // Default category for uncategorized products
        console.log(
          "Uncategorized product:",
          item.name,
          "Category:",
          item.category
        );
        categories.fruitTea.push(item); // or categories.coffee.push(item) depending on your preference
      }
    });

    // --- FINAL RESPONSE (THE PART YOUR FRONTEND NEEDS) ---

    res.json({
      stats: {
        transactions: { count: dailyTransactions },
        sales: { amount: dailySalesAmount },
        stockIns: { count: dailyStockIns },
        spoilage: { count: dailySpoilage },
      },

      // Daily / Weekly / Monthly arrays (frontend uses .length)
      dailyTransactions: Array(dailyTransactions).fill({}),
      weeklyTransactions: Array(weeklyTransactions).fill({}),
      monthlyTransactions: Array(monthlyTransactions).fill({}),

      dailyStockIns: Array(dailyStockIns).fill({}),
      weeklyStockIns: Array(weeklyStockIns).fill({}),
      monthlyStockIns: Array(monthlyStockIns).fill({}),

      dailySpoilage: Array(dailySpoilage).fill({}),
      weeklySpoilage: Array(weeklySpoilage).fill({}),
      monthlySpoilage: Array(monthlySpoilage).fill({}),

      dailySales: formattedDailySales,
      weeklySales,
      monthlySales,

      bestSelling: categories,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};
