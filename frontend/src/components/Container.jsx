// components/Container.jsx
import React from "react";

const Container = ({ 
  children, 
  className = "",
  maxWidth = "7xl", // You can use: sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl
  padding = "p-6"
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full"
  };

  return (
    <div className={`w-full mx-auto ${maxWidthClasses[maxWidth]} ${padding} ${className}`}>
      {children}
    </div>
  );
};

export default Container;