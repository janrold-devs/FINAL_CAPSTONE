// pages/Auth/Signup.jsx
import React, { useState, useContext } from "react";
import AuthLayout from "../../layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../../context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.username.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        form.firstName,
        form.lastName,
        form.username,
        form.email,
        form.password
      );

      if (result.success) {
        toast.success("Registration submitted for approval! You will receive an email once your account is approved. 👋");
        // Clear form
        setForm({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: "",
        });
        // Redirect to login after successful registration
        setTimeout(() => navigate("/login"), 3000);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Signup failed";
      toast.error(errorMessage);
      console.error("Signup error:", err);
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
          <div className="bg-gradient-to-br from-[#E89271] to-[#d67a5c] rounded-full p-4 shadow-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM6 7h12v2H6V7zm6 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">KKopi.Tea</h1>
        <p className="text-gray-600 mt-2">Create your account</p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your account requires admin approval before you can login.
            You will receive an email with your credentials once approved.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Username
          </label>
          <input
            type="text"
            name="username"
            placeholder="Enter your username"
            required
            value={form.username}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
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
              placeholder="Create a password (min. 6 characters)"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-colors"
              disabled={loading}
              minLength="6"
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
          className="w-full bg-gradient-to-r from-[#E89271] to-[#d67a5c] text-white py-3 px-4 rounded-lg hover:from-[#d67a5c] hover:to-[#c4633d] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-2"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting for Approval...
            </div>
          ) : (
            "Submit for Approval"
          )}
        </button>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#E89271] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;