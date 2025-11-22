import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Eye, Plus, Receipt } from "lucide-react";
import TransactionModal from "../../components/modals/TransactionModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import ExportButtons from "../../components/ExportButtons";
import SearchFilter from "../../components/SearchFilter";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/transactions");
        setTransactions(res.data);
        setFilteredTransactions(res.data);
      } catch {
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter configuration for transactions
  const transactionFilterConfig = [
    {
      key: "modeOfPayment",
      label: "Payment Method",
      options: [
        { value: "cash", label: "Cash" },
        { value: "gcash", label: "Gcash" },
      ],
    },
    {
      key: "cashier._id",
      label: "Cashier",
      options: [], // This will be populated dynamically from transactions
    },
  ];

  // Get unique cashiers from transactions
  const getUniqueCashiers = () => {
    const cashiers = transactions
      .filter((t) => t.cashier)
      .map((t) => ({
        value: t.cashier._id,
        label: `${t.cashier.firstName} ${t.cashier.lastName}`,
      }));

    // Remove duplicates
    return Array.from(
      new Map(cashiers.map((item) => [item.value, item])).values()
    );
  };

  // Update cashier options when transactions load
  useEffect(() => {
    if (transactions.length > 0) {
      const cashierOptions = getUniqueCashiers();
      transactionFilterConfig[1].options = cashierOptions;
    }
  }, [transactions]);

  // Sort configuration for transactions
  const transactionSortConfig = [
    { key: "totalAmount", label: "Total Amount" },
    { key: "modeOfPayment", label: "Payment Method" },
  ];

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get payment method color
  const getPaymentColor = (method) => {
    switch (method?.toLowerCase()) {
      case "cash":
        return "bg-green-100 text-green-800 border-green-200";
      case "gcash":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get amount color based on value
  const getAmountColor = (amount) => {
    if (amount > 1000) return "text-green-600";
    if (amount > 500) return "text-blue-600";
    return "text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Transaction Records
            </h1>
            <p className="text-gray-600">
              View and manage all sales transactions
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div>
          <ExportButtons
            data={filteredTransactions || transactions}
            fileName="Transactions"
            columns={[
              { key: "transactionDate", label: "Date" },
              { key: "cashier.firstName", label: "Cashier" },
              { key: "modeOfPayment", label: "Payment" },
              { key: "referenceNumber", label: "Reference Number" },
              { key: "totalAmount", label: "Total Amount" },
            ]}
          />
        </div>

        {/* Search & Filter Section with Date Picker */}
        <SearchFilter
          data={transactions}
          onFilteredDataChange={setFilteredTransactions}
          searchFields={[
            "cashier.firstName",
            "cashier.lastName",
            "referenceNumber",
            "modeOfPayment",
          ]}
          filterConfig={transactionFilterConfig}
          sortConfig={transactionSortConfig}
          placeholder="Search by cashier name, reference number, or payment method..."
          dateField="transactionDate"
          enableDateFilter={true}
        />

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Cashier
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Reference #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t) => (
                      <tr
                        key={t._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(t.transactionDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(t.transactionDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-sm font-medium">
                                {t.cashier?.firstName?.charAt(0) || "U"}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {t.cashier
                                  ? `${t.cashier.firstName} ${t.cashier.lastName}`
                                  : "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                Cashier
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPaymentColor(
                              t.modeOfPayment
                            )}`}
                          >
                            {t.modeOfPayment}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 font-mono">
                            {t.referenceNumber ? (
                              <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {t.referenceNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`text-lg font-bold ${getAmountColor(
                              t.totalAmount
                            )}`}
                          >
                            ₱{t.totalAmount?.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                            onClick={() => setSelected(t)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Receipt className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-2">
                              No transactions found
                            </p>
                            <p className="text-gray-600">
                              Try adjusting your search or date filters
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        <TransactionModal
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
