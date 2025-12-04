// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
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
  
  // Refs to prevent duplicate validations
  const validationInProgress = useRef(false);
  const lastValidationTime = useRef(0);
  const validationTimeoutRef = useRef(null);

  // Set initial state immediately from localStorage for faster initial render
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
        console.log("✅ Initial state set from localStorage");
      } catch (error) {
        console.error("❌ Failed to parse initial user data:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } else {
      console.log("ℹ️ No saved session found in localStorage");
    }
    
    // Mark as ready immediately for initial render
    setReady(true);
  }, []);

  // Function to validate and load auth state from localStorage
  const validateAndLoadAuth = useCallback(async (force = false) => {
    const now = Date.now();
    const minInterval = 10000; // 10 seconds minimum between validations
    
    // Skip if validation is already in progress
    if (validationInProgress.current && !force) {
      console.log("⚠️ Validation already in progress, skipping...");
      return;
    }
    
    // Skip if we validated recently (unless forced)
    if (!force && (now - lastValidationTime.current < minInterval)) {
      console.log("⚠️ Skipping validation - too soon since last validation");
      return;
    }
    
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    
    if (!savedUser || !savedToken) {
      console.log("ℹ️ No credentials found");
      setUser(null);
      setToken(null);
      lastValidationTime.current = now;
      return;
    }

    validationInProgress.current = true;
    console.log("🔄 Validating session with backend...");
    
    // Parse user data first
    let userData;
    try {
      userData = JSON.parse(savedUser);
    } catch (error) {
      console.error("❌ Failed to parse user data:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
      validationInProgress.current = false;
      lastValidationTime.current = now;
      return;
    }

    try {
      // Validate token with backend
      const response = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
        timeout: 3000 // Reduced to 3 seconds
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
      
      // Handle timeout errors - use cached session silently
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log("⚠️ Validation timeout, using cached session");
        // Just use the cached session without logging
        setUser(userData);
        setToken(savedToken);
      }
      // Handle server errors - use cached session silently
      else if (error.response?.status >= 500) {
        console.log("⚠️ Server error, using cached session");
        setUser(userData);
        setToken(savedToken);
      }
      // Handle auth errors - clear session
      else if (error.response?.status === 401 || error.response?.status === 403) {
        console.log("🔐 Auth error, clearing invalid session");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
        
        // Dispatch event for other components/tabs
        window.dispatchEvent(new Event("authStateChange"));
      }
      // Handle other errors - use cached session
      else {
        console.log("⚠️ Network error, using cached session");
        setUser(userData);
        setToken(savedToken);
      }
    } finally {
      validationInProgress.current = false;
      lastValidationTime.current = now;
      console.log("✅ Auth validation completed");
    }
  }, []);

  // Load initial state on mount - only once
  useEffect(() => {
    console.log("🔄 Initial auth validation started");
    
    // Clear any existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Delay initial validation slightly to prevent race conditions
    validationTimeoutRef.current = setTimeout(() => {
      validateAndLoadAuth(true); // Force initial validation
    }, 500);
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [validateAndLoadAuth]);

  // Listen for storage changes (other tabs logging in/out) - DEBOUNCED
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token" || event.key === "user") {
        console.log(`🔄 Storage change detected: ${event.key} = ${event.newValue ? 'updated' : 'removed'}`);
        
        // Clear any existing timeout
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        
        // Debounce the validation call
        validationTimeoutRef.current = setTimeout(() => {
          validateAndLoadAuth(true); // Force validation on storage change
        }, 300);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [validateAndLoadAuth]);

  // Listen for custom auth events (for same-tab sync) - DEBOUNCED
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("🔄 Auth state change event received");
      
      // Clear any existing timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      // Debounce the validation call
      validationTimeoutRef.current = setTimeout(() => {
        validateAndLoadAuth(true); // Force validation on auth change
      }, 300);
    };

    window.addEventListener("authStateChange", handleAuthChange);

    return () => {
      window.removeEventListener("authStateChange", handleAuthChange);
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [validateAndLoadAuth]);

  // Revalidate on tab focus/visibility change - THROTTLED
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const minInterval = 30000; // 30 seconds minimum for visibility changes
        
        // Only validate if it's been at least 30 seconds since last validation
        if (now - lastValidationTime.current > minInterval) {
          console.log('🔄 Tab became visible, revalidating session...');
          validateAndLoadAuth();
        } else {
          console.log('ℹ️ Skipping visibility validation - too soon');
        }
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
      
      console.log("✅ Login successful");

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
    
    // Reset validation tracking
    validationInProgress.current = false;
    lastValidationTime.current = Date.now();
    
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