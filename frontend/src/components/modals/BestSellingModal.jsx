// /mnt/data/BestSellingModal.jsx
import React, { useEffect, useCallback } from "react";
import { X, TrendingUp, Package, BarChart3 } from "lucide-react";

/**
 * BestSellingModal
 *
 * - Removed Size and Price columns from the table as requested.
 * - Added safe default for onClose to avoid runtime errors if not provided.
 * - Added backdrop click and Escape key handling to reliably close the modal.
 *
 * Note: Kept other logic exactly as-is where not related to closing/session concerns.
 */

const BestSellingModal = ({
  show,
  onClose = () => {},
  data,
  loading,
  period,
}) => {
  // If no show, nothing renders.
  if (!show) return null;

  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toLocaleString()}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      default:
        return "This Month";
    }
  };

  // Get default size and price from sizes array (kept for backward compatibility)
  const getProductSizeAndPrice = (product) => {
    if (!product) return { size: null, price: 0 };

    if (product.size && product.price) {
      return {
        size: product.size,
        price: product.price,
      };
    }

    if (
      product.sizes &&
      Array.isArray(product.sizes) &&
      product.sizes.length > 0
    ) {
      const firstSize = product.sizes[0];
      return {
        size: firstSize.size,
        price: firstSize.price,
      };
    }

    return { size: null, price: 0 };
  };

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Compute max unitsSold once to avoid recomputing in each row
  const maxUnitsSold =
    data && data.products && data.products.length > 0
      ? Math.max(...data.products.map((p) => p.unitsSold || 0))
      : 0;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50"
      // Close when clicking on backdrop (only when clicking the overlay itself)
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Best Selling Products
              </h2>
              <p className="text-gray-600">
                Top performing products for {getPeriodLabel()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
          >
            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !data || !data.products || data.products.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                No sales data available
              </p>
              <p className="text-gray-600">
                No product sales data found for the selected period.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total Products Sold
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {data.products.reduce(
                          (sum, product) => sum + (product.unitsSold || 0),
                          0
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Unique Products
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {data.products.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Product Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Sold
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.products.map((product, index) => {
                        const { size, price } = getProductSizeAndPrice(product);

                        // Compute progress width safely
                        const progressWidth =
                          maxUnitsSold > 0
                            ? Math.min(
                                ((product.unitsSold || 0) / maxUnitsSold) * 100,
                                100
                              )
                            : 0;

                        return (
                          <tr
                            key={product._id || index}
                            className="hover:bg-gray-50 transition-colors duration-150 group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    index === 0
                                      ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                      : index === 1
                                      ? "bg-gray-100 text-gray-800 border border-gray-200"
                                      : index === 2
                                      ? "bg-orange-100 text-orange-800 border border-orange-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                  }`}
                                >
                                  <span className="text-sm font-bold">
                                    {index + 1}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {product.productName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                {product.category}
                              </span>
                            </td>

                            {/* Units Sold */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-bold text-blue-600">
                                  {product.unitsSold || 0}
                                </div>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progressWidth}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            {/* Total Amount */}
                            <td className="px-6 py-4">
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(product.totalAmount || 0)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestSellingModal;
