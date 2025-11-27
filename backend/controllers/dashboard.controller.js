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

    // Weekly Sales - FIXED: Use same calculation as weekly stat card but for multiple weeks
    const getWeekRanges = () => {
      const ranges = [];
      const today = new Date();

      // Get current week and previous 3 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        // Calculate Monday of the week (weeks ago)
        const daysSinceMonday = (today.getDay() + 6) % 7;
        weekStart.setDate(today.getDate() - daysSinceMonday - i * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        ranges.push({
          start: new Date(weekStart),
          end: new Date(weekEnd),
          label: formatWeekLabel(weekStart, weekEnd),
        });
      }

      return ranges;
    };

    const formatWeekLabel = (start, end) => {
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
      const startMonth = monthNames[start.getMonth()];
      const endMonth = monthNames[end.getMonth()];

      if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${start.getDate()}-${end.getDate()}`;
      } else {
        return `${startMonth} ${start.getDate()}-${endMonth} ${end.getDate()}`;
      }
    };

    const weekRanges = getWeekRanges();
    console.log("=== WEEK RANGES ===");
    weekRanges.forEach((range, index) => {
      console.log(
        `Week ${index + 1}:`,
        range.label,
        range.start.toISOString(),
        "to",
        range.end.toISOString()
      );
    });

    // Get sales data for each week using the same sumSales function as stat cards
    const weeklySalesPromises = weekRanges.map(async (range) => {
      try {
        const amount = await sumSales(range.start, range.end);
        return {
          week: range.label,
          amount: amount,
        };
      } catch (error) {
        console.error(`Error fetching week ${range.label}:`, error);
        return {
          week: range.label,
          amount: 0,
        };
      }
    });

    const weeklySalesResults = await Promise.all(weeklySalesPromises);
    const finalWeeklySales = weeklySalesResults.filter((item) => item !== null);

    console.log("=== WEEKLY SALES RESULTS ===");
    console.log(finalWeeklySales);

    // IMPORTANT: Ensure current week in chart matches weeklySalesAmount from stat card
    // Find the current week in our results and update it to match the stat card value
    const currentWeekLabel = formatWeekLabel(startOfWeek, endOfWeek);
    const updatedWeeklySales = finalWeeklySales.map((week) => {
      if (week.week === currentWeekLabel) {
        console.log(
          `Updating current week ${currentWeekLabel} from ${week.amount} to ${weeklySalesAmount}`
        );
        return {
          ...week,
          amount: weeklySalesAmount, // Use the exact same value as the stat card
        };
      }
      return week;
    });

    console.log("=== UPDATED WEEKLY SALES (MATCHING STAT CARD) ===");
    console.log(updatedWeeklySales);

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
      weeklySales: updatedWeeklySales, // Use the updated version that matches stat card
      monthlySales: formattedMonthlySales,

      bestSelling: categories,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};
