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
    // Get current time - ALWAYS WORK IN UTC FOR SERVER-SIDE
    const now = new Date();
    
    // Get Philippine time (UTC+8) for display purposes
    const PH_OFFSET = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const nowPH = new Date(now.getTime() + PH_OFFSET);
    
    const currentDay = nowPH.getUTCDate();
    const currentMonth = nowPH.getUTCMonth();
    const currentYear = nowPH.getUTCFullYear();

    console.log(`=== DASHBOARD TIME DEBUG ===`);
    console.log(`Server UTC Time: ${now.toISOString()}`);
    console.log(`Philippine Time: ${nowPH.toISOString()}`);
    console.log(`PH Date: ${currentYear}-${currentMonth + 1}-${currentDay}`);
    console.log(`Timezone Offset: ${new Date().getTimezoneOffset()} minutes`);

    // CRITICAL FIX: Create ALL dates in UTC, then adjust for Philippine time
    // Daily ranges in Philippine time (converted to UTC for querying)
    const startOfTodayPH = new Date(Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0));
    const endOfTodayPH = new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999));
    
    // Convert PH times to UTC for database querying
    const startOfTodayUTC = new Date(startOfTodayPH.getTime() - PH_OFFSET);
    const endOfTodayUTC = new Date(endOfTodayPH.getTime() - PH_OFFSET);

    // Weekly ranges in Philippine time
    const dayPH = nowPH.getUTCDay(); // 0=Sunday, 1=Monday, etc.
    const mondayOffsetPH = dayPH === 0 ? -6 : 1 - dayPH;
    
    const startOfWeekPH = new Date(Date.UTC(
      currentYear,
      currentMonth,
      currentDay + mondayOffsetPH,
      0, 0, 0, 0
    ));
    const endOfWeekPH = new Date(startOfWeekPH.getTime());
    endOfWeekPH.setUTCDate(startOfWeekPH.getUTCDate() + 6);
    endOfWeekPH.setUTCHours(23, 59, 59, 999);
    
    // Convert to UTC for querying
    const startOfWeekUTC = new Date(startOfWeekPH.getTime() - PH_OFFSET);
    const endOfWeekUTC = new Date(endOfWeekPH.getTime() - PH_OFFSET);

    // Monthly ranges in Philippine time
    const startOfMonthPH = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endOfMonthPH = new Date(Date.UTC(
      currentYear,
      currentMonth + 1,
      0,
      23, 59, 59, 999
    ));
    
    // Convert to UTC for querying
    const startOfMonthUTC = new Date(startOfMonthPH.getTime() - PH_OFFSET);
    const endOfMonthUTC = new Date(endOfMonthPH.getTime() - PH_OFFSET);

    console.log("=== PHILIPPINE TIME RANGES ===");
    console.log("Today (PH):", startOfTodayPH.toISOString(), "to", endOfTodayPH.toISOString());
    console.log("Week (PH):", startOfWeekPH.toISOString(), "to", endOfWeekPH.toISOString());
    console.log("Month (PH):", startOfMonthPH.toISOString(), "to", endOfMonthPH.toISOString());
    
    console.log("=== UTC QUERY RANGES ===");
    console.log("Today (UTC query):", startOfTodayUTC.toISOString(), "to", endOfTodayUTC.toISOString());
    console.log("Week (UTC query):", startOfWeekUTC.toISOString(), "to", endOfWeekUTC.toISOString());
    console.log("Month (UTC query):", startOfMonthUTC.toISOString(), "to", endOfMonthUTC.toISOString());

    // COUNT HELPERS - Use UTC dates for querying
    const countTransactions = async (startUTC, endUTC) => {
      console.log(`Querying transactions from ${startUTC.toISOString()} to ${endUTC.toISOString()}`);
      const transactions = await Transaction.find({
        transactionDate: { $gte: startUTC, $lte: endUTC },
      });
      console.log(`Found ${transactions.length} transactions in this range`);
      if (transactions.length > 0) {
        console.log(`Sample transaction date: ${transactions[0].transactionDate.toISOString()}`);
      }
      return transactions.length;
    };

    const sumSales = async (startUTC, endUTC) => {
      console.log(`Summing sales from ${startUTC.toISOString()} to ${endUTC.toISOString()}`);
      const transactions = await Transaction.find({
        transactionDate: { $gte: startUTC, $lte: endUTC },
      });
      const total = transactions.reduce((sum, transaction) => {
        return sum + (transaction.totalAmount || 0);
      }, 0);
      console.log(`Total sales: ${total}`);
      return total;
    };

    const countStockIns = async (startUTC, endUTC) => {
      const stockIns = await StockIn.find({ 
        date: { $gte: startUTC, $lte: endUTC } 
      });
      return stockIns.length;
    };

    const countSpoilage = async (startUTC, endUTC) => {
      const spoilages = await Spoilage.find({
        createdAt: { $gte: startUTC, $lte: endUTC },
      });
      return spoilages.length;
    };

    // Get ALL data using consistent UTC methods
    const [
      // DAILY - Using UTC dates
      dailyTransactions,
      dailySalesAmount,
      dailyStockIns,
      dailySpoilage,

      // WEEKLY - Using UTC dates
      weeklyTransactions,
      weeklySalesAmount,
      weeklyStockIns,
      weeklySpoilage,

      // MONTHLY - Using UTC dates
      monthlyTransactions,
      monthlySalesAmount,
      monthlyStockIns,
      monthlySpoilage,

      // All transactions for this month (for chart) - Using UTC dates
      monthlyTransactionsForChart,
    ] = await Promise.all([
      // DAILY
      countTransactions(startOfTodayUTC, endOfTodayUTC),
      sumSales(startOfTodayUTC, endOfTodayUTC),
      countStockIns(startOfTodayUTC, endOfTodayUTC),
      countSpoilage(startOfTodayUTC, endOfTodayUTC),

      // WEEKLY
      countTransactions(startOfWeekUTC, endOfWeekUTC),
      sumSales(startOfWeekUTC, endOfWeekUTC),
      countStockIns(startOfWeekUTC, endOfWeekUTC),
      countSpoilage(startOfWeekUTC, endOfWeekUTC),

      // MONTHLY
      countTransactions(startOfMonthUTC, endOfMonthUTC),
      sumSales(startOfMonthUTC, endOfMonthUTC),
      countStockIns(startOfMonthUTC, endOfMonthUTC),
      countSpoilage(startOfMonthUTC, endOfMonthUTC),

      // Get all transactions for this month for accurate chart data
      Transaction.find({
        transactionDate: { 
          $gte: startOfMonthUTC, 
          $lte: endOfTodayUTC // Only up to today
        },
      }),
    ]);

    console.log("=== QUERY RESULTS ===");
    console.log("Daily Transactions:", dailyTransactions);
    console.log("Daily Sales:", dailySalesAmount);
    console.log("Weekly Transactions:", weeklyTransactions);
    console.log("Weekly Sales:", weeklySalesAmount);
    console.log("Monthly Transactions:", monthlyTransactions);
    console.log("Monthly Sales:", monthlySalesAmount);

    // --- SALES GRAPH DATA - Only show passed days and current day ---
    const dailySalesMap = new Map();

    // Only initialize days that have passed (1 to currentDay)
    for (let day = 1; day <= currentDay; day++) {
      dailySalesMap.set(day, 0);
    }

    console.log(`=== INITIALIZED DAYS: 1 to ${currentDay} ===`);

    // Populate with actual transaction data
    monthlyTransactionsForChart.forEach((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      // Convert transaction UTC date to Philippine time for day extraction
      const transactionDatePH = new Date(transactionDate.getTime() + PH_OFFSET);
      const transactionDay = transactionDatePH.getUTCDate();

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

    console.log("=== DAILY SALES CHART DATA ===");
    console.log(formattedDailySales);

    // Weekly Sales - Calculate for last 4 weeks in Philippine time
    const getWeekRanges = () => {
      const ranges = [];
      const todayPH = new Date(now.getTime() + PH_OFFSET);

      // Get current week and previous 3 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStartPH = new Date(todayPH);
        
        // Calculate Monday of the week (weeks ago) in PH time
        const daysSinceMonday = (todayPH.getUTCDay() + 6) % 7;
        weekStartPH.setUTCDate(todayPH.getUTCDate() - daysSinceMonday - i * 7);
        weekStartPH.setUTCHours(0, 0, 0, 0);

        const weekEndPH = new Date(weekStartPH);
        weekEndPH.setUTCDate(weekStartPH.getUTCDate() + 6);
        weekEndPH.setUTCHours(23, 59, 59, 999);

        // Convert to UTC for querying
        const weekStartUTC = new Date(weekStartPH.getTime() - PH_OFFSET);
        const weekEndUTC = new Date(weekEndPH.getTime() - PH_OFFSET);

        ranges.push({
          startPH: weekStartPH,
          endPH: weekEndPH,
          startUTC: weekStartUTC,
          endUTC: weekEndUTC,
          label: formatWeekLabel(weekStartPH, weekEndPH),
        });
      }

      return ranges;
    };

    const weekRanges = getWeekRanges();
    console.log("=== WEEK RANGES ===");
    weekRanges.forEach((range, index) => {
      console.log(`Week ${index + 1}: ${range.label}`);
      console.log(`  PH: ${range.startPH.toISOString()} to ${range.endPH.toISOString()}`);
      console.log(`  UTC: ${range.startUTC.toISOString()} to ${range.endUTC.toISOString()}`);
    });

    // Get sales data for each week using UTC dates
    const weeklySalesPromises = weekRanges.map(async (range) => {
      try {
        const amount = await sumSales(range.startUTC, range.endUTC);
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

    // Monthly Sales - Calculate for last 6 months in Philippine time
    const monthlyRanges = [];

    for (let i = 6; i >= 0; i--) {
      const monthStartPH = new Date(Date.UTC(currentYear, currentMonth - i, 1, 0, 0, 0, 0));
      const monthEndPH = new Date(Date.UTC(
        currentYear,
        currentMonth - i + 1,
        0,
        23, 59, 59, 999
      ));

      // Convert to UTC for querying
      const monthStartUTC = new Date(monthStartPH.getTime() - PH_OFFSET);
      const monthEndUTC = new Date(monthEndPH.getTime() - PH_OFFSET);

      // Only include months that are in the past or current
      if (monthStartPH <= nowPH) {
        monthlyRanges.push({
          startPH: monthStartPH,
          endPH: monthEndPH,
          startUTC: monthStartUTC,
          endUTC: monthEndUTC,
          label: formatMonthLabel(monthStartPH),
        });
      }
    }

    const monthlySalesPromises = monthlyRanges.map(async (range) => {
      try {
        const amount = await sumSales(range.startUTC, range.endUTC);
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
    // Use UTC dates for aggregation
    const bestSellingByCategory = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { 
            $gte: startOfMonthUTC, 
            $lte: endOfTodayUTC 
          },
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

    // Dynamic category grouping
    const categories = {};

    bestSellingByCategory.forEach((item) => {
      const category = item.category || "uncategorized";

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(item);
    });

    Object.keys(categories).forEach((category) => {
      categories[category].sort((a, b) => b.units - a.units);
    });

    console.log("=== DYNAMIC CATEGORIES ===");
    console.log("Categories found:", Object.keys(categories));

    // --- FINAL RESPONSE ---
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

    console.log("=== FINAL STATS ===");
    console.log("Current Day (PH):", currentDay);
    console.log("Daily Transactions:", stats.transactions.daily);
    console.log("Daily Sales:", stats.sales.daily);
    console.log("Weekly Sales:", stats.sales.weekly);
    console.log("Monthly Sales:", stats.sales.monthly);

    res.json({
      stats,
      // Chart data
      dailySales: formattedDailySales,
      weeklySales: finalWeeklySales,
      monthlySales: formattedMonthlySales,
      bestSelling: categories,
      lastUpdated: new Date().toISOString(),
      currentDay: currentDay,
      timezoneInfo: {
        serverUTC: now.toISOString(),
        phTime: nowPH.toISOString(),
        offset: PH_OFFSET,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};