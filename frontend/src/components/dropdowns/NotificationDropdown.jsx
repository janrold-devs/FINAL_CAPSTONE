import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  Package,
  RefreshCw,
  X,
  CheckCheck
} from "lucide-react";
import api from "../../api/axios";

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());

  // Smart polling with visibility detection
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Poll every 5 minutes (300000ms) when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && 
          (Date.now() - lastFetchTimeRef.current) > 30000) {
        fetchNotifications();
      }
    }, 300000); // 5 minutes

    // Fetch when tab becomes visible (if >30s since last fetch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (Date.now() - lastFetchTimeRef.current) > 30000) {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Show browser notification for new critical alerts
  useEffect(() => {
    if (notifications.length > 0 && !open) {
      const criticalNotifications = notifications.filter(n => n.priority === "critical");
      if (criticalNotifications.length > 0) {
        showBrowserNotification(criticalNotifications);
      }
    }
  }, [notifications, open]);

  // Show browser notification
  const showBrowserNotification = (criticalNotifications) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⚠️ Inventory Alerts!", {
        body: `You have ${criticalNotifications.length} critical inventory notification(s) requiring attention.`,
        icon: "/favicon.ico",
        tag: "inventory-alert",
        requireInteraction: true,
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log("📥 Fetching notifications from backend...");
      const response = await api.get("/notifications");
      console.log(`✅ Received ${response.data.length} notifications`);
      setNotifications(response.data);
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      // Don't show alert for initial load, only show if user manually refreshes
      if (open) {
        alert("Failed to load notifications. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear single notification
  const clearNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      console.log("🗑️ Clearing notification:", notificationId);
      const response = await api.delete(`/notifications/${notificationId}`);
      console.log("✅ Backend response:", response.data);
      
      // Update local state by removing the notification
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      console.log("✅ Notification cleared from frontend state");
    } catch (error) {
      console.error("❌ Error clearing notification:", error);
      alert("Failed to clear notification. Please try again.");
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      console.log("🗑️ Clearing all notifications");
      const response = await api.delete("/notifications");
      console.log("✅ Backend response:", response.data);
      
      // Update local state
      setNotifications([]);
      setOpen(false);
      
      console.log("✅ All notifications cleared");
    } catch (error) {
      console.error("❌ Error clearing all notifications:", error);
      alert("Failed to clear all notifications. Please try again.");
    }
  };

  // Fetch on open (additional fetch when user opens dropdown)
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "expiring":
        return <Clock className="w-5 h-5 text-orange-500" />;
      case "expired":
        return <Clock className="w-5 h-5 text-red-600" />;
      case "low_stock":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "out_of_stock":
        return <Package className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "critical":
        return {
          border: "border-l-4 border-l-red-600",
          bg: "bg-red-50",
          badge: "bg-red-600 text-white",
        };
      case "high":
        return {
          border: "border-l-4 border-l-orange-500",
          bg: "bg-orange-50",
          badge: "bg-orange-500 text-white",
        };
      case "medium":
        return {
          border: "border-l-4 border-l-yellow-500",
          bg: "bg-yellow-50",
          badge: "bg-yellow-500 text-white",
        };
      default:
        return {
          border: "border-l-4 border-l-blue-500",
          bg: "bg-blue-50",
          badge: "bg-blue-500 text-white",
        };
    }
  };

  const totalCount = notifications.length;
  const criticalCount = notifications.filter(n => n.priority === "critical").length;
  const highCount = notifications.filter(n => n.priority === "high").length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 cursor-pointer transition-all duration-200 hover:bg-[#eab9a5] rounded-lg group"
      >
        <Bell
          className="w-6 h-6 text-white transition-transform group-hover:scale-110"
        />

        {/* Notification Badge - Show total count */}
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-[450px] bg-white shadow-2xl rounded-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#E89271]" />
                Inventory Alerts
                {totalCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {totalCount} alerts
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-3">
                {/* Refresh Button */}
                <button
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  onClick={fetchNotifications}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            {notifications.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {criticalCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    {criticalCount} Critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                    {highCount} High Priority
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                  {notifications.length} total
                </span>
              </div>
            )}
          </div>

          {/* Clear All Button */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-end">
              <button
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={clearAllNotifications}
                disabled={loading}
              >
                <X className="w-3.5 h-3.5" />
                Clear all alerts
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E89271] border-t-transparent mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">
                  Loading alerts...
                </p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map((note) => {
                  const styles = getPriorityStyles(note.priority);
                  return (
                    <div
                      key={note._id}
                      className={`p-4 ${styles.border} ${styles.bg} transition-all duration-200 relative group`}
                    >
                      {/* Close button */}
                      <button
                        onClick={(e) => clearNotification(note._id, e)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Clear alert"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-start gap-3 pr-8">
                        {/* Notification Type Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(note.type)}
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {note.title}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${styles.badge}`}
                            >
                              {note.priority.toUpperCase()}
                            </span>
                          </div>

                          <p className="text-sm leading-snug text-gray-700">
                            {note.message}
                          </p>

                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCheck className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <p className="text-base font-medium text-gray-700">
                  All Clear!
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  No inventory alerts at this time
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;