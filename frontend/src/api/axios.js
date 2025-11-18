//api/axios.js

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "https://final-capstone-kb79.onrender.com/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
