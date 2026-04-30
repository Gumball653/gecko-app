import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoginGate>
      <App />
      <ScannerLauncher />
    </LoginGate>
  </React.StrictMode>
);
