import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Search, Calendar } from "lucide-react";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Fetch logs and users
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/activitylogs");
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/users");
      setUsers(res.data);
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  // Simplified action options
  const actionOptions = ["Create", "Update", "Delete"];

  // Helper function to categorize action
  const getCategoryFromAction = (action) => {
    if (!action) return null;
    const upper = action.toUpperCase();
    if (upper.includes("CREATE") || upper.includes("ADD")) return "Create";
    if (upper.includes("UPDATE") || upper.includes("EDIT")) return "Update";
    if (upper.includes("DELETE") || upper.includes("REMOVE")) return "Delete";
    return null;
  };

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    // Search filter
    const matchesSearch = log.details?.toLowerCase().includes(search.toLowerCase());

    // User filter
    let matchesUser = true;
    if (selectedUser !== "all") {
      const logUserId =
        typeof log.user === "object"
          ? log.user._id
          : typeof log.user === "string"
          ? log.user
          : "";
      matchesUser = logUserId === selectedUser;
    }

    // Action filter - simplified
    let matchesAction = true;
    if (selectedAction !== "all") {
      const logCategory = getCategoryFromAction(log.action);
      matchesAction = logCategory === selectedAction;
    }

    // Date range filter
    let matchesDate = true;
    if (dateRange.from) {
      matchesDate = new Date(log.createdAt) >= new Date(dateRange.from);
    }
    if (matchesDate && dateRange.to) {
      // Add 1 day to include the end date
      const toDate = new Date(dateRange.to);
      toDate.setDate(toDate.getDate() + 1);
      matchesDate = new Date(log.createdAt) < toDate;
    }

    return matchesSearch && matchesUser && matchesAction && matchesDate;
  });

  return (
    <DashboardLayout>{/**todo: Remove the status */}
    {/**todo: Improve UI must be modern */}
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
          <button
            onClick={fetchLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by details"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-60"
            />
          </div>
          {/* Users */}
          <select
            className="border border-gray-300 text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          {/* Actions - Simplified */}
          <select
            className="border border-gray-300 text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="all">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          {/* Date Range */}
          <div className="flex items-center gap-2 border border-gray-300 text-sm rounded-md px-3 py-2 bg-white">
            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className="outline-none"
            />
            <span className="mx-1 text-gray-400">-</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  // User name logic
                  const userName =
                    log.user?.firstName && log.user?.lastName
                      ? `${log.user.firstName} ${log.user.lastName}`
                      : log.user?.name
                      ? log.user.name
                      : "Unknown User";

                  // Custom details for Stock In
                  let details = log.details;
                  if (
                    log.action?.toUpperCase().includes("STOCK") &&
                    log.details?.includes("Batch")
                  ) {
                    // Try to extract batch number from details
                    const batchMatch = log.details.match(
                      /Batch\s+([A-Z0-9\-]+)/i
                    );
                    const batchNumber = batchMatch ? batchMatch[1] : "";
                    details = `Stock In: Batch ${batchNumber} by ${userName}`;
                  }

                  return (
                    <tr
                      key={log._id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                          {userName.charAt(0)}
                        </div>
                        {userName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            log.action.includes("CREATE") || log.action.includes("ADD")
                              ? "text-green-600"
                              : log.action.includes("DELETE") || log.action.includes("REMOVE")
                              ? "text-red-600"
                              : log.action.includes("UPDATE") || log.action.includes("EDIT")
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        >
                          {log.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{details}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          Success
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end items-center mt-4 text-sm text-gray-600">
          <span>Page 1 of 1</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Logs;