import React from "react";

const AlertDialog = ({
  show,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "Confirm",
  confirmColor = "red",
  cancelText = "Cancel",
}) => {
  if (!show) return null;

  const getConfirmButtonClass = () => {
    switch (confirmColor) {
      case "green":
        return "bg-green-600 text-white hover:bg-green-700 transition";
      case "amber":
        return "bg-amber-600 text-white hover:bg-amber-700 transition";
      case "blue":
        return "bg-blue-600 text-white hover:bg-blue-700 transition";
      case "red":
      default:
        return "bg-red-600 text-white hover:bg-red-700 transition";
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[1px]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-sm transition-all relative">
        {/* Close X Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg font-semibold mb-2 text-gray-900 pr-8">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
