import React, { createContext, useState, useEffect } from "react";
import api from "../api/axios";

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
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setReady(true);
  }, []);

  // Login: returns { success: true } or throws error
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user: userData } = res.data;
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

  // Register: returns same shape as login
  const register = async (
    firstName,
    lastName,
    email,
    password,
    role = "staff"
  ) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        firstName,
        lastName,
        email,
        password,
        role,
      });
      // Some register endpoints respond differently — try to capture token/user if returned
      const token = res.data?.token || res.data?.data?.token;
      const userData = res.data?.user || res.data?.data?.user || null;
      if (token && userData) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      }
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
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, ready }}>
      {children}
    </AuthContext.Provider>
  );
};
