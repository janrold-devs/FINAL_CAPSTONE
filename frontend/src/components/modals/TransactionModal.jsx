import React from "react";
import { X } from "lucide-react";

const TransactionModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          onClick={onClose}
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Transaction Details
        </h2>

        <div className="space-y-2 mb-4">
          <div>
            <span className="font-semibold text-gray-700">Date:</span>{" "}
            <span className="text-gray-600">
              {new Date(transaction.transactionDate).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Cashier:</span>{" "}
            <span className="text-gray-600">
              {transaction.cashier
                ? `${transaction.cashier.firstName} ${transaction.cashier.lastName}`
                : "Unknown"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Payment:</span>{" "}
            <span className="text-gray-600">{transaction.modeOfPayment}</span>
          </div>
          {transaction.referenceNumber && (
            <div>
              <span className="font-semibold text-gray-700">Reference #:</span>{" "}
              <span className="text-gray-600">
                {transaction.referenceNumber}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2 text-gray-800">Items Sold</h3>
          <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Size
                  </th>
                  <th className="text-left py-2 font-semibold text-gray-700">
                    Add-ons
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Qty
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Price
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {transaction.itemsSold.map((item, idx) => {
                  // Use snapshot data instead of populated product
                  const snapshot = item.snapshot;
                  const baseProductPrice = snapshot?.basePrice || item.price;

                  return (
                    <React.Fragment key={idx}>
                      {/* Main Product Row */}
                      <tr className="border-b border-gray-200">
                        <td className="py-2">
                          <div className="text-gray-800 font-medium">
                            {snapshot?.productName || "Unknown Product"}
                          </div>
                        </td>
                        <td className="py-2 text-gray-600">
                          {snapshot?.category || "—"}
                        </td>
                        <td className="py-2 text-gray-600">
                          {snapshot?.size ? `${snapshot.size} oz` : "—"}
                        </td>
                        <td className="py-2 text-gray-600">
                          {/* Show add-ons count from snapshot */}
                          {snapshot?.addons && snapshot.addons.length > 0 ? (
                            <span className="text-blue-600 text-xs">
                              {snapshot.addons.length} add-on(s)
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-800 font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right text-gray-600">
                          ₱{baseProductPrice.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-800">
                          ₱{item.totalCost?.toFixed(2)}
                        </td>
                      </tr>

                      {/* Add-ons Rows - Use snapshot addons */}
                      {snapshot?.addons?.map((addon, addonIdx) => (
                        <tr
                          key={`${idx}-${addonIdx}`}
                          className="bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <td className="py-1 pl-4">
                            <div className="text-gray-600 text-xs flex items-center">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                              {addon.addonName || "Add-on"}
                            </div>
                          </td>
                          <td className="py-1 text-gray-500 text-xs">Add-on</td>
                          <td className="py-1 text-gray-500 text-xs">—</td>
                          <td className="py-1 text-gray-500 text-xs">
                            <div className="text-xs">Extra</div>
                          </td>
                          <td className="py-1 text-right text-gray-600 text-xs font-medium">
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
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total moved to bottom */}
        <div className="border-t border-gray-200 mt-6 pt-4 flex justify-end">
          <div className="text-right">
            <div className="text-sm text-gray-700 font-semibold">
              Total Amount
            </div>
            <div className="text-xl font-bold text-blue-700">
              ₱{transaction.totalAmount?.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
