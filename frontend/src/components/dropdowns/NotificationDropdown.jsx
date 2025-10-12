import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/notifications", {
        credentials: "include", // in case you use cookies for auth
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 cursor-pointer transition"
      >
        <Bell className="w-6 h-6 text-white" />
        {notifications.length > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-lg rounded-xl border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-gray-800 font-semibold">Notifications</h3>
            <button
              className="text-xs text-blue-500 hover:underline"
              onClick={() => fetchNotifications()}
            >
              Refresh
            </button>
          </div>

          <ul className="max-h-60 overflow-y-auto">
            {loading ? (
              <li className="p-4 text-sm text-gray-500 text-center">
                Loading...
              </li>
            ) : notifications.length > 0 ? (
              notifications.map((note) => (
                <li
                  key={note._id}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition"
                >
                  <p className="text-sm text-gray-700">{note.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(note.date).toLocaleString()}
                  </p>
                </li>
              ))
            ) : (
              <li className="p-4 text-sm text-gray-500 text-center">
                No new notifications
              </li>
            )}
          </ul>

          <div className="p-2 border-t border-gray-200 text-center">
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => alert("View all notifications")}
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
