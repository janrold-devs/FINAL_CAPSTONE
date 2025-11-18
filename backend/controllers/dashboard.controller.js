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
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Helper function to calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
    };

    // 1. TODAY'S Transactions
    const transactionsToday = await Transaction.countDocuments({
      transactionDate: { $gte: today }
    });

    const transactionsYesterday = await Transaction.countDocuments({
      transactionDate: { $gte: yesterday, $lt: today }
    });

    const transactionChange = calculateChange(transactionsToday, transactionsYesterday);

    // 2. TODAY'S Sales
    const salesToday = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSales" }
        }
      }
    ]);
    const todaySalesAmount = salesToday.length > 0 ? salesToday[0].total : 0;

    const salesYesterday = await Sales.aggregate([
      {
        $match: {
          transactionDate: { $gte: yesterday, $lt: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalSales" }
        }
      }
    ]);
    const yesterdaySales = salesYesterday.length > 0 ? salesYesterday[0].total : 0;
    const salesChange = calculateChange(todaySalesAmount, yesterdaySales);

    // 3. TODAY'S Stock In
    const stockInsToday = await StockIn.countDocuments({
      date: { $gte: today }
    });

    const stockInsYesterday = await StockIn.countDocuments({
      date: { $gte: yesterday, $lt: today }
    });
    const stockInChange = calculateChange(stockInsToday, stockInsYesterday);

    // 4. TODAY'S Spoiled & Damaged Ingredients
    const spoilagesToday = await Spoilage.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
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
    const spoiledItemsToday = spoilagesToday.length > 0 ? spoilagesToday[0].totalItems : 0;

    const spoilagesYesterday = await Spoilage.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday, $lt: today }
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
    const spoiledItemsYesterday = spoilagesYesterday.length > 0 ? spoilagesYesterday[0].totalItems : 0;
    const spoilageChange = calculateChange(spoiledItemsToday, spoiledItemsYesterday);

    // 5. Daily sales for this month (for chart)
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

    // 8. BEST SELLING PRODUCTS BY CATEGORY (Updated)
    const bestSellingByCategory = await Transaction.aggregate([
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
          category: "$productInfo.category",
          units: "$totalUnits"
        }
      }
    ]);

    // Categorize best selling products
    const categorizedBestSellers = {
      coffee: [],
      milktea: [],
      frappe: [],
      choco: [],
      fruitTea: []
    };

    // Map your product categories to the expected categories
    bestSellingByCategory.forEach(product => {
      const category = product.category?.toLowerCase() || '';
      
      if (category.includes('coffee') || category.includes('brew')) {
        categorizedBestSellers.coffee.push(product);
      } else if (category.includes('milktea') || category.includes('milk tea')) {
        categorizedBestSellers.milktea.push(product);
      } else if (category.includes('frappe')) {
        categorizedBestSellers.frappe.push(product);
      } else if (category.includes('choco') || category.includes('chocolate')) {
        categorizedBestSellers.choco.push(product);
      } else if (category.includes('fruit') || category.includes('tea')) {
        categorizedBestSellers.fruitTea.push(product);
      } else {
        // Default to coffee if no category matches
        categorizedBestSellers.coffee.push(product);
      }
    });

    // Sort each category by units sold and limit to top 5
    Object.keys(categorizedBestSellers).forEach(category => {
      categorizedBestSellers[category] = categorizedBestSellers[category]
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);
    });

    res.json({
      stats: {
        transactions: {
          count: transactionsToday,
          change: transactionChange
        },
        sales: {
          amount: todaySalesAmount,
          change: salesChange
        },
        stockIns: {
          count: stockInsToday,
          change: stockInChange
        },
        spoilage: {
          count: spoiledItemsToday,
          change: spoilageChange
        }
      },
      dailySales: dailySalesData,
      weeklySales: weeklySalesData,
      monthlySales: monthlySalesData,
      bestSelling: categorizedBestSellers
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: err.message });
  }
};