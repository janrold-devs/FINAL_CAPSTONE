import React, { useState, useEffect, useContext } from "react";
import {
  Bell,
  Settings,
  User as UserIcon,
  PanelLeftOpen,
  PanelLeftClose,
  Gauge,
  MonitorCheck,
  CupSoda,
  Monitor,
  MilkOff,
  Utensils,
  ArrowLeftRight,
  Receipt,
  Activity,
  LogOut,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import NotificationDropdown from "../components/dropdowns/NotificationDropdown";

function TopNav({ sidebarCollapsed }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch notifications (low stock or expiring soon)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/notifications");
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
    // refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const clearNotifications = () => setNotifications([]);

  return (
    <header 
      className="h-20 bg-[#ed9e7f] text-white flex justify-between items-center px-6 shadow-md border-b border-black/10 fixed top-0 right-0 z-30 transition-all duration-300"
      style={{ left: sidebarCollapsed ? '80px' : '288px' }}
    >
      <div className="text-lg font-semibold">
        {user ? (
          <span>
            Welcome,{" "}
            <span className="font-bold">
              {user.firstName} {user.lastName}
            </span>
            !
          </span>
        ) : (
          "Welcome!"
        )}
      </div>

      <nav className="relative flex items-center space-x-6">
        <NotificationDropdown />
        <Link to="/settings" className="hover:opacity-80 transition-opacity" title="Settings">
          <Settings className="w-6 h-6" />
        </Link>
      </nav>
    </header>
  );
}


function SideNav({ sidebarCollapsed, setSidebarCollapsed }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Gauge size={20} /> },
    { href: "/pos", label: "POS", icon: <Monitor size={20} /> },
    { divider: true },
    { href: "/inventory/products", label: "Products", icon: <CupSoda size={20} /> },
    { href: "/inventory/ingredients", label: "Ingredients & Materials", icon: <Utensils size={20} /> },
    { href: "/inventory/stock-in", label: "Stock In", icon: <MonitorCheck size={20} /> },
    { href: "/inventory/spoilages", label: "Spoiled & Damaged", icon: <MilkOff size={20} /> },
    { href: "/inventory/item-movement", label: "Item Tracker", icon: <ArrowLeftRight size={20} /> },
    { divider: true },
    { href: "/reports/transactions", label: "Transactions", icon: <ArrowLeftRight size={20} /> },
    { href: "/reports/sales", label: "Sales", icon: <Receipt size={20} /> },
    { divider: true },
    { href: "/users/user-management", label: "Users", icon: <UserIcon size={20} /> },
    { href: "/users/logs", label: "Activity Log", icon: <Activity size={20} /> },
    { divider: true },
    { href: "/settings", label: "Settings", icon: <Settings size={20} /> },
    { href: "/login", label: "Logout", icon: <LogOut size={20} /> },
  ];

  return (
    <aside
      className={`bg-[#E89271] text-white p-4 overflow-y-auto transition-all duration-300 h-screen fixed left-0 top-0 z-40 ${
        sidebarCollapsed ? "w-20" : "w-72"
      }`}
      style={{ minHeight: "100vh" }}
    >
      {/* Store Name */}
      <div className="flex items-center mb-8">
        <div className="flex items-center w-full">
          {!sidebarCollapsed && (
            <span className="ml-3 text-2xl font-extrabold tracking-wide select-none">
              KKopi.Tea
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-[#eab9a5] transition-colors ml-auto`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-6 w-6" />
          ) : (
            <PanelLeftClose className="h-6 w-6" />
          )}
        </button>
      </div>
      <nav className="space-y-2">
        {navItems.map((item, idx) =>
          item.divider ? (
            <div key={idx} className="border-t border-black/10 my-2" />
          ) : (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={sidebarCollapsed}
              active={location.pathname === item.href}
              onClick={() => navigate(item.href)}
            />
          )
        )}
      </nav>
    </aside>
  );
}

function NavItem({ href, icon, label, collapsed, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded-lg transition-colors group relative overflow-hidden ${
        active ? "text-white bg-[#eab9a5]" : "hover:bg-[#eab9a5] text-white"
      }`}
      title={collapsed ? label : ""}
      style={{ outline: "none", border: "none" }}
    >
      <span className="text-lg">{icon}</span>
      {!collapsed && <span className="ml-3 font-medium">{label}</span>}
      {collapsed && (
        <span className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </button>
  );
}

const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SideNav sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
      <div 
        className="flex-1 flex flex-col transition-all duration-300" 
        style={{ marginLeft: sidebarCollapsed ? '80px' : '288px' }}
      >
        <TopNav sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 mt-20" style={{ minHeight: "calc(100vh - 5rem)" }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;