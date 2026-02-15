import React, { useEffect, useState, useContext } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UserModal from "../../components/modals/UserModal";
import AlertDialog from "../../components/AlertDialog";
import SearchFilter from "../../components/SearchFilter";
import { AuthContext } from "../../context/AuthContext"; // Import AuthContext
import {
  Pencil,
  UserX,
  Plus,
  Users,
  Shield,
  UserCheck,
  Ban,
  RefreshCw,
} from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formUser, setFormUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    role: "staff",
  });

  const token = localStorage.getItem("token");
  const { user: currentUser } = useContext(AuthContext); // Get current user from context

  // Fetch all users with better error handling
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter out the current logged-in user and other admins from the list
      const filteredUsersList = res.data.filter(user => {
        // Hide current user
        if (currentUser?._id && user._id === currentUser._id) return false;
        // Hide other admins
        if (user.role === 'admin') return false;
        return true;
      });

      // Sort users: active users first, then deactivated users
      const sortedUsers = filteredUsersList.sort((a, b) => {
        const aActive = a.isActive !== false;
        const bActive = b.isActive !== false;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return 0;
      });

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
    } catch (err) {
      if (err.response?.status === 403) {
        // If user is deactivated, log them out
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        toast.error("Your account has been deactivated.");
      } else {
        toast.error(err.response?.data?.message || "Failed to fetch users");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open modal for adding new user
  const handleAddClick = () => {
    setFormUser({
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      role: "staff",
    });
    setIsEdit(false);
    setShowModal(true);
  };

  // Open modal for editing user
  const handleEditClick = (user) => {
    // Prevent editing current user (additional safety check)
    if (currentUser?._id && user._id === currentUser._id) {
      toast.error("Cannot edit your own account from this page");
      return;
    }

    setFormUser({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      password: "", // Don't pre-fill password for security
      role: user.role || "staff",
    });
    setSelectedUser(user);
    setIsEdit(true);
    setShowModal(true);
  };

  // Handle form submit (add or edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      if (isEdit) {
        // Additional safety: prevent editing current user
        if (currentUser?._id && selectedUser?._id === currentUser._id) {
          toast.error("Cannot edit your own account from this page");
          setShowModal(false);
          return;
        }

        // Update existing user
        const updateData = { ...formUser };
        if (!updateData.password || updateData.password.trim() === "") {
          delete updateData.password; // Don't send empty password
        }

        await axios.put(`/users/${selectedUser._id}`, updateData, config);
        toast.success("User updated successfully");
      } else {
        // Add new user - validation
        if (
          !formUser.firstName ||
          !formUser.lastName ||
          !formUser.username ||
          !formUser.password
        ) {
          toast.error("All fields are required");
          return;
        }
        if (formUser.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }

        await axios.post("/users", formUser, config);
        toast.success("User added successfully");
      }
      setShowModal(false);
      setFormUser({
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        role: "staff",
      });
      fetchUsers();
    } catch (err) {
      console.error("Form submit error:", err);
      const errorMessage = err.response?.data?.message || "Operation failed";
      toast.error(errorMessage);
    }
  };

  // Handle deactivate/reactivate - USING PUT instead of PATCH
  const handleStatusToggle = async () => {
    try {
      // Additional safety: prevent deactivating current user
      if (currentUser?._id && selectedUser?._id === currentUser._id) {
        toast.error("Cannot deactivate your own account");
        setShowDeactivate(false);
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const isCurrentlyActive = selectedUser?.isActive !== false;
      const updateData = {
        isActive: !isCurrentlyActive,
      };

      console.log(
        `Toggling user status for user ${selectedUser?._id}`,
        updateData
      );

      // Use PUT instead of PATCH
      const res = await axios.put(
        `/users/${selectedUser._id}`,
        updateData,
        config
      );
      console.log("Status toggle response:", res.data);

      toast.success(
        `User ${isCurrentlyActive ? "deactivated" : "reactivated"} successfully`
      );
      setShowDeactivate(false);
      fetchUsers();
    } catch (err) {
      console.error("Status toggle error:", err);
      console.error("Error response:", err.response?.data);

      let errorMessage = "Operation failed";
      if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("Network Error")
      ) {
        errorMessage =
          "Unable to connect to server. Please check if the backend is running.";
      } else if (err.response?.status === 404) {
        errorMessage = "User not found.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast.error(errorMessage);
    }
  };

  // Filter configuration for users - UPDATED
  const userFilterConfig = [
    {
      key: "role",
      label: "Role",
      options: [
        { value: "admin", label: "Admin" },
        { value: "staff", label: "Staff" },
      ],
    },
    {
      key: "isActive",
      label: "Status",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
  ];

  // Sort configuration for users
  const userSortConfig = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "isActive", label: "Status" },
    { key: "createdAt", label: "Date Created" },
  ];

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "staff":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status badge color - handle undefined isActive
  const getStatusColor = (isActive) => {
    return isActive !== false
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Get status text - handle undefined isActive
  const getStatusText = (isActive) => {
    return isActive !== false ? "Active" : "Inactive";
  };

  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(
        0
      )}`.toUpperCase();
    }
    return user.username?.charAt(0)?.toUpperCase() || "U";
  };

  // Check if user is active (handle undefined)
  const isUserActive = (user) => {
    return user.isActive !== false;
  };

  // Get user's full name
  const getFullName = (user) => {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A";
  };

  return (
    <DashboardLayout>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <div className="space-y-6 p-2 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              User Management
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Manage system users and their permissions
            </p>
          </div>
          <div className="flex gap-3 mt-4 lg:mt-0">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-xl hover:bg-gray-200 transition-colors duration-200 font-medium text-sm sm:text-base"
              title="Refresh users"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </button>
            {/*<button
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button> */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Users
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Active Users
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.filter((user) => isUserActive(user)).length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Inactive
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.filter((user) => !isUserActive(user)).length}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="px-1 sm:px-0">
          <SearchFilter
            data={users}
            onFilteredDataChange={setFilteredUsers}
            searchFields={["firstName", "lastName", "username", "email"]}
            filterConfig={userFilterConfig}
            sortConfig={userSortConfig}
            placeholder="Search by name, username, or email..."
          />
        </div>

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-gray-100 mx-1 sm:mx-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {users.length === 0
                ? "No users available"
                : "No users match your search"}
            </p>
            <p className="text-gray-600 text-sm sm:text-base">
              {users.length === 0
                ? "Click 'Add User' to create the first user"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-0 sm:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] sm:min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden lg:table-cell">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden xl:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 hidden xl:table-cell">
                      Date Created
                    </th>
                    <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isActive = isUserActive(user);
                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-gray-50 transition-colors duration-150 ${!isActive ? "bg-gray-50 opacity-75" : ""
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div
                              className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-2 sm:mr-3 ${!isActive ? "bg-gray-200" : "bg-blue-100"
                                }`}
                            >
                              <span
                                className={`text-xs sm:text-sm font-medium ${!isActive ? "text-gray-500" : "text-blue-600"
                                  }`}
                              >
                                {getUserInitials(user)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[150px] ${!isActive ? "text-gray-500" : "text-gray-900"
                                  }`}
                                title={getFullName(user)}
                              >
                                {getFullName(user)}
                              </div>
                              <div className="text-xs text-gray-500 lg:hidden truncate max-w-[100px]">
                                @{user.username}
                              </div>
                              <div className="text-xs text-gray-500 xl:hidden truncate max-w-[120px] sm:max-w-[150px]">
                                {user.email || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm hidden lg:table-cell">
                          <div
                            className={`truncate max-w-[100px] ${!isActive ? "text-gray-500" : "text-gray-700"
                              }`}
                            title={user.username}
                          >
                            {user.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm hidden xl:table-cell">
                          <div
                            className={`truncate max-w-[150px] ${!isActive ? "text-gray-500" : "text-gray-700"
                              }`}
                            title={user.email || "N/A"}
                          >
                            {user.email || "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(
                              isActive
                            )}`}
                          >
                            {getStatusText(isActive)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm hidden xl:table-cell">
                          <div
                            className={`${!isActive ? "text-gray-500" : "text-gray-700"
                              }`}
                          >
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-1 sm:p-2 rounded-lg hover:bg-blue-50 text-xs sm:text-sm"
                              title="Edit User"
                            >
                              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                // Prevent deactivating current user
                                if (currentUser?._id && user._id === currentUser._id) {
                                  toast.error("Cannot deactivate your own account");
                                  return;
                                }

                                setSelectedUser(user);
                                setShowDeactivate(true);
                              }}
                              className={`inline-flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm ${!isActive
                                  ? "text-green-600 hover:text-green-800 hover:bg-green-50"
                                  : "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                }`}
                              title={!isActive ? "Reactivate User" : "Deactivate User"}
                            >
                              <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">
                                {!isActive ? "Reactivate" : "Deactivate"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Modal (Add/Edit) */}
        <UserModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleFormSubmit}
          user={formUser}
          setUser={setFormUser}
          isEdit={isEdit}
        />

        {/* Deactivate/Reactivate Alert Dialog */}
        <AlertDialog
          show={showDeactivate}
          title={
            selectedUser && !isUserActive(selectedUser)
              ? "Confirm Reactivate"
              : "Confirm Deactivate"
          }
          message={
            selectedUser
              ? `Are you sure you want to ${!isUserActive(selectedUser) ? "reactivate" : "deactivate"
              } ${getFullName(selectedUser)}? ${!isUserActive(selectedUser)
                ? "The user will be able to access the system again."
                : "The user will no longer be able to access the system."
              }`
              : ""
          }
          onCancel={() => setShowDeactivate(false)}
          onConfirm={handleStatusToggle}
          confirmText={
            selectedUser && !isUserActive(selectedUser)
              ? "Reactivate"
              : "Deactivate"
          }
          confirmColor={
            selectedUser && !isUserActive(selectedUser) ? "green" : "amber"
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;