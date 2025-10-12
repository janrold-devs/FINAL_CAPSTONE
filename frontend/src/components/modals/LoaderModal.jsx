import React from "react";

const LoaderModal = ({ show, message = "Processing..." }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white/90 rounded-xl shadow-2xl p-8 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E89271] border-t-transparent mb-4"></div>
        <div className="text-lg font-semibold text-gray-700">{message}</div>
      </div>
    </div>
  );
};

export default LoaderModal;