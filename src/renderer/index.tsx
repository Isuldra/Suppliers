console.log("▶️ index.tsx loaded, mounting React…");

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { initializeI18n } from "./i18n/config";

if (!window.electron) {
  const errorDiv = document.createElement("div");
  errorDiv.style.background = "#ffdddd";
  errorDiv.style.color = "#900";
  errorDiv.style.padding = "2em";
  errorDiv.style.fontSize = "1.2em";
  errorDiv.style.fontFamily = "monospace";
  errorDiv.innerText =
    "Critical error: Preload script not loaded.\n" +
    "Features will not work. Please reinstall or contact support.\n" +
    "If you are on Windows, check if antivirus or security software is blocking the app.";
  document.body.appendChild(errorDiv);
  // Also log to console for developer diagnostics

  console.error("Preload script not loaded: window.electron is undefined.");
}

// Initialize i18n before rendering
initializeI18n().then(() => {
  // Render app after i18n is initialized
  const root = document.getElementById("root");
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});
