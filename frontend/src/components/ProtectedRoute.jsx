// src/components/ProtectedRoute.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token, ready } = useContext(AuthContext);

  // CRITICAL: Wait for auth state to be ready before making any decisions
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // After ready is true, check authentication
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Check if user account is active
  if (user.isActive === false) {
    // Clear session for consistency
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authStateChange"));
    return <Navigate to="/login" replace />;
  }

  // Check if user account is approved
  if (user.status !== "approved") {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    const redirectPath = user.role === "staff" ? "/pos" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;