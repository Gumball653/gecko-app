import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import QrTargetIndexer from "./QrTargetIndexer";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoginGate>
      <QrTargetIndexer />
      <App />
      <ScannerLauncher />
    </LoginGate>
  </React.StrictMode>
);
