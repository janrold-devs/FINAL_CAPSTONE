import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UserModal from "../../components/modals/UserModal";
import AlertDialog from "../../components/AlertDialog";
import { Pencil, Trash2 } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
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

  return (
    <DashboardLayout>
      {/**todo: Improve UI must be modern */}
      <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">User Management</h1>
          <button
            onClick={handleAddClick}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add User
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Name</th>
                <th className="border px-3 py-2 text-center">Email</th>
                <th className="border px-3 py-2 text-center">Role</th>
                <th className="border px-3 py-2 text-center">Date Created</th>
                <th className="border px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id}>
                    <td className="border px-3 py-2">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : "N/A"}
                    </td>
                    <td className="border px-3 py-2 text-center">{user.email}</td>
                    <td className="border px-3 py-2 text-center capitalize">{user.role}</td>
                    <td className="border px-3 py-2 text-center">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-2"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDelete(true);
                        }}
                        className="inline-flex items-center gap-1 text-red-600 hover:underline ml-2"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-3 py-4 text-center" colSpan="5">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
          message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName}?`}
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;