// components/modals/SalesModal.jsx
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
            (item) => item.snapshot?.productName || "unknown"
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

  // Function to calculate base product price without add-ons
  const calculateBasePrice = (item) => {
    const snapshot = item.snapshot;
    const addonsTotal =
      snapshot?.addons?.reduce(
        (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1),
        0
      ) || 0;

    return (snapshot?.basePrice || item.price) - addonsTotal;
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
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

          {/* Items Sold with Add-ons */}
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
                      <th className="text-left py-2">Category</th>
                      <th className="text-left py-2">Size</th>
                      <th className="text-left py-2">Add-ons</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.transactions.flatMap((t, tIndex) =>
                      (t.itemsSold || []).map((item, i) => {
                        // Use snapshot data instead of populated product
                        const snapshot = item.snapshot;
                        const basePrice = calculateBasePrice(item);

                        return (
                          <React.Fragment key={`${tIndex}-${i}`}>
                            {/* Main Product Row */}
                            <tr className="border-b last:border-b-0">
                              <td className="py-2">
                                <div className="text-gray-800 font-medium">
                                  {snapshot?.productName || (
                                    <span className="text-gray-400 italic">
                                      Deleted Product
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 text-gray-600">
                                {snapshot?.category || "—"}
                              </td>
                              <td className="py-2 text-gray-600">
                                {snapshot?.size ? `${snapshot.size} oz` : "—"}
                              </td>
                              <td className="py-2 text-gray-600">
                                {snapshot?.addons &&
                                snapshot.addons.length > 0 ? (
                                  <span className="text-blue-600 text-xs">
                                    {snapshot.addons.length} add-on(s)
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="text-center py-2 text-gray-800 font-medium">
                                {item.quantity}
                              </td>
                              <td className="text-right py-2 text-gray-600">
                                ₱{basePrice.toFixed(2)}
                              </td>
                              <td className="text-right py-2 font-semibold text-green-700">
                                ₱{item.totalCost?.toFixed(2)}
                              </td>
                            </tr>

                            {/* Add-ons Rows - Use snapshot addons */}
                            {snapshot?.addons?.map((addon, addonIdx) => (
                              <tr
                                key={`${tIndex}-${i}-${addonIdx}`}
                                className="bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <td className="py-1 pl-4">
                                  <div className="text-gray-600 text-xs flex items-center">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                    {addon.addonName || "Add-on"}
                                  </div>
                                </td>
                                <td className="py-1 text-gray-500 text-xs">
                                  Add-on
                                </td>
                                <td className="py-1 text-gray-500 text-xs">
                                  —
                                </td>
                                <td className="py-1 text-gray-500 text-xs">
                                  <div className="text-xs">Extra</div>
                                </td>
                                <td className="py-1 text-center text-gray-600 text-xs font-medium">
                                  {addon.quantity || 1}
                                </td>
                                <td className="py-1 text-right text-gray-500 text-xs">
                                  ₱{addon.price?.toFixed(2) || "0.00"}
                                </td>
                                <td className="py-1 text-right text-gray-600 text-xs font-medium">
                                  ₱
                                  {(
                                    (addon.price || 0) * (addon.quantity || 1)
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No items sold</p>
            )}
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
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
