import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { initForceUppercaseInputs } from "./utils/initForceUppercaseInputs";

// Initialize global uppercase enforcement before React mounts so React receives uppercase on first input
initForceUppercaseInputs();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
