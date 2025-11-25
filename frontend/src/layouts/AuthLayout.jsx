import React from "react";
import { Link } from "react-router-dom";
import bgImage from "../assets/images/bg.jpg";

const AuthLayout = ({ children, title = "Welcome" }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed relative" style={{ backgroundImage: `url(${bgImage})` }}>
      {/* Store Name - Upper Left */}
      {/* todo: Store name must be centered */}
      <div className="absolute top-6 left-6">
        <Link to="/">
          <h2 className="text-3xl font-bold text-white drop-shadow-lg hover:text-gray-200 transition cursor-pointer">
            Kkopi.Tea
          </h2>
        </Link>
      </div>

      {/* Form Container */}
      <div className="w-[600px] max-w-xl bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">{title}</h1>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;