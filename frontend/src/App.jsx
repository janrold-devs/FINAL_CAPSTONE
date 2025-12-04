// src/App.jsx
import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import Home from "./pages/Dashboard/Home";
import Ingredient from "./pages/Inventory/Ingredient";
import Product from "./pages/Inventory/Product";
import Spoilage from "./pages/Inventory/Spoilage";
import StockIn from "./pages/Inventory/StockIn";
import POS from "./pages/POS/POS";
import Sales from "./pages/Reports/Sales";
import Transactions from "./pages/Reports/Transactions";
import Settings from "./pages/Settings/Settings";
import Logs from "./pages/Users/Logs";
import UserManagement from "./pages/Users/UserManagement";
import UserApproval from "./pages/Users/UserApproval";

// Root redirect component
const RootRedirect = () => {
  const { user, token, ready } = useContext(AuthContext);
  
  if (!ready) {
    return null;
  }
  
  return user && token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/ingredients"
          element={
            <ProtectedRoute>
              <Ingredient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/products"
          element={
            <ProtectedRoute>
              <Product />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/spoilages"
          element={
            <ProtectedRoute>
              <Spoilage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/stock-in"
          element={
            <ProtectedRoute>
              <StockIn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute requiredRole="admin">
              <Sales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/transactions"
          element={
            <ProtectedRoute requiredRole="admin">
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/logs"
          element={
            <ProtectedRoute requiredRole="admin">
              <Logs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/user-management"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/user-approval"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserApproval />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;