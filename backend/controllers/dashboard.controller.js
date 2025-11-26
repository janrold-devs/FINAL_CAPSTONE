// backend/controllers/dashboard.controller.js
import Transaction from "../models/Transaction.js";
import StockIn from "../models/StockIn.js";
import Spoilage from "../models/Spoilage.js";
import Product from "../models/Product.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    // DAILY - Use local time (since transactions are likely stored in local time)
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    // WEEKLY & MONTHLY - Use local time for consistency
    // WEEK (Monday → Sunday)
    const day = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // MONTH
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    console.log("=== DATE RANGES ===");
    console.log(
      "Today:",
      startOfToday.toISOString(),
      "to",
      endOfToday.toISOString()
    );
    console.log(
      "Week:",
      startOfWeek.toISOString(),
      "to",
      endOfWeek.toISOString()
    );
    console.log(
      "Month:",
      startOfMonth.toISOString(),
      "to",
      endOfMonth.toISOString()
    );

    // COUNT HELPERS
    const countTransactions = async (start, end) => {
      const count = await Transaction.countDocuments({
        transactionDate: { $gte: start, $lte: end },
      });
      console.log(`Transactions in range: ${count}`);
      return count;
    };

    const sumSales = async (start, end) => {
      const result = await Transaction.aggregate([
        { $match: { transactionDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]);
      return result?.[0]?.total || 0;
    };

    const countStockIns = async (start, end) =>
      await StockIn.countDocuments({ date: { $gte: start, $lte: end } });

    const countSpoilage = async (start, end) =>
      await Spoilage.countDocuments({ createdAt: { $gte: start, $lte: end } });

    // --- REAL COUNTS ---
    const [
      // DAILY
      dailyTransactions,
      dailySalesAmount,
      dailyStockIns,
      dailySpoilage,

      // WEEKLY
      weeklyTransactions,
      weeklySalesAmount,
      weeklyStockIns,
      weeklySpoilage,

      // MONTHLY
      monthlyTransactions,
      monthlySalesAmount,
      monthlyStockIns,
      monthlySpoilage,
    ] = await Promise.all([
      // DAILY
      countTransactions(startOfToday, endOfToday),
      sumSales(startOfToday, endOfToday),
      countStockIns(startOfToday, endOfToday),
      countSpoilage(startOfToday, endOfToday),

      // WEEKLY
      countTransactions(startOfWeek, endOfWeek),
      sumSales(startOfWeek, endOfWeek),
      countStockIns(startOfWeek, endOfWeek),
      countSpoilage(startOfWeek, endOfWeek),

      // MONTHLY
      countTransactions(startOfMonth, endOfMonth),
      sumSales(startOfMonth, endOfMonth),
      countStockIns(startOfMonth, endOfMonth),
      countSpoilage(startOfMonth, endOfMonth),
    ]);

    console.log("=== REAL RESULTS ===");
    console.log("Daily Transactions:", dailyTransactions);
    console.log("Daily Sales:", dailySalesAmount);
    console.log("Weekly Transactions:", weeklyTransactions);
    console.log("Weekly Sales:", weeklySalesAmount);
    console.log("Monthly Transactions:", monthlyTransactions);
    console.log("Monthly Sales:", monthlySalesAmount);

    // --- SALES GRAPH DATA - MUST MATCH STAT CARD CALCULATIONS ---

    // Daily Sales for current month - use same date range as monthly stat card
    const dailySalesData = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $project: {
          totalAmount: 1,
          day: { $dayOfMonth: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: "$day",
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedDailySales = dailySalesData.map((item) => ({
      day: item._id,
      amount: item.amount,
    }));

    // Weekly Sales - use same date range as weekly stat card (current week)
    const weeklySalesData = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $project: {
          totalAmount: 1,
          // Group by day of week for current week
          dayOfWeek: { $dayOfWeek: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Convert day numbers to day names for current week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formattedWeeklySales = weeklySalesData.map((item) => ({
      week: dayNames[item._id - 1] || `Day ${item._id}`,
      amount: item.amount,
    }));

    // If no weekly data, create empty array with current week days
    if (formattedWeeklySales.length === 0) {
      const currentDate = new Date(startOfWeek);
      for (let i = 0; i < 7; i++) {
        formattedWeeklySales.push({
          week: dayNames[currentDate.getDay()],
          amount: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Monthly Sales - last 6 months (this should match your expected monthly totals)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const monthlySalesData = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: sixMonthsAgo, $lte: new Date() },
        },
      },
      {
        $project: {
          totalAmount: 1,
          year: { $year: "$transactionDate" },
          month: { $month: "$transactionDate" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          amount: { $sum: "$totalAmount" },
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

    const formattedMonthlySales = monthlySalesData.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      amount: item.amount,
    }));

    // --- BEST SELLING PRODUCTS ---
    const bestSellingByCategory = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
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
        categories.fruitTea.push(item);
      }
    });

    // --- FINAL RESPONSE WITH REAL NUMBERS ---
    res.json({
      stats: {
        transactions: {
          daily: dailyTransactions,
          weekly: weeklyTransactions,
          monthly: monthlyTransactions,
        },
        sales: {
          daily: dailySalesAmount,
          weekly: weeklySalesAmount,
          monthly: monthlySalesAmount,
        },
        stockIns: {
          daily: dailyStockIns,
          weekly: weeklyStockIns,
          monthly: monthlyStockIns,
        },
        spoilage: {
          daily: dailySpoilage,
          weekly: weeklySpoilage,
          monthly: monthlySpoilage,
        },
      },

      // Chart data - now aligned with stat card calculations
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
