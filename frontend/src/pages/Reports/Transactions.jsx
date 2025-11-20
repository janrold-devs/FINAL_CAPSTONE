import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Eye } from "lucide-react";
import TransactionModal from "../../components/modals/TransactionModal";
import DashboardLayout from "../../layouts/DashboardLayout";
import ExportButtons from "../../components/ExportButtons"

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/transactions");
        setTransactions(res.data);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <DashboardLayout> {/*todo: past transactions/sales must retain its value and cannot be changeable if the future user wants to change the product price*/}
    <div className="p-6 min-h-screen">
      {/**todo: Improve UI must be modern */}
      <h1 className="text-2xl font-bold mb-6">Transactions Report</h1>

        <ExportButtons data={transactions} fileName="Transactions" 
        columns={[
          {key: "transactionDate", label: "Date" },
          {key: "cashier.firstName", label: "Cashier" },
          {key: "modeOfPayment", label: "Payment" },
          {key: "referenceNumber", label: "Reference Number" },
          {key: "totalAmount", label: "Total Amount" },
        ]}
        />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No transactions found.</div>
      ) : (
        <table className="w-full border text-sm bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">Date</th>
              <th className="border px-4 py-2">Cashier</th>
              <th className="border px-4 py-2">Payment</th>
              <th className="border px-4 py-2">Reference #</th>
              <th className="border px-4 py-2">Total</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id}>
                <td className="border px-4 py-2">
                  {new Date(t.transactionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                </td>
                <td className="border px-4 py-2">
                  {t.cashier
                    ? `${t.cashier.firstName} ${t.cashier.lastName}`
                    : "Unknown"}
                </td>
                <td className="border px-4 py-2">{t.modeOfPayment}</td>
                <td className="border px-4 py-2">{t.referenceNumber || "—"}</td>
                <td className="border px-4 py-2 font-bold">
                  ₱{t.totalAmount?.toFixed(2)}
                </td>
                <td className="border px-4 py-2 text-center">
                  <button
                    className="text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                    onClick={() => setSelected(t)}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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