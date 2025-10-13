import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from '../../api/axios';
import DashboardLayout from '../../layouts/DashboardLayout';

const Home = () => {
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      transactions: { count: 0, change: '0%' },
      sales: { amount: 0, change: '0%' },
      stockIns: { count: 0, change: '0%' },
      spoilage: { count: 0, change: '0%' }
    },
    dailySales: [],
    weeklySales: [],
    monthlySales: [],
    bestSelling: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching dashboard data...');
      const response = await axios.get('/dashboard/stats');
      console.log('Dashboard data received:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color, isNegative }) => {
    const changeColor = isNegative 
      ? (change.includes('+') || change.includes('-') ? 'text-red-600' : 'text-green-600')
      : (change.includes('-') ? 'text-red-600' : 'text-green-600');

    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className={`text-sm font-medium ${changeColor}`}>{change} this month</span>
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-1">
          {loading ? '...' : value}
        </h3>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get the appropriate data based on active tab
  const getChartData = () => {
    switch (activeTab) {
      case 'daily':
        return dashboardData.dailySales;
      case 'weekly':
        return dashboardData.weeklySales;
      case 'monthly':
        return dashboardData.monthlySales;
      default:
        return dashboardData.weeklySales;
    }
  };

  const getChartLabel = () => {
    switch (activeTab) {
      case 'daily':
        return 'Daily Sales';
      case 'weekly':
        return 'Weekly Sales';
      case 'monthly':
        return 'Monthly Sales';
      default:
        return 'Weekly Sales';
    }
  };

  const getXAxisKey = () => {
    switch (activeTab) {
      case 'daily':
        return 'date';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      default:
        return 'week';
    }
  };

  const chartData = getChartData();

  return (
    <DashboardLayout>
      <div className="p-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={TrendingUp}
            title="Product Transaction"
            value={dashboardData.stats.transactions.count}
            change={dashboardData.stats.transactions.change}
            color="bg-blue-500"
          />
          <StatCard
            icon={DollarSign}
            title="Sales"
            value={formatCurrency(dashboardData.stats.sales.amount)}
            change={dashboardData.stats.sales.change}
            color="bg-green-500"
          />
          <StatCard
            icon={Package}
            title="Number of Stock In"
            value={dashboardData.stats.stockIns.count}
            change={dashboardData.stats.stockIns.change}
            color="bg-purple-500"
          />
          <StatCard
            icon={AlertTriangle}
            title="Spoiled & Damaged Ingredients"
            value={dashboardData.stats.spoilage.count}
            change={dashboardData.stats.spoilage.change}
            color="bg-red-500"
            isNegative={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Sales Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'daily'
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'weekly'
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'monthly'
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-500 hover:text-gray-800'
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
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey={getXAxisKey()}
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₱${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    formatter={(value) => [`₱${value.toLocaleString()}`, 'Sales']}
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

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Best Selling Products</h2>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading products...</div>
              </div>
            ) : dashboardData.bestSelling.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">No product sales data available</div>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dashboardData.bestSelling.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700 font-medium">{product.name}</span>
                    <span className="text-gray-900 font-semibold">{product.units} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;