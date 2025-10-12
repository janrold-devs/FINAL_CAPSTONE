// src/pages/Auth/Signup.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import AuthLayout from "../../layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Signup = () => {
  const { register, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await register(
      form.firstName,
      form.lastName,
      form.email,
      form.password,
      form.role
    );

    if (res.success) {
      toast.success("Account created successfully!");
      setTimeout(() => navigate("/login"), 1000);
    } else {
      toast.error(res.message || "Signup failed");
    }
  };

  return (
    <AuthLayout title="Create your account">
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            required
            onChange={handleChange}
            className="w-1/2 border border-gray-300 rounded-md p-2"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            required
            onChange={handleChange}
            className="w-1/2 border border-gray-300 rounded-md p-2"
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            required
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md p-2 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="text-center text-gray-600 text-sm mt-3">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;