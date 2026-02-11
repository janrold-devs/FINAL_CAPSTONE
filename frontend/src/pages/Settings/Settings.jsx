import React, { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../api/axios";
import { Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasNumbers: false,
    hasSpecialChar: false,
  });

  const [currentPasswordValidation, setCurrentPasswordValidation] = useState({
    status: null, // null, 'validating', 'correct', 'incorrect'
    message: "",
  });

  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState({
    status: null, // null, 'empty', 'mismatch', 'match'
    message: "",
  });

  // Debounce timer for current password validation
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Password validation criteria
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password,
    );

    setPasswordValidation({
      minLength,
      hasNumbers,
      hasSpecialChar,
    });

    return minLength && hasNumbers && hasSpecialChar;
  };

  const isPasswordValid =
    passwordData.newPassword.length > 0 &&
    passwordValidation.minLength &&
    passwordValidation.hasNumbers &&
    passwordValidation.hasSpecialChar;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const response = await api.get(`/users/${decoded.id}`);
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load user profile", {
        position: "top-right",
        autoClose: 3000,
      });
      setLoading(false);
    }
  };

  // Validate current password against the backend
  const validateCurrentPassword = async (passwordValue) => {
    if (!passwordValue) {
      setCurrentPasswordValidation({
        status: null,
        message: "",
      });
      return;
    }

    try {
      setCurrentPasswordValidation({
        status: "validating",
        message: "Verifying...",
      });

      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));

      // Call backend to verify current password
      const response = await api.post(`/users/verify-password/${decoded.id}`, {
        password: passwordValue,
      });

      if (response.data.isCorrect) {
        setCurrentPasswordValidation({
          status: "correct",
          message: "Current password is correct",
        });
      } else {
        setCurrentPasswordValidation({
          status: "incorrect",
          message: "Current password is incorrect",
        });
      }
    } catch (err) {
      setCurrentPasswordValidation({
        status: "incorrect",
        message: "Current password is incorrect",
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate password as user types (only for new password)
    if (name === "newPassword") {
      validatePassword(value);
    }

    // Validate confirm password in real-time
    if (name === "confirmPassword") {
      if (!value) {
        setConfirmPasswordValidation({
          status: "empty",
          message: "Confirm password is required",
        });
      } else if (value === passwordData.newPassword) {
        setConfirmPasswordValidation({
          status: "match",
          message: "Passwords match",
        });
      } else {
        setConfirmPasswordValidation({
          status: "mismatch",
          message: "Passwords do not match",
        });
      }
    }

    // Also validate confirm password when new password changes
    if (name === "newPassword" && passwordData.confirmPassword) {
      if (value === passwordData.confirmPassword) {
        setConfirmPasswordValidation({
          status: "match",
          message: "Passwords match",
        });
      } else {
        setConfirmPasswordValidation({
          status: "mismatch",
          message: "Passwords do not match",
        });
      }
    }

    // Debounced validation for current password
    if (name === "currentPassword") {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (!value) {
        setCurrentPasswordValidation({
          status: null,
          message: "",
        });
        return;
      }

      const timer = setTimeout(() => {
        validateCurrentPassword(value);
      }, 500); // 500ms debounce delay

      setDebounceTimer(timer);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangePassword = async () => {
    try {
      // Validate that current password is provided
      if (!passwordData.currentPassword) {
        toast.error("Please enter your current password", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      // Validate that current password has been verified as correct
      if (currentPasswordValidation.status !== "correct") {
        toast.error("Please verify that your current password is correct", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      // Validate new password meets all requirements
      if (!isPasswordValid) {
        toast.error("Password must meet all requirements", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("New passwords do not match", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));

      await api.put(`/users/${decoded.id}`, {
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setCurrentPasswordValidation({
        status: null,
        message: "",
      });

      setConfirmPasswordValidation({
        status: null,
        message: "",
      });

      setPasswordValidation({
        minLength: false,
        hasNumbers: false,
        hasSpecialChar: false,
      });

      toast.success("Password changed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleCancel = () => {
    if (activeTab === "password") {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setCurrentPasswordValidation({
        status: null,
        message: "",
      });
      setConfirmPasswordValidation({
        status: null,
        message: "",
      });
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Account Settings
            </h1>
            <p className="text-gray-500 mt-2">
              Manage your account preferences and security
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                  activeTab === "profile"
                    ? "text-[#E89271] bg-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Profile Details
                {activeTab === "profile" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E89271]"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                  activeTab === "password"
                    ? "text-[#E89271] bg-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Change Password
                {activeTab === "password" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E89271]"></div>
                )}
              </button>
            </div>

            {/* Content */}
            {/* Profile Tab - Updated to read-only display */}
            {activeTab === "profile" && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Profile Information
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      View your account details
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">
                            First Name
                          </div>
                          <div className="flex-1 text-gray-900">
                            {user?.firstName || "N/A"}
                          </div>
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">
                            Last Name
                          </div>
                          <div className="flex-1 text-gray-900">
                            {user?.lastName || "N/A"}
                          </div>
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">
                            Email
                          </div>
                          <div className="flex-1 text-gray-900">
                            {user?.email || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Removed action buttons since profile is not editable */}
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === "password" && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#E89271]/10 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#E89271]" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Security
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500">
                      Update your password to keep your account secure
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={
                            showPasswords.currentPassword ? "text" : "password"
                          }
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          data-no-uppercase
                          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                            currentPasswordValidation.status === "correct"
                              ? "border-green-300 focus:ring-green-400"
                              : currentPasswordValidation.status === "incorrect"
                                ? "border-red-300 focus:ring-red-400"
                                : currentPasswordValidation.status ===
                                    "validating"
                                  ? "border-yellow-300 focus:ring-yellow-400"
                                  : "border-gray-300 focus:ring-[#E89271]"
                          }`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility("currentPassword")
                          }
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.currentPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        {currentPasswordValidation.status && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {currentPasswordValidation.status === "correct" && (
                              <Check className="w-5 h-5 text-green-600" />
                            )}
                            {currentPasswordValidation.status ===
                              "incorrect" && (
                              <X className="w-5 h-5 text-red-600" />
                            )}
                            {currentPasswordValidation.status ===
                              "validating" && (
                              <div className="w-5 h-5 border-2 border-yellow-400 border-t-yellow-600 rounded-full animate-spin" />
                            )}
                          </div>
                        )}
                      </div>
                      {currentPasswordValidation.message && (
                        <div
                          className={`mt-2 text-sm flex items-center gap-2 ${
                            currentPasswordValidation.status === "correct"
                              ? "text-green-700"
                              : currentPasswordValidation.status === "incorrect"
                                ? "text-red-700"
                                : "text-yellow-700"
                          }`}
                        >
                          {currentPasswordValidation.status === "correct" && (
                            <Check className="w-4 h-4" />
                          )}
                          {currentPasswordValidation.status === "incorrect" && (
                            <X className="w-4 h-4" />
                          )}
                          {currentPasswordValidation.message}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.newPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          data-no-uppercase
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-all"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility("newPassword")
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.newPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Password Requirements Checklist */}
                      {passwordData.newPassword.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Password Requirements
                          </p>

                          <div className="space-y-2">
                            {/* Minimum Length Requirement */}
                            <div className="flex items-center gap-2 text-sm">
                              {passwordValidation.minLength ? (
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                              )}
                              <span
                                className={
                                  passwordValidation.minLength
                                    ? "text-green-700 font-medium"
                                    : "text-red-700"
                                }
                              >
                                At least 8 characters (
                                {passwordData.newPassword.length}/8)
                              </span>
                            </div>

                            {/* Numbers Requirement */}
                            <div className="flex items-center gap-2 text-sm">
                              {passwordValidation.hasNumbers ? (
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                              )}
                              <span
                                className={
                                  passwordValidation.hasNumbers
                                    ? "text-green-700 font-medium"
                                    : "text-red-700"
                                }
                              >
                                Includes at least one number (0–9)
                              </span>
                            </div>

                            {/* Special Characters Requirement */}
                            <div className="flex items-center gap-2 text-sm">
                              {passwordValidation.hasSpecialChar ? (
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                              )}
                              <span
                                className={
                                  passwordValidation.hasSpecialChar
                                    ? "text-green-700 font-medium"
                                    : "text-red-700"
                                }
                              >
                                Includes special character (!@#$%^&*)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={
                            showPasswords.confirmPassword ? "text" : "password"
                          }
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          data-no-uppercase
                          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                            confirmPasswordValidation.status === "match"
                              ? "border-green-300 focus:ring-green-400"
                              : confirmPasswordValidation.status ===
                                    "mismatch" ||
                                  confirmPasswordValidation.status === "empty"
                                ? "border-red-300 focus:ring-red-400"
                                : "border-gray-300 focus:ring-[#E89271]"
                          }`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility("confirmPassword")
                          }
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        {confirmPasswordValidation.status && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {confirmPasswordValidation.status === "match" && (
                              <Check className="w-5 h-5 text-green-600" />
                            )}
                            {(confirmPasswordValidation.status === "mismatch" ||
                              confirmPasswordValidation.status === "empty") && (
                              <X className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                      {confirmPasswordValidation.message && (
                        <div
                          className={`mt-2 text-sm flex items-center gap-2 ${
                            confirmPasswordValidation.status === "match"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {confirmPasswordValidation.status === "match" && (
                            <Check className="w-4 h-4" />
                          )}
                          {(confirmPasswordValidation.status === "mismatch" ||
                            confirmPasswordValidation.status === "empty") && (
                            <X className="w-4 h-4" />
                          )}
                          {confirmPasswordValidation.message}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                      <button
                        onClick={handleCancel}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={
                          !passwordData.currentPassword ||
                          currentPasswordValidation.status !== "correct" ||
                          !isPasswordValid ||
                          confirmPasswordValidation.status !== "match"
                        }
                        className={`px-6 py-2.5 font-medium rounded-lg shadow-sm transition-colors ${
                          passwordData.currentPassword &&
                          currentPasswordValidation.status === "correct" &&
                          isPasswordValid &&
                          confirmPasswordValidation.status === "match"
                            ? "bg-[#E89271] text-white hover:bg-[#ed9e7f] cursor-pointer"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
