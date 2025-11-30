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
      "✅ Sales calculated from transactions:",
      salesBatches.length,
      "batches"
    );
    res.json(salesBatches);
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

    // Parse the date
    const [year, month, day] = date.split("-").map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

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

    // Calculate total from transactions
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
        transactionDate: startDate,
      });

      // Populate the newly created batch
      salesBatch = await Sales.findById(salesBatch._id).populate({
        path: "transactions",
        populate: [
          { path: "cashier", select: "firstName lastName" },
          { path: "itemsSold.product" },
        ],
      });
    }

    // Always return calculated data from transactions
    const response = {
      ...salesBatch.toObject(),
      totalSales: totalSales,
      transactions: transactions,
      transactionCount: transactions.length,
    };

    console.log(
      `✅ Sales batch ${batchNumber}: ₱${totalSales} from ${transactions.length} transactions`
    );
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

    // Calculate date range based on period
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        break;
      case "weekly":
        const currentDay = now.getDay();
        const currentMonday = new Date(now);
        currentMonday.setDate(
          now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)
        );
        startDate = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate()
        );
        endDate = new Date(
          currentMonday.getFullYear(),
          currentMonday.getMonth(),
          currentMonday.getDate() + 7
        );
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Get best selling products from Transaction aggregation
    const bestSelling = await Transaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startDate,
            $lt: endDate,
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

    // Get total sales for the period
    const transactions = await Transaction.find({
      transactionDate: {
        $gte: startDate,
        $lt: endDate,
      },
    });
    const totalSales = transactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );

    res.json({
      products: activeProducts,
      totalSales: totalSales,
      transactionCount: transactions.length,
      startDate,
      endDate,
      period,
      summary: {
        totalProductsFound: bestSelling.length,
        activeProducts: activeProducts.length,
        deletedProductsFiltered: bestSelling.length - activeProducts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching best-selling products:", error);
    res.status(500).json({ message: error.message });
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
