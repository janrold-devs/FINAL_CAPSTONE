// backend/controllers/dashboard.controller.js
import Transaction from "../models/Transaction.js";
import Sales from "../models/Sales.js";
import StockIn from "../models/StockIn.js";
import Spoilage from "../models/Spoilage.js";
import Product from "../models/Product.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // 1. Product Transactions this month
    const transactionsThisMonth = await Transaction.countDocuments({
      transactionDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
    });

    // Previous month for comparison
    const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const transactionsLastMonth = await Transaction.countDocuments({
      transactionDate: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
    });
    const transactionChange = transactionsLastMonth > 0 
      ? `${((transactionsThisMonth - transactionsLastMonth) / transactionsLastMonth * 100).toFixed(0)}%`
      : '+100%';

    // 2. Total Sales this month
    const salesThisMonth = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSales" }
        }
      }
    ]);
    const totalSalesAmount = salesThisMonth.length > 0 ? salesThisMonth[0].total : 0;

    const salesLastMonth = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSales" }
        }
      }
    ]);
    const lastMonthSales = salesLastMonth.length > 0 ? salesLastMonth[0].total : 0;
    const salesChange = lastMonthSales > 0
      ? `${((totalSalesAmount - lastMonthSales) / lastMonthSales * 100).toFixed(0)}%`
      : '+100%';

    // 3. Number of Stock In this month
    const stockInsThisMonth = await StockIn.countDocuments({
      date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
    });

    const stockInsLastMonth = await StockIn.countDocuments({
      date: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
    });
    const stockInChange = stockInsLastMonth > 0
      ? `${((stockInsThisMonth - stockInsLastMonth) / stockInsLastMonth * 100).toFixed(0)}%`
      : '+100%';

    // 4. Spoiled & Damaged Ingredients count this month
    const spoilagesThisMonth = await Spoilage.aggregate([
      {
        $match: {
          createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        }
      },
      {
        $unwind: "$ingredients"
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 }
        }
      }
    ]);
    const spoiledItemsCount = spoilagesThisMonth.length > 0 ? spoilagesThisMonth[0].totalItems : 0;

    const spoilagesLastMonth = await Spoilage.aggregate([
      {
        $match: {
          createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        }
      },
      {
        $unwind: "$ingredients"
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 }
        }
      }
    ]);
    const lastMonthSpoiled = spoilagesLastMonth.length > 0 ? spoilagesLastMonth[0].totalItems : 0;
    const spoilageChange = lastMonthSpoiled > 0
      ? `${((spoiledItemsCount - lastMonthSpoiled) / lastMonthSpoiled * 100).toFixed(0)}%`
      : spoiledItemsCount > 0 ? '+100%' : '0%';

    // 5. Daily sales for this month
    const dailySales = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        }
      },
      {
        $project: {
          totalSales: 1,
          day: { $dayOfMonth: "$transactionDate" },
          month: { $month: "$transactionDate" },
          year: { $year: "$transactionDate" }
        }
      },
      {
        $group: {
          _id: { day: "$day", month: "$month", year: "$year" },
          amount: { $sum: "$totalSales" }
        }
      },
      {
        $sort: { "_id.day": 1 }
      }
    ]);

    // Format daily sales data
    const dailySalesData = dailySales.map(item => ({
      date: `${item._id.month}/${item._id.day}`,
      day: item._id.day,
      amount: item.amount
    }));

    // 6. Weekly sales for this month
    const weeklySales = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        }
      },
      {
        $project: {
          totalSales: 1,
          dayOfMonth: { $dayOfMonth: "$transactionDate" }
        }
      },
      {
        $group: {
          _id: {
            $ceil: { $divide: ["$dayOfMonth", 7] }
          },
          amount: { $sum: "$totalSales" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format weekly data
    const maxWeek = Math.ceil(now.getDate() / 7);
    const weeklySalesData = Array.from({ length: maxWeek }, (_, i) => ({
      week: `Week ${i + 1}`,
      amount: 0
    }));

    weeklySales.forEach(item => {
      if (item._id > 0 && item._id <= weeklySalesData.length) {
        weeklySalesData[item._id - 1].amount = item.amount;
      }
    });

    // 7. Monthly sales for this year
    const monthlySales = await Sales.aggregate([
      {
        $match: {
          transactionDate: { 
            $gte: new Date(currentYear, 0, 1),
            $lte: lastDayOfMonth
          }
        }
      },
      {
        $project: {
          totalSales: 1,
          month: { $month: "$transactionDate" }
        }
      },
      {
        $group: {
          _id: "$month",
          amount: { $sum: "$totalSales" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format monthly data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesData = [];
    for (let i = 0; i <= currentMonth; i++) {
      const monthData = monthlySales.find(m => m._id === i + 1);
      monthlySalesData.push({
        month: monthNames[i],
        amount: monthData ? monthData.amount : 0
      });
    }

    // 8. Best Selling Products
    const bestSelling = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        }
      },
      { $unwind: "$itemsSold" },
      {
        $group: {
          _id: "$itemsSold.product",
          totalUnits: { $sum: "$itemsSold.quantity" }
        }
      },
      { $sort: { totalUnits: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          name: "$productInfo.productName",
          units: "$totalUnits"
        }
      }
    ]);

    res.json({
      stats: {
        transactions: {
          count: transactionsThisMonth,
          change: transactionChange
        },
        sales: {
          amount: totalSalesAmount,
          change: salesChange
        },
        stockIns: {
          count: stockInsThisMonth,
          change: stockInChange
        },
        spoilage: {
          count: spoiledItemsCount,
          change: spoilageChange
        }
      },
      dailySales: dailySalesData,
      weeklySales: weeklySalesData,
      monthlySales: monthlySalesData,
      bestSelling
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: err.message });
  }
};