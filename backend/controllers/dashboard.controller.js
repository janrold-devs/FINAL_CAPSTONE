// backend/controllers/dashboard.controller.js
import Transaction from "../models/Transaction.js";
import StockIn from "../models/StockIn.js";
import Spoilage from "../models/Spoilage.js";
import Product from "../models/Product.js";

// Helper function definitions at the top
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

const formatMonthLabel = (date) => {
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
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    console.log(
      `=== CURRENT DATE: ${currentYear}-${currentMonth + 1}-${currentDay} ===`
    );

    // DAILY - Use local time (since transactions are likely stored in local time)
    const startOfToday = new Date(
      currentYear,
      currentMonth,
      currentDay,
      0,
      0,
      0,
      0
    );
    const endOfToday = new Date(
      currentYear,
      currentMonth,
      currentDay,
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
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59,
      999
    );

    console.log("=== REAL-TIME DATE RANGES ===");
    console.log(
      "Today:",
      startOfToday.toLocaleString(),
      "to",
      endOfToday.toLocaleString()
    );
    console.log(
      "Week:",
      startOfWeek.toLocaleString(),
      "to",
      endOfWeek.toLocaleString()
    );
    console.log(
      "Month:",
      startOfMonth.toLocaleString(),
      "to",
      endOfMonth.toLocaleString()
    );

    // COUNT HELPERS - Use consistent methods for ALL periods
    const countTransactions = async (start, end) => {
      const transactions = await Transaction.find({
        transactionDate: { $gte: start, $lte: end },
      });
      return transactions.length;
    };

    const sumSales = async (start, end) => {
      const transactions = await Transaction.find({
        transactionDate: { $gte: start, $lte: end },
      });
      return transactions.reduce((sum, transaction) => {
        return sum + (transaction.totalAmount || 0);
      }, 0);
    };

    const countStockIns = async (start, end) => {
      const stockIns = await StockIn.find({ date: { $gte: start, $lte: end } });
      return stockIns.length;
    };

    const countSpoilage = async (start, end) => {
      const spoilages = await Spoilage.find({
        createdAt: { $gte: start, $lte: end },
      });
      return spoilages.length;
    };

    // Get ALL data using consistent methods
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

      // All transactions for this month (for chart)
      monthlyTransactionsForChart,
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

      // Get all transactions for this month for accurate chart data
      Transaction.find({
        transactionDate: { $gte: startOfMonth, $lte: endOfToday }, // Only up to today
      }),
    ]);

    console.log("=== CONSISTENT RESULTS ===");
    console.log("Daily Transactions:", dailyTransactions);
    console.log("Daily Sales:", dailySalesAmount);
    console.log("Weekly Transactions:", weeklyTransactions);
    console.log("Weekly Sales:", weeklySalesAmount);
    console.log("Monthly Transactions:", monthlyTransactions);
    console.log("Monthly Sales:", monthlySalesAmount);

    // --- SALES GRAPH DATA - Only show passed days and current day ---

    // Calculate daily sales manually from transactions for perfect accuracy
    const dailySalesMap = new Map();

    // Only initialize days that have passed (1 to currentDay)
    for (let day = 1; day <= currentDay; day++) {
      dailySalesMap.set(day, 0);
    }

    console.log(`=== INITIALIZED DAYS: 1 to ${currentDay} ===`);

    // Populate with actual transaction data
    monthlyTransactionsForChart.forEach((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      const transactionDay = transactionDate.getDate();

      // Only count transactions for days that have passed (including today)
      if (transactionDay <= currentDay) {
        const currentAmount = dailySalesMap.get(transactionDay) || 0;
        dailySalesMap.set(
          transactionDay,
          currentAmount + (transaction.totalAmount || 0)
        );
      }
    });

    // Convert to array format for chart - only show days 1 to currentDay
    const formattedDailySales = Array.from(dailySalesMap.entries())
      .map(([day, amount]) => ({
        day,
        amount,
      }))
      .sort((a, b) => a.day - b.day);

    console.log("=== DAILY SALES CHART DATA (Only passed days) ===");
    console.log(formattedDailySales);

    // Weekly Sales - Use consistent calculation
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

        // Only include weeks that have some overlap with current time period
        // (weeks that are either current or in the past)
        if (weekEnd <= today || weekStart <= today) {
          ranges.push({
            start: new Date(weekStart),
            end: new Date(weekEnd),
            label: formatWeekLabel(weekStart, weekEnd),
          });
        }
      }

      return ranges;
    };

    const weekRanges = getWeekRanges();
    console.log("=== WEEK RANGES (Only relevant weeks) ===");
    weekRanges.forEach((range, index) => {
      console.log(
        `Week ${index + 1}:`,
        range.label,
        range.start.toISOString(),
        "to",
        range.end.toISOString()
      );
    });

    // Get sales data for each week using the same consistent method
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

    // Monthly Sales - only show months up to current month
    const monthlyRanges = [];

    // Generate monthly ranges for the last 6 months, but only up to current month
    for (let i = 6; i >= 0; i--) {
      const monthStart = new Date(currentYear, currentMonth - i, 1);
      const monthEnd = new Date(
        currentYear,
        currentMonth - i + 1,
        0,
        23,
        59,
        59,
        999
      );

      // Only include months that are in the past or current
      if (monthStart <= now) {
        monthlyRanges.push({
          start: monthStart,
          end: monthEnd,
          label: formatMonthLabel(monthStart),
        });
      }
    }

    const monthlySalesPromises = monthlyRanges.map(async (range) => {
      try {
        const amount = await sumSales(range.start, range.end);
        return {
          month: range.label,
          amount: amount,
        };
      } catch (error) {
        console.error(`Error fetching month ${range.label}:`, error);
        return {
          month: range.label,
          amount: 0,
        };
      }
    });

    const monthlySalesResults = await Promise.all(monthlySalesPromises);
    const formattedMonthlySales = monthlySalesResults.filter(
      (item) => item !== null
    );

    console.log("=== MONTHLY SALES RESULTS ===");
    console.log(formattedMonthlySales);

    // --- BEST SELLING PRODUCTS ---
    const bestSellingByCategory = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startOfMonth, $lte: endOfToday }, // Only up to today
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

    // Dynamic category grouping based on actual product categories
    const categories = {};

    bestSellingByCategory.forEach((item) => {
      const category = item.category || "uncategorized";

      // Create category if it doesn't exist
      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(item);
    });

    // Sort each category by units
    Object.keys(categories).forEach((category) => {
      categories[category].sort((a, b) => b.units - a.units);
    });

    console.log("=== DYNAMIC CATEGORIES ===");
    console.log("Categories found:", Object.keys(categories));

    // --- FINAL RESPONSE WITH CONSISTENT NUMBERS ---
    const stats = {
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
    };

    console.log("=== FINAL CONSISTENT STATS ===");
    console.log("Current Day:", currentDay);
    console.log("Days in Chart:", formattedDailySales.length);
    console.log("Daily Transactions:", stats.transactions.daily);
    console.log("Daily Sales:", stats.sales.daily);
    console.log("Weekly Sales:", stats.sales.weekly);
    console.log("Monthly Sales:", stats.sales.monthly);

    res.json({
      stats,
      // Chart data - all using consistent calculation methods
      dailySales: formattedDailySales,
      weeklySales: finalWeeklySales,
      monthlySales: formattedMonthlySales,
      bestSelling: categories,
      lastUpdated: new Date().toISOString(),
      currentDay: currentDay, // For debugging in frontend
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: error.message });
  }
};
