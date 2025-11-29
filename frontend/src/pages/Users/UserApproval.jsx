// pages/Users/UserApproval.jsx
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  UserCheck,
  UserX,
  Clock,
  Mail,
  Calendar,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

const UserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const token = localStorage.getItem("token");

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/pending-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch pending users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    try {
      setApproving(userId);
      const payload = {};
      if (tempPassword.trim()) {
        payload.password = tempPassword;
      }

      const res = await axios.put(`/admin/approve-user/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.emailSent) {
        toast.success("User approved and credentials email sent successfully!");
      } else {
        toast.warning("User approved but email failed to send.");
      }

      setTempPassword("");
      setShowPassword(false);
      fetchPendingUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve user");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (userId) => {
    try {
      setRejecting(userId);
      const payload = { reason: rejectReason };

      const res = await axios.put(`/admin/reject-user/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.emailSent) {
        toast.success("User rejected and notification email sent!");
      } else {
        toast.warning("User rejected but email failed to send.");
      }

      setRejectReason("");
      fetchPendingUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject user");
    } finally {
      setRejecting(null);
    }
  };

  const generateRandomPassword = () => {
    const password = Math.random().toString(36).slice(-8);
    setTempPassword(password);
  };

  const getTimeSince = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <DashboardLayout>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <div className="space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              User Approval
            </h1>
            <p className="text-gray-600">
              Review and approve pending user registrations
            </p>
          </div>
          <div className="flex gap-3 mt-4 lg:mt-0">
            <button
              onClick={fetchPendingUsers}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Pending Approvals</p>
              <p className="text-3xl font-bold mt-1">{pendingUsers.length}</p>
              <p className="text-sm opacity-90 mt-2">
                Users waiting for account approval
              </p>
            </div>
          </div>
        </div>

        {/* Pending Users List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              No Pending Approvals
            </p>
            <p className="text-gray-600">
              All user registration requests have been processed.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {pendingUsers.map((user) => (
              <div
                key={user._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* User Info */}
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Username:</span>
                          <span>{user.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Registered {getTimeSince(user.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Role:</span>
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approval Actions */}
                  <div className="flex flex-col gap-3 mt-4 lg:mt-0 lg:ml-6">
                    {/* Password Input for Approval */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Set temporary password"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={generateRandomPassword}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap"
                      >
                        Generate
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user._id)}
                        disabled={approving === user._id}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex-1 justify-center disabled:opacity-50"
                      >
                        {approving === user._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejecting(user._id);
                          setRejectReason("");
                        }}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reject Reason Modal */}
                {rejecting === user._id && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Reason for rejection (optional):
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows="2"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleReject(user._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => setRejecting(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserApproval;