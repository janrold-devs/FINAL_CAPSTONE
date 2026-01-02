// pages/Auth/Signup.jsx
import React, { useState, useContext, useEffect } from "react";
import AuthLayout from "../../layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../../context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { register, user, token, ready } = useContext(AuthContext);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (ready && user && token) {
      console.log("✅ User already logged in, redirecting from signup...");
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

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.username.trim() ||
      !form.email.trim()
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

    setLoading(true);

    try {
      const result = await register(
        form.firstName,
        form.lastName,
        form.username,
        form.email
        // Password removed - will be set by admin during approval
      );

      if (result.success) {
        toast.success(
          "Registration submitted for approval! You will receive an email once your account is approved. 👋"
        );
        // Clear form
        setForm({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
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
      <div className="text-center mb-6">
        <div className="flex justify-center items-center mb-6">
          <img
            src="/logo.png"
            alt="KKOPI Tea Logo"
            className="max-w-[200px] w-full h-auto object-contain"
          />
        </div>
        <p className="text-gray-600 text-lg mt-2">Create an account</p>
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
          <label className="block text-gray-700 mb-2 font-medium">Email</label>
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
