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

    const sumSales = async (start, end = new Date()) => {
      const result = await Sales.aggregate([
        { $match: { transactionDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$totalSales" } } },
      ]);
      return result.length ? result[0].total : 0;
    };

    const countSpoilageItems = async (start, end = new Date()) => {
      const data = await Spoilage.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
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

    // --- SALES GRAPH - IMPROVED WITH HISTORICAL DATA ---

    // Daily Sales for current month (keep your existing logic)
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

    // Weekly Sales - Last 8 weeks
    const weeklySales = await Sales.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000), // 8 weeks ago
            $lte: new Date(),
          },
        },
      },
      {
        $project: {
          totalSales: 1,
          year: { $year: "$transactionDate" },
          week: { $week: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: { year: "$year", week: "$week" },
          amount: { $sum: "$totalSales" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      { $limit: 8 }, // Last 8 weeks
    ]);

    const formattedWeeklySales = weeklySales.map((item, index) => ({
      week: `Week ${item._id.week}`,
      amount: item.amount,
    }));

    // Monthly Sales - Last 6 months
    const monthlySales = await Sales.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1), // 6 months ago
            $lte: new Date(),
          },
        },
      },
      {
        $project: {
          totalSales: 1,
          year: { $year: "$transactionDate" },
          month: { $month: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          amount: { $sum: "$totalSales" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formattedMonthlySales = monthlySales.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      amount: item.amount,
    }));

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
      icedLatte: [],
      bubbleTea: [],
      frappe: [],
      choco: [],
      fruitTea: [],
      amerikano: [],
      hotDrink: [],
      shiro: [],
      nonCaffeine: [],
    };

    bestSellingByCategory.forEach((item) => {
      const cat = item.category.toLowerCase();

      if (cat.includes("latte")) {
        categories.icedLatte.push(item);
      } else if (cat.includes("bubble")) {
        categories.bubbleTea.push(item);
      } else if (cat.includes("frappe")) {
        categories.frappe.push(item);
      } else if (cat.includes("choco")) {
        categories.choco.push(item);
      } else if (cat.includes("fruit")) {
        categories.fruitTea.push(item);
      } else if (cat.includes("amerikano")) {
        categories.amerikano.push(item);
      } else if (cat.includes("hot")) {
        categories.hotDrink.push(item);
      } else if (cat.includes("shiro")) {
        categories.shiro.push(item);
      } else if (cat.includes("caffeine") || cat.includes("non")) {
        categories.nonCaffeine.push(item);
      } else {
        console.log(
          "Uncategorized product:",
          item.name,
          "Category:",
          item.category
        );
        categories.fruitTea.push(item);
      }
    });

    // --- FINAL RESPONSE ---

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

      // Updated sales data with historical information
      dailySales: formattedDailySales,
      weeklySales: formattedWeeklySales,
      monthlySales: formattedMonthlySales,

      bestSelling: categories,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};
