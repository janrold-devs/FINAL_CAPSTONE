import React from "react";

const SalesModal = ({ show, onClose, salesData }) => {
  if (!show || !salesData) return null;

  // Calculate statistics
  const getStats = () => {
    if (!salesData.transactions || !Array.isArray(salesData.transactions)) {
      return { totalItems: 0, uniqueProducts: 0 };
    }

    try {
      const totalItems = salesData.transactions.reduce(
        (sum, t) =>
          sum +
          (t.itemsSold || []).reduce((s, item) => s + (item.quantity || 0), 0),
        0
      );
      const uniqueProducts = new Set(
        salesData.transactions.flatMap((t) =>
          (t.itemsSold || []).map(
            (item) => item.product?._id || item.product || "unknown"
          )
        )
      ).size;

      return { totalItems, uniqueProducts };
    } catch (error) {
      console.error("Error calculating stats:", error);
      return { totalItems: 0, uniqueProducts: 0 };
    }
  };

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sales Batch Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Batch Number */}
          <div className="border-b pb-3">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Batch Number
            </label>
            <p className="text-lg font-medium">{salesData.batchNumber}</p>
          </div>

          {/* Date */}
          <div className="border-b pb-3">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Date & Time
            </label>
            <p className="text-lg">
              {new Date(salesData.transactionDate).toLocaleString()}
            </p>
          </div>

          {/* Statistics */}
          <div className="border-b pb-3">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Summary
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">
                  TOTAL ITEMS
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.totalItems}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600 font-medium mb-1">
                  UNIQUE PRODUCTS
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.uniqueProducts}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium mb-1">
                  TOTAL SALES
                </p>
                <p className="text-2xl font-bold text-green-700">
                  ₱{salesData.totalSales?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Sold */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Items Sold
            </label>
            {salesData.transactions &&
            salesData.transactions.length > 0 &&
            salesData.transactions.some((t) => t.itemsSold?.length > 0) ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product</th>
                      <th className="text-center py-2">Quantity</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.transactions.flatMap((t, tIndex) =>
                      (t.itemsSold || []).map((item, i) => (
                        <tr
                          key={`${tIndex}-${i}`}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2">
                            {item.product?.productName || (
                              <span className="text-gray-400 italic">
                                Deleted Product
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 font-medium">
                            {item.quantity}
                          </td>
                          <td className="text-right py-2 text-gray-600">
                            ₱{item.price?.toLocaleString()}
                          </td>
                          <td className="text-right py-2 font-semibold text-green-700">
                            ₱{item.totalCost?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No items sold</p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesModal;