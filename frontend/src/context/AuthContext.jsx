// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";
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

  // Function to validate and load auth state from localStorage
  const validateAndLoadAuth = useCallback(async () => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    
    if (!savedUser || !savedToken) {
      setReady(true);
      return;
    }

    try {
      // Parse user data first
      const userData = JSON.parse(savedUser);
      
      // Validate token with backend
      const response = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      
      // Token is valid - use fresh data from server
      const freshUserData = response.data;
      setUser(freshUserData);
      setToken(savedToken);
      
      // Update localStorage with fresh user data
      localStorage.setItem("user", JSON.stringify(freshUserData));
      
      console.log("✅ Session validated successfully");
    } catch (error) {
      console.error("❌ Token validation failed:", error.response?.data || error.message);
      
      // Check if it's a server error (5xx) vs auth error (401/403)
      if (error.response?.status >= 500) {
        // Server error - keep existing session but mark as ready
        console.log("Server error, keeping existing session");
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setToken(savedToken);
        } catch (parseError) {
          // Can't parse user data, clear session
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      } else {
        // Auth error (401/403) - clear invalid session
        console.log("Auth error, clearing session");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  // Load initial state on mount
  useEffect(() => {
    console.log("🔄 Initializing auth state...");
    validateAndLoadAuth();
  }, [validateAndLoadAuth]);

  // Listen for storage changes (other tabs logging in/out)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token") {
        console.log("🔄 Token changed in another tab");
        
        if (!event.newValue) {
          // Token removed - logout
          setUser(null);
          setToken(null);
        } else {
          // Token added/changed - reload auth
          validateAndLoadAuth();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [validateAndLoadAuth]);

  // Listen for custom auth events (for same-tab sync)
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("🔄 Auth state change event received");
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      
      if (!savedToken || !savedUser) {
        setUser(null);
        setToken(null);
      } else {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } catch {
          setUser(null);
          setToken(null);
        }
      }
    };

    window.addEventListener("authStateChange", handleAuthChange);

    return () => {
      window.removeEventListener("authStateChange", handleAuthChange);
    };
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
      
      console.log("✅ Login successful");

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
    console.log("🚪 Logging out...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    
    // Dispatch event for other components/tabs
    window.dispatchEvent(new Event("authStateChange"));
    
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