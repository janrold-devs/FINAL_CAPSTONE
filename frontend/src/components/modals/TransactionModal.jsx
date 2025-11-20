import React from "react";
import { X } from "lucide-react";

const TransactionModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      {/**todo: total amount should be at the bottom*/}
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          onClick={onClose}
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-800">Transaction Details</h2>

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
              <span className="text-gray-600">{transaction.referenceNumber}</span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-700">Total Amount:</span>{" "}
            <span className="font-bold text-blue-700 text-lg">
              ₱{transaction.totalAmount?.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2 text-gray-800">Items Sold</h3>
          <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Product</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Size</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Subcat</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Price</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {transaction.itemsSold.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                    <td className="py-2">
                      <div className="text-gray-800">
                        {item.product?.productName || "Unknown"}
                      </div>
                      {/* Show add-ons if any */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          Add-ons:{" "}
                          {item.addons
                            .map((val) => {
                              if (val === "espresso") return "Espresso Shot";
                              if (val === "pearls") return "Pearls";
                              if (val === "crystals") return "Crystals";
                              if (val === "creamPuff") return "Cream Puff";
                              return val;
                            })
                            .join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{item.category || "—"}</td>
                    <td className="py-2 text-gray-600">{item.size || "—"}</td>
                    <td className="py-2 text-gray-600">{item.subcategory || "—"}</td>
                    <td className="py-2 text-right text-gray-800">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">
                      ₱{item.price?.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-800">
                      ₱{item.totalCost?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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