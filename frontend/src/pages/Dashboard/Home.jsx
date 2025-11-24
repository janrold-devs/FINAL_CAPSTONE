import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  PhilippinePeso,
  Package,
  AlertTriangle,
  ArrowRight,
  Flame,
  Trophy,
  Award,
  Zap,
  Coffee,
  Droplet,
  Wind,
  Heart,
  Leaf,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "../../api/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    stats: {
      transactions: { count: 0 },
      sales: { amount: 0 },
      stockIns: { count: 0 },
      spoilage: { count: 0 },
    },
    dailyTransactions: [],
    weeklyTransactions: [],
    monthlyTransactions: [],
    dailyStockIns: [],
    weeklyStockIns: [],
    monthlyStockIns: [],
    dailySpoilage: [],
    weeklySpoilage: [],
    monthlySpoilage: [],
    dailySales: [],
    weeklySales: [],
    monthlySales: [],
    bestSelling: {
      coffee: [],
      milktea: [],
      frappe: [],
      choco: [],
      fruitTea: [],
    },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching dashboard data...");
      const response = await axios.get("/dashboard/stats");
      console.log("Dashboard data received:", response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      console.error("Error response:", error.response);
      setError(
        error.response?.data?.message || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Simplified StatCard with navigation
  const StatCard = ({
    icon: Icon,
    title,
    value,
    change,
    color,
    isNegative,
    navigateTo,
    periodLabel,
  }) => {
    const changeColor = isNegative
      ? change?.includes("+") || change?.includes("-")
        ? "text-red-600"
        : "text-green-600"
      : change?.includes("-")
      ? "text-red-600"
      : "text-green-600";

    return (
      <div
        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        onClick={() => navigateTo && navigate(navigateTo)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${changeColor}`}>
              {change} {periodLabel}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-1">
          {loading ? "..." : value}
        </h3>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Get the appropriate data based on active tab
  const getChartData = () => {
    switch (activeTab) {
      case "daily":
        return dashboardData.dailySales;
      case "weekly":
        return dashboardData.weeklySales;
      case "monthly":
        return dashboardData.monthlySales;
      default:
        return dashboardData.dailySales;
    }
  };

  const getChartLabel = () => {
    switch (activeTab) {
      case "daily":
        return "Daily Sales";
      case "weekly":
        return "Weekly Sales";
      case "monthly":
        return "Monthly Sales";
      default:
        return "Daily Sales";
    }
  };

  const getXAxisKey = () => {
    switch (activeTab) {
      case "daily":
        return "day";
      case "weekly":
        return "week";
      case "monthly":
        return "month";
      default:
        return "day";
    }
  };

  const chartData = getChartData();

  // Simplified period-aware stat values - using backend pre-calculated data
  const getPeriodTransactions = () => {
    switch (activeTab) {
      case "daily":
        return dashboardData.stats.transactions.count;
      case "weekly":
        return dashboardData.weeklyTransactions.length;
      case "monthly":
        return dashboardData.monthlyTransactions.length;
      default:
        return dashboardData.stats.transactions.count;
    }
  };

  const getPeriodSales = () => {
    switch (activeTab) {
      case "daily":
        return dashboardData.stats.sales.amount;
      case "weekly":
        return dashboardData.weeklySales[0]?.amount || 0;
      case "monthly":
        return dashboardData.monthlySales[0]?.amount || 0;
      default:
        return dashboardData.stats.sales.amount;
    }
  };

  const getPeriodStockIns = () => {
    switch (activeTab) {
      case "daily":
        return dashboardData.stats.stockIns.count;
      case "weekly":
        return dashboardData.weeklyStockIns.length;
      case "monthly":
        return dashboardData.monthlyStockIns.length;
      default:
        return dashboardData.stats.stockIns.count;
    }
  };

  const getPeriodSpoilage = () => {
    switch (activeTab) {
      case "daily":
        return dashboardData.stats.spoilage.count;
      case "weekly":
        return dashboardData.weeklySpoilage.length;
      case "monthly":
        return dashboardData.monthlySpoilage.length;
      default:
        return dashboardData.stats.spoilage.count;
    }
  };

  // Helper to get period label for change text
  const getPeriodLabel = () => {
    switch (activeTab) {
      case "daily":
        return "today";
      case "weekly":
        return "this week";
      case "monthly":
        return "this month";
      default:
        return "today";
    }
  };

  // Since backend doesn't provide change percentages, we'll show static or calculated changes
  // For now, using placeholder changes - you can implement real change calculation if needed
  const getPeriodTransactionChange = () => {
    // Placeholder - implement real change calculation based on historical data if needed
    return "+0%";
  };

  const getPeriodSalesChange = () => {
    // Placeholder - implement real change calculation based on historical data if needed
    return "+0%";
  };

  const getPeriodStockInChange = () => {
    // Placeholder - implement real change calculation based on historical data if needed
    return "+0%";
  };

  const getPeriodSpoilageChange = () => {
    // Placeholder - implement real change calculation based on historical data if needed
    return "+0%";
  };

  // Category and color configuration - matches backend categories
  const categoryConfig = {
    all: { label: "All", color: "bg-purple-500", icon: Flame },
    coffee: { label: "Coffee", color: "bg-amber-500", icon: Coffee },
    milktea: { label: "Milktea", color: "bg-violet-500", icon: Droplet },
    frappe: { label: "Frappe", color: "bg-blue-500", icon: Wind },
    choco: { label: "Choco", color: "bg-amber-900", icon: Heart },
    fruitTea: { label: "Fruit Tea", color: "bg-emerald-500", icon: Leaf },
  };

  // Get all products flattened and ranked
  const [selectedCategory, setSelectedCategory] = useState("all");

  const getAllRankedProducts = () => {
    const allProducts = [];

    if (selectedCategory === "all") {
      Object.entries(dashboardData.bestSelling).forEach(([key, products]) => {
        if (Array.isArray(products)) {
          products.forEach((product) => {
            allProducts.push({
              ...product,
              category: key,
              categoryLabel: categoryConfig[key]?.label || key,
            });
          });
        }
      });
    } else {
      const products = dashboardData.bestSelling[selectedCategory] || [];
      if (Array.isArray(products)) {
        products.forEach((product) => {
          allProducts.push({
            ...product,
            category: selectedCategory,
            categoryLabel:
              categoryConfig[selectedCategory]?.label || selectedCategory,
          });
        });
      }
    }

    return allProducts.sort((a, b) => (b.units || 0) - (a.units || 0));
  };

  const rankedProducts = getAllRankedProducts();

  // Best Seller Card Component
  const BestSellerCard = ({ product, rank }) => {
    const categoryColor =
      categoryConfig[product.category]?.color || "bg-gray-500";
    const categoryIcon = categoryConfig[product.category]?.icon;

    // Professional rank icons for top 3
    const getRankIcon = (rank) => {
      if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
      if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
      if (rank === 3) return <Zap className="w-5 h-5 text-orange-400" />;
      return null;
    };

    const rankIcon = getRankIcon(rank);

    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-gray-200 group cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          {/* Left - Rank Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-center">
              {rankIcon}
              <div className="text-xs font-bold text-gray-500 mt-0.5">
                #{rank}
              </div>
            </div>
          </div>

          {/* Middle - Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-purple-600 transition-colors mb-1">
              {product.name}
            </h3>
            {categoryIcon && (
              <div
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded text-white ${categoryColor}`}
              >
                {React.createElement(categoryIcon, { className: "w-3 h-3" })}
                {product.categoryLabel}
              </div>
            )}
          </div>

          {/* Right - Units Sold */}
          <div
            className={`${categoryColor} rounded-lg px-4 py-3 text-center text-white min-w-fit flex-shrink-0 flex flex-col items-center`}
          >
            <div className="font-bold text-lg">{product.units || 0}</div>
            <div className="text-xs opacity-90">sold</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6"> {/**Im the author */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Updated Stat Cards with Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={TrendingUp}
            title={`${
              getPeriodLabel().charAt(0).toUpperCase() +
              getPeriodLabel().slice(1)
            }'s Transactions`}
            value={getPeriodTransactions()}
            change={getPeriodTransactionChange()}
            color="bg-blue-500"
            periodLabel={getPeriodLabel()}
            navigateTo="/reports/transactions"
          />
          <StatCard
            icon={PhilippinePeso}
            title={`${
              getPeriodLabel().charAt(0).toUpperCase() +
              getPeriodLabel().slice(1)
            }'s Sales`}
            value={formatCurrency(getPeriodSales())}
            change={getPeriodSalesChange()}
            color="bg-green-500"
            periodLabel={getPeriodLabel()}
            navigateTo="/reports/sales"
          />
          <StatCard
            icon={Package}
            title={`Stock In ${getPeriodLabel()}`}
            value={getPeriodStockIns()}
            change={getPeriodStockInChange()}
            color="bg-purple-500"
            periodLabel={getPeriodLabel()}
            navigateTo="/inventory/stock-in"
          />
          <StatCard
            icon={AlertTriangle}
            title={`Spoiled ${getPeriodLabel()}`}
            value={getPeriodSpoilage()}
            change={getPeriodSpoilageChange()}
            color="bg-red-500"
            isNegative={true}
            periodLabel={getPeriodLabel()}
            navigateTo="/inventory/spoilages"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max lg:auto-rows-auto">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Sales Overview
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("daily")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "daily"
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "weekly"
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setActiveTab("monthly")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "monthly"
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">{getChartLabel()}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-12 h-3 bg-red-300 rounded"></div>
                <span>Amount of Money</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-gray-400">Loading chart data...</div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-gray-400">No sales data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorAmount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey={getXAxisKey()}
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `₱${value.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                    formatter={(value) => [
                      `₱${value.toLocaleString()}`,
                      "Sales",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Best Selling Products - Improved UI */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                Best Sellers
              </h2>
              <p className="text-xs text-gray-500">
                Our most popular drinks this month
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === "all"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Flame className="w-4 h-4" />
                All
              </button>
              {Object.entries(categoryConfig)
                .filter(([key]) => key !== "all")
                .map(([key, config]) => {
                  const IconComponent = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        selectedCategory === key
                          ? `${config.color} text-white`
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
            </div>

            {/* Products List - Fixed height matching chart */}
            <div className="h-80 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400 text-sm">
                    Loading products...
                  </div>
                </div>
              ) : rankedProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400 text-sm">
                    No products in this category
                  </div>
                </div>
              ) : (
                <>
                  {rankedProducts.map((product, index) => (
                    <BestSellerCard
                      key={`${product.name}-${index}`}
                      product={product}
                      rank={index + 1}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Summary Footer */}
            {!loading && rankedProducts.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="font-bold text-purple-600 text-sm">
                    {rankedProducts.length}
                  </div>
                  <div className="text-xs text-gray-500">Products</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600 text-sm">
                    {rankedProducts.reduce((sum, p) => sum + (p.units || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-500">Total Sales</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-500 text-sm">
                    {rankedProducts[0]?.name?.split(" ")[0]}
                  </div>
                  <div className="text-xs text-gray-500">Top Seller</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
