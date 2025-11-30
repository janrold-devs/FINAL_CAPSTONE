import React from "react";

const UserModal = ({ show, onClose, onSubmit, user, setUser, isEdit }) => {
  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-2xl w-96 border border-white/40 relative">
        {/* Close X Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 pr-8">
          {isEdit ? "Edit User" : "Add New User"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block font-semibold text-sm mb-1">First Name</label>
          <input
            type="text"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={user?.firstName || ""}
            onChange={(e) =>
              setUser({
                ...user,
                firstName: e.target.value,
              })
            }
            required
          />

          <label className="block font-semibold text-sm mb-1">Last Name</label>
          <input
            type="text"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={user?.lastName || ""}
            onChange={(e) =>
              setUser({
                ...user,
                lastName: e.target.value,
              })
            }
            required
          />

          <label className="block font-semibold text-sm mb-1">Username</label>
          <input
            type="text"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={user?.username || ""}
            onChange={(e) =>
              setUser({
                ...user,
                username: e.target.value,
              })
            }
            required
          />

          <label className="block font-semibold text-sm mb-1">Email</label>
          <input
            type="email"
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={user?.email || ""}
            onChange={(e) =>
              setUser({
                ...user,
                email: e.target.value,
              })
            }
            required={!isEdit}
          />

          <label className="block font-semibold text-sm mb-1">Role</label>
          <select
            value={user?.role || "staff"}
            onChange={(e) => setUser({ ...user, role: e.target.value })}
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>

          <label className="block font-semibold text-sm mb-1">
            {isEdit ? "New Password (optional)" : "Password"}
          </label>
          <input
            type="password"
            placeholder={
              isEdit ? "Leave blank to keep current" : "Enter password"
            }
            className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setUser({
                ...user,
                password: e.target.value,
              })
            }
            required={!isEdit}
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 transition rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {isEdit ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
