import React, { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, Clock, Package, RefreshCw, X, CheckCheck } from "lucide-react";
import io from "socket.io-client";

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const dropdownRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io("http://localhost:8000", {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to notification server");
      setConnected(true);
      // Request initial notifications
      newSocket.emit("request_notifications");
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnected(false);
    });

    // Listen for real-time notifications
    newSocket.on("notifications_update", (newNotifications) => {
      console.log(`🔔 Received ${newNotifications.length} notifications`);
      
      const previousCount = notifications.length;
      setNotifications(newNotifications);
      
      // Show browser notification and play sound for new critical alerts
      if (!open && newNotifications.length > previousCount) {
        const criticalNotifications = newNotifications.filter(n => n.priority === "critical");
        if (criticalNotifications.length > 0) {
          showBrowserNotification(criticalNotifications);
          playNotificationSound();
        }
      }
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.play().catch(err => {
        console.log("Could not play sound:", err);
      });
    }
  };

  // Show browser notification
  const showBrowserNotification = (criticalNotifications) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("⚠️ Critical Alerts!", {
          body: `You have ${criticalNotifications.length} critical notification(s) requiring immediate attention.`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "critical-alert",
          requireInteraction: true
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            showBrowserNotification(criticalNotifications);
          }
        });
      }
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications manually
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/notifications", {
        credentials: "include",
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

  // Fetch on open
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
      case 'expiration':
      case 'expiring':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'expired':
        return <Clock className="w-5 h-5 text-red-600" />;
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'out_of_stock':
        return <Package className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'critical':
        return {
          border: 'border-l-4 border-l-red-600',
          bg: 'bg-red-50',
          badge: 'bg-red-600 text-white'
        };
      case 'high':
        return {
          border: 'border-l-4 border-l-orange-500',
          bg: 'bg-orange-50',
          badge: 'bg-orange-500 text-white'
        };
      case 'medium':
        return {
          border: 'border-l-4 border-l-yellow-500',
          bg: 'bg-yellow-50',
          badge: 'bg-yellow-500 text-white'
        };
      default:
        return {
          border: 'border-l-4 border-l-blue-500',
          bg: 'bg-blue-50',
          badge: 'bg-blue-500 text-white'
        };
    }
  };

  const criticalCount = notifications.filter(n => n.priority === "critical").length;
  const highCount = notifications.filter(n => n.priority === "high").length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hidden audio element for notification sound */}
      <audio ref={notificationSoundRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzm8bllHAdAmtj1y3ksBSh+zPLaizsKGGS26+mjUBALTKXh8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKXh8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAKTKbi8bllHgU2jdTxy3osBSh+zPDaizwKF2W36+mjUhAK"></audio>

      {/* Bell Icon with Badge */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 cursor-pointer transition-all duration-200 hover:bg-[#eab9a5] rounded-lg group"
      >
        <Bell className={`w-6 h-6 text-white transition-transform ${notifications.length > 0 ? 'animate-bounce' : ''} group-hover:scale-110`} />
        
        {/* Notification Badge */}
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
        
        {/* Connection Status Dot */}
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={connected ? 'Real-time connected' : 'Disconnected'}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-[420px] bg-white shadow-2xl rounded-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#E89271]" />
                Notifications
              </h3>
              
              <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                  />
                  <span className="text-xs text-gray-600">
                    {connected ? 'Live' : 'Offline'}
                  </span>
                </div>
                
                {/* Refresh Button */}
                <button
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  onClick={fetchNotifications}
                  disabled={loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Summary Stats */}
            {notifications.length > 0 && (
              <div className="mt-3 flex gap-2">
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
              </div>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E89271] border-t-transparent mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map((note) => {
                  const styles = getPriorityStyles(note.priority);
                  return (
                    <div
                      key={note._id}
                      className={`p-4 ${styles.border} ${styles.bg} hover:brightness-95 cursor-pointer transition-all duration-150`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(note.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {note.title}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${styles.badge}`}>
                              {note.priority.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 leading-snug">
                            {note.message}
                          </p>
                          
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.date).toLocaleString()}
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
                <p className="text-base font-medium text-gray-700">All Clear!</p>
                <p className="text-sm text-gray-500 mt-1">No notifications at this time</p>
                {!connected && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-700 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Real-time updates are currently unavailable
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-600">
                {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
              </span>
              <button
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                onClick={() => {
                  setNotifications([]);
                  setOpen(false);
                }}
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;