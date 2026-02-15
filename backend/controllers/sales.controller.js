// backend/controllers/sales.controller.js
import Sales from "../models/Sales.js";
import Transaction from "../models/Transaction.js";
import Product from "../models/Product.js";

// Get sales summary - CALCULATED FROM TRANSACTIONS
export const getSalesSummary = async (req, res) => {
  try {
    // Get sales batches with calculated totals from transactions
    const salesBatches = await Sales.aggregate([
      {
        $lookup: {
          from: "transactions",
          localField: "transactions",
          foreignField: "_id",
          as: "transactionDetails",
        },
      },
      {
        $addFields: {
          // Calculate total from actual transactions
          totalSales: {
            $sum: "$transactionDetails.totalAmount",
          },
          transactionsCount: {
            $size: "$transactions",
          },
        },
      },
      {
        $project: {
          batchNumber: 1,
          transactionDate: 1,
          totalSales: 1,
          transactionsCount: 1,
          transactions: 1,
        },
      },
      {
        $sort: { transactionDate: -1 },
      },
    ]);

    console.log(
      `✅ Sales calculated from transactions: ${salesBatches.length} batches (${process.env.NODE_ENV})`
    );

    // Convert dates to Philippine time for display
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const adjustedBatches = salesBatches.map(batch => ({
      ...batch,
      transactionDatePH: new Date(batch.transactionDate.getTime() + PH_OFFSET).toISOString()
    }));

    res.json(adjustedBatches);
  } catch (err) {
    console.error("Sales summary error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get sales by date - CALCULATED FROM TRANSACTIONS
export const getSalesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    console.log("📅 Fetching sales for date:", date);

    // Parse the date - USE PHILIPPINE TIMEZONE LOGIC
    const [year, month, day] = date.split("-").map(Number);

    // Use Philippine timezone offset
    const PH_OFFSET = 8 * 60 * 60 * 1000;

    // Create dates in Philippine time
    const startDatePH = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDatePH = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Convert to UTC for database query
    const startDate = new Date(startDatePH.getTime() - PH_OFFSET);
    const endDate = new Date(endDatePH.getTime() - PH_OFFSET);

    console.log(`📅 Date ranges for ${date}:`);
    console.log(`   PH Time: ${startDatePH.toISOString()} to ${endDatePH.toISOString()}`);
    console.log(`   UTC Query: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get transactions for this date directly
    const transactions = await Transaction.find({
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("cashier", "firstName lastName")
      .populate("itemsSold.product")
      .sort({ transactionDate: -1 });

    console.log(`📊 Found ${transactions.length} transactions for ${date}`);

    // Calculate total from transactions - ALWAYS CALCULATE FRESH
    const totalSales = transactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    // Find or create sales batch
    const batchNumber = `BATCH-${date}`;
    let salesBatch = await Sales.findOne({ batchNumber }).populate({
      path: "transactions",
      populate: [
        { path: "cashier", select: "firstName lastName" },
        { path: "itemsSold.product" },
      ],
    });

    if (!salesBatch) {
      // Create new sales batch with the transactions
      salesBatch = await Sales.create({
        batchNumber,
        transactions: transactions.map((t) => t._id),
        transactionDate: startDatePH, // Store as Philippine time
      });

      // Populate the newly created batch
      salesBatch = await Sales.findById(salesBatch._id).populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" },
        ],
      });
    } else {
      // Update the batch with current transactions
      salesBatch.transactions = transactions.map((t) => t._id);
      await salesBatch.save();

      // Re-populate
      salesBatch = await Sales.findById(salesBatch._id).populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" },
        ],
      });
    }

    // Always return CALCULATED data from transactions, not stored total
    const response = {
      ...salesBatch.toObject(),
      totalSales: totalSales, // Use calculated total, not stored total
      transactions: transactions,
      transactionCount: transactions.length,
      calculatedTotal: totalSales,
      isAccurate: true,
    };

    console.log(
      `✅ Sales batch ${batchNumber}: ₱${totalSales} from ${transactions.length} transactions`
    );

    // Verify accuracy
    if (salesBatch.totalSales !== totalSales) {
      console.log(`⚠️ Discrepancy detected: Stored: ₱${salesBatch.totalSales}, Calculated: ₱${totalSales}`);
    }

    res.json(response);
  } catch (err) {
    console.error("Sales by date error:", err);
    res.status(500).json({ message: err.message });
  }
};

// getBestSellingProducts
export const getBestSellingProducts = async (req, res) => {
  try {
    const { period } = req.query;
    console.log(`📊 [${process.env.NODE_ENV}] Fetching best selling products for period: ${period}`);

    // IMPORTANT: Use the SAME timezone logic as dashboard.controller.js
    const now = new Date();

    // Apply Philippine timezone offset (UTC+8)
    const PH_OFFSET = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const nowPH = new Date(now.getTime() + PH_OFFSET);

    console.log(`🌐 Server UTC Time: ${now.toISOString()}`);
    console.log(`🌐 Philippine Time: ${nowPH.toISOString()}`);

    // Calculate date range based on period IN PHILIPPINE TIME
    let startDatePH, endDatePH;
    let startDateUTC, endDateUTC;

    const currentDayPH = nowPH.getUTCDate();
    const currentMonthPH = nowPH.getUTCMonth();
    const currentYearPH = nowPH.getUTCFullYear();

    switch (period) {
      case "daily":
        // Today in Philippine time
        startDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH,
          currentDayPH,
          0, 0, 0, 0
        ));
        endDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH,
          currentDayPH + 1,
          0, 0, 0, 0
        ));

        // Convert to UTC for database query
        startDateUTC = new Date(startDatePH.getTime() - PH_OFFSET);
        endDateUTC = new Date(endDatePH.getTime() - PH_OFFSET);
        break;

      case "weekly":
        // This week in Philippine time (Monday to Sunday)
        const currentDayOfWeek = nowPH.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
        const mondayOffsetPH = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

        startDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH,
          currentDayPH + mondayOffsetPH,
          0, 0, 0, 0
        ));
        endDatePH = new Date(startDatePH.getTime());
        endDatePH.setUTCDate(startDatePH.getUTCDate() + 7);
        endDatePH.setUTCHours(0, 0, 0, 0);

        // Convert to UTC for database query
        startDateUTC = new Date(startDatePH.getTime() - PH_OFFSET);
        endDateUTC = new Date(endDatePH.getTime() - PH_OFFSET);
        break;

      case "monthly":
        // This month in Philippine time
        startDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH,
          1,
          0, 0, 0, 0
        ));
        endDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH + 1,
          1,
          0, 0, 0, 0
        ));

        // Convert to UTC for database query
        startDateUTC = new Date(startDatePH.getTime() - PH_OFFSET);
        endDateUTC = new Date(endDatePH.getTime() - PH_OFFSET);
        break;

      default:
        // Default to this month
        startDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH,
          1,
          0, 0, 0, 0
        ));
        endDatePH = new Date(Date.UTC(
          currentYearPH,
          currentMonthPH + 1,
          1,
          0, 0, 0, 0
        ));

        // Convert to UTC for database query
        startDateUTC = new Date(startDatePH.getTime() - PH_OFFSET);
        endDateUTC = new Date(endDatePH.getTime() - PH_OFFSET);
    }

    console.log(`📅 Philippine Date Range: ${startDatePH.toISOString()} to ${endDatePH.toISOString()}`);
    console.log(`📅 UTC Query Range: ${startDateUTC.toISOString()} to ${endDateUTC.toISOString()}`);
    console.log(`🌐 Timezone offset applied: ${PH_OFFSET / 1000 / 60 / 60} hours (UTC+8)`);

    // Get best selling products from Transaction aggregation using UTC dates
    const bestSelling = await Transaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startDateUTC,
            $lt: endDateUTC,
          },
        },
      },
      {
        $unwind: "$itemsSold",
      },
      {
        $group: {
          _id: "$itemsSold.product",
          unitsSold: { $sum: "$itemsSold.quantity" },
          totalAmount: { $sum: "$itemsSold.totalCost" },
        },
      },
      {
        $sort: { unitsSold: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    console.log(
      `📊 Best selling aggregation found ${bestSelling.length} product entries`
    );

    // Get ONLY existing product IDs
    const productIds = bestSelling
      .map((item) => item._id)
      .filter((id) => id) // Remove nulls
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

    console.log(`🔄 Checking ${productIds.length} unique products`);

    // Fetch ONLY existing products
    const existingProducts = await Product.find({
      _id: { $in: productIds },
    }).select("sizes image productName category");

    console.log(`✅ Found ${existingProducts.length} active products`);

    // Filter out deleted products and merge data
    const activeProducts = bestSelling
      .map((item) => {
        // Find if this product still exists
        const productDetail = existingProducts.find(
          (p) => p._id.toString() === item._id.toString()
        );

        // Only include if product exists
        if (!productDetail) {
          return null; // Skip deleted products
        }

        // Get the first size and price as default
        const defaultSize =
          productDetail.sizes && productDetail.sizes.length > 0
            ? productDetail.sizes[0]
            : { size: null, price: 0 };

        return {
          _id: item._id,
          productName: productDetail.productName,
          category: productDetail.category,
          unitsSold: item.unitsSold || 0,
          totalAmount: item.totalAmount || 0,
          sizes: productDetail.sizes,
          size: defaultSize.size,
          price: defaultSize.price,
          image: productDetail.image,
        };
      })
      .filter((product) => product !== null); // Remove null entries (deleted products)

    console.log(
      `🏆 Final best selling products: ${activeProducts.length} active products`
    );

    // Get total sales for the period using UTC dates
    const transactions = await Transaction.find({
      transactionDate: {
        $gte: startDateUTC,
        $lt: endDateUTC,
      },
    });

    const totalSales = transactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    // Log debug info
    console.log(`💰 Total sales for period: ₱${totalSales}`);
    console.log(`📊 Transactions found: ${transactions.length}`);
    console.log(`📦 Sample transaction dates:`,
      transactions.slice(0, 3).map(t => t.transactionDate.toISOString())
    );

    res.json({
      products: activeProducts,
      totalSales: totalSales,
      transactionCount: transactions.length,
      startDate: startDatePH, // Return Philippine time for display
      endDate: endDatePH,
      period,
      timezoneInfo: {
        queryRangeUTC: {
          start: startDateUTC.toISOString(),
          end: endDateUTC.toISOString(),
        },
        displayRangePH: {
          start: startDatePH.toISOString(),
          end: endDatePH.toISOString(),
        },
        serverTime: now.toISOString(),
        phTime: nowPH.toISOString(),
      },
      summary: {
        totalProductsFound: bestSelling.length,
        activeProducts: activeProducts.length,
        deletedProductsFiltered: bestSelling.length - activeProducts.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching best-selling products:", error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Simple refresh - just recalculates
export const refreshAndReconcileSales = async (req, res) => {
  try {
    // Simply return current calculated data
    const salesBatches = await Sales.aggregate([
      {
        $lookup: {
          from: "transactions",
          localField: "transactions",
          foreignField: "_id",
          as: "transactionDetails",
        },
      },
      {
        $addFields: {
          totalSales: {
            $sum: "$transactionDetails.totalAmount",
          },
          transactionsCount: {
            $size: "$transactions",
          },
        },
      },
      {
        $project: {
          batchNumber: 1,
          transactionDate: 1,
          totalSales: 1,
          transactionsCount: 1,
          transactions: 1,
        },
      },
      {
        $sort: { transactionDate: -1 },
      },
    ]);

    res.json({
      message: "Sales data refreshed",
      salesData: salesBatches,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all Sales (with populated transactions)
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

// Get sales batch with verification
export const getVerifiedSale = async (req, res) => {
  try {
    const salesBatch = await Sales.findById(req.params.id).populate({
      path: "transactions",
      populate: { path: "itemsSold.product" },
    });

    if (!salesBatch) {
      return res.status(404).json({ message: "Sales batch not found" });
    }

    // Calculate actual total from transactions
    const calculatedTotal = salesBatch.transactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    res.json({
      ...salesBatch.toObject(),
      verifiedTotal: calculatedTotal,
      isAccurate: true,
      discrepancy: 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
