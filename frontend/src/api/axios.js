// src/api/axios.js
import axios from "axios";

const BASE_URL = import.meta.env.PROD 
  ? "https://kkopitea-backend.onrender.com/api" 
  : "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true
});

// Request interceptor - add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    
    // Skip handling for /users/me endpoint (let AuthContext handle it)
    if (config?.url?.includes("/users/me")) {
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized errors (token expired/invalid)
    if (response?.status === 401) {
      const errorCode = response?.data?.code;
      
      console.log("❌ 401 Unauthorized:", errorCode);
      
      // Only clear and redirect if it's a token issue
      if (["TOKEN_EXPIRED", "INVALID_TOKEN", "NO_TOKEN"].includes(errorCode)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        // Dispatch event to update auth state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("authStateChange"));
        }
        
        // Only redirect if we're not already on login/signup page
        if (typeof window !== "undefined" && 
            !window.location.pathname.includes("/login") &&
            !window.location.pathname.includes("/signup")) {
          setTimeout(() => {
            window.location.href = "/login";
          }, 100);
        }
      }
    }
    
    // Handle 403 Forbidden (account deactivated/pending)
    if (response?.status === 403) {
      const errorCode = response?.data?.code;
      
      if (["ACCOUNT_DEACTIVATED", "ACCOUNT_PENDING"].includes(errorCode)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("authStateChange"));
          
          if (!window.location.pathname.includes("/login")) {
            setTimeout(() => {
              window.location.href = "/login";
            }, 100);
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;