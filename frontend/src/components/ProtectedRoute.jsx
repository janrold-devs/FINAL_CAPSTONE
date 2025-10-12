import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, ready } = useContext(AuthContext);

  if(!ready) return null;

  if (!user) {
    // not logged in
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // logged in but wrong role
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;