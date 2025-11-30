// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import api from "../api/axios";
import { toast } from "react-toastify";

export const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: false,
  ready: false,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Load user from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setReady(true);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username, password });
      const { token, ...userData } = res.data;
      if (!token || !userData) throw new Error("Invalid login response");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setToken(token);

      setLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      setLoading(false);
      const message =
        err?.response?.data?.message || err.message || "Login failed";
      return { success: false, message };
    }
  };

  const register = async (firstName, lastName, username, email) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        firstName,
        lastName,
        username,
        email
        // Password removed - will be set by admin during approval
      });

      setLoading(false);
      return { success: true, data: res.data };
    } catch (err) {
      setLoading(false);
      const message =
        err?.response?.data?.message || err.message || "Register failed";
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    toast.info("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading, ready }}
    >
      {children}
    </AuthContext.Provider>
  );
};