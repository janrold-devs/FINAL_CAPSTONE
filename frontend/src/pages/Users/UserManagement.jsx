import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UserModal from "../../components/modals/UserModal";
import AlertDialog from "../../components/AlertDialog";
import SearchFilter from "../../components/SearchFilter";
import { Pencil, Trash2, Plus, Users } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formUser, setFormUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff",
  });

  const token = localStorage.getItem("token");

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch users");
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
      email: "",
      password: "",
      role: "staff",
    });
    setIsEdit(false);
    setShowModal(true);
  };

  // Open modal for editing user
  const handleEditClick = (user) => {
    setFormUser(user);
    setSelectedUser(user);
    setIsEdit(true);
    setShowModal(true);
  };

  // Handle form submit (add or edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        // Update existing user
        const updateData = { ...formUser };
        if (!updateData.password || updateData.password.trim() === "") {
          delete updateData.password; // Don't send empty password
        }
        await axios.put(`/users/${selectedUser._id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("User updated successfully");
      } else {
        // Add new user - validation
        if (!formUser.firstName || !formUser.lastName || !formUser.email || !formUser.password) {
          toast.error("All fields are required");
          return;
        }
        if (formUser.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        
        await axios.post("/users", formUser, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("User added successfully");
      }
      setShowModal(false);
      setFormUser({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "staff",
      });
      fetchUsers();
    } catch (err) {
      console.error("Error:", err.response?.data);
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await axios.delete(`/users/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("User deleted");
      setShowDelete(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // Filter configuration for users
  const userFilterConfig = [
    {
      key: "role",
      label: "Role",
      options: [
        { value: "admin", label: "Admin" },
        { value: "staff", label: "Staff" },
      ],
    },
  ];

  // Sort configuration for users
  const userSortConfig = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "createdAt", label: "Date Created" },
  ];

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "staff":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cashier":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <DashboardLayout>
      {/**todo: Improve UI must be modern */}
      <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar />
      <div className="space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium mt-4 lg:mt-0"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.filter(user => user.role === 'admin').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">👑</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredUsers.filter(user => user.role === 'staff').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">👨‍💼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <SearchFilter
          data={users}
          onFilteredDataChange={setFilteredUsers}
          searchFields={["firstName", "lastName", "email"]}
          filterConfig={userFilterConfig}
          sortConfig={userSortConfig}
          placeholder="Search by name or email..."
        />

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">No users found</p>
            <p className="text-gray-600">
              {users.length === 0 ? "No users available" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date Created</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 text-sm font-medium">
                              {getUserInitials(user)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">User</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="text-sm font-medium">Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDelete(true);
                            }}
                            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

        {/* Delete Alert Dialog */}
        <AlertDialog
          show={showDelete}
          title="Confirm Delete"
          message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName}? This action cannot be undone.`}
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;