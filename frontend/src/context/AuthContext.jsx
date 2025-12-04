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
  const [isValidating, setIsValidating] = useState(false);

  // Set initial state immediately from localStorage for faster initial render
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
        console.log("Initial state set from localStorage");
      } catch (error) {
        console.error("Failed to parse initial user data:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } else {
      console.log("No saved session found in localStorage");
    }
  }, []);

  // Function to validate and load auth state from localStorage
  const validateAndLoadAuth = useCallback(async () => {
    if (isValidating) {
      return;
    }

    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    
    if (!savedUser || !savedToken) {
      setUser(null);
      setToken(null);
      setReady(true);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    console.log("🔄 Validating session with backend...");

    try {
      // Parse user data first
      const userData = JSON.parse(savedUser);
      
      // Validate token with backend
      const response = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
        timeout: 5000 // 5 second timeout
      });
      
      // Token is valid - use fresh data from server
      const freshUserData = response.data;
      setUser(freshUserData);
      setToken(savedToken);
      
      // Update localStorage with fresh user data
      localStorage.setItem("user", JSON.stringify(freshUserData));
      
      console.log("✅ Session validated successfully");
    } catch (error) {
      console.error("❌ Token validation failed:", error.response?.data?.message || error.message);
      
      // Handle different error scenarios
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log("⚠️ Validation timeout, using cached session");
        // Server timeout - use cached session
        try {
          const cachedUser = JSON.parse(savedUser);
          setUser(cachedUser);
          setToken(savedToken);
          console.log("✅ Using cached session due to timeout");
        } catch (parseError) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      } else if (error.response?.status >= 500) {
        // Server error - keep existing session
        console.log("⚠️ Server error, using cached session");
        try {
          const cachedUser = JSON.parse(savedUser);
          setUser(cachedUser);
          setToken(savedToken);
        } catch (parseError) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        // Auth error - clear invalid session
        console.log("🔐 Auth error, clearing invalid session");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
      } else {
        // Network or other errors - keep session but mark as ready
        console.log("⚠️ Network error, using cached session");
        try {
          const cachedUser = JSON.parse(savedUser);
          setUser(cachedUser);
          setToken(savedToken);
        } catch (parseError) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setToken(null);
        }
      }
    } finally {
      setReady(true);
      setIsValidating(false);
      console.log("✅ Auth state marked as ready");
    }
  }, [isValidating]);

  // Load initial state on mount
  useEffect(() => {
    console.log("🔄 Initial auth validation started");
    validateAndLoadAuth();
  }, [validateAndLoadAuth]);

  // Listen for storage changes (other tabs logging in/out)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token" || event.key === "user") {
        console.log(`🔄 Storage change detected: ${event.key} = ${event.newValue ? 'updated' : 'removed'}`);
        
        // Small delay to ensure localStorage is consistent
        setTimeout(() => {
          validateAndLoadAuth();
        }, 50);
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
      validateAndLoadAuth();
    };

    window.addEventListener("authStateChange", handleAuthChange);

    return () => {
      window.removeEventListener("authStateChange", handleAuthChange);
    };
  }, [validateAndLoadAuth]);

  // Revalidate on tab focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Tab became visible, revalidating session...');
        validateAndLoadAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateAndLoadAuth]);

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
      
      // Mark as ready since we have valid auth
      setReady(true);
      
      console.log("✅ Login successful, auth state ready");

      setLoading(false);
      
      // Dispatch event for other components/tabs
      window.dispatchEvent(new Event("authStateChange"));
      
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
    setReady(true); // Important: mark as ready even when logging out
    
    // Dispatch event for other components/tabs
    window.dispatchEvent(new Event("authStateChange"));
    
    toast.info("Logged out successfully");
  };

  // Function to check if user is authenticated (for components that need quick check)
  const isAuthenticated = useCallback(() => {
    return !!(user && token);
  }, [user, token]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        token, 
        login, 
        register, 
        logout, 
        loading, 
        ready,
        isAuthenticated 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};