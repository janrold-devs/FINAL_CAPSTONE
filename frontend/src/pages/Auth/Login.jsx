import React, { useState, useContext, useEffect } from "react";
import AuthLayout from "../../layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, token, ready } = useContext(AuthContext);
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (ready && user && token) {
      console.log("✅ User already logged in, redirecting...");
      // Redirect based on role
      if (user.role === "admin") {
        navigate("/dashboard", { replace: true });
      } else if (user.role === "staff") {
        navigate("/pos", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [ready, user, token, navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting login with:", { username: form.username });

      const result = await login(form.username.trim(), form.password);

      if (result.success) {
        console.log("Login successful:", result.user);
        toast.success(`Welcome back, ${result.user.firstName}! 👋`);
        if (result.user.role === "admin") {
          // Admin goes to dashboard
          setTimeout(() => navigate("/dashboard"), 1000);
        } else if (result.user.role === "staff") {
          // Staff goes to POS (or another appropriate page)
          setTimeout(() => navigate("/pos"), 1000);
        } else {
          // Default fallback
          setTimeout(() => navigate("/dashboard"), 1000);
        }
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Login error details:", err);
      let errorMessage = "Login failed";

      if (err.response) {
        errorMessage =
          err.response.data?.message || `Server error: ${err.response.status}`;
        console.error("Server error response:", err.response.data);
      } else if (err.request) {
        errorMessage = "No response from server. Check if backend is running.";
        console.error("No response received:", err.request);
      } else {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="">
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
      />

      {/* Logo Section */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center mb-4">
          <img
            src="/logo.png"
            alt="KKOPI Tea Logo"
            className="max-w-[250px] w-full h-auto object-contain"
          />
        </div>
        <p className="text-gray-600 text-lg mt-2">Login to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Username
          </label>
          <input
            type="text"
            name="username"
            required
            value={form.username}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
            placeholder="Enter your username"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
              placeholder="Enter your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              disabled={loading}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible size={22} />
              ) : (
                <AiOutlineEye size={22} />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#E89271] to-[#d67a5c] text-white py-3 px-4 rounded-lg hover:from-[#d67a5c] hover:to-[#c4633d] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Logging in...
            </div>
          ) : (
            "Login"
          )}
        </button>

        <p className="text-center text-gray-600 text-sm mt-6">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-[#E89271] hover:underline font-medium"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
