import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import QrTargetIndexer from "./QrTargetIndexer";
import QrPrintPanel from "./QrPrintPanel";
import PhotoInputOptimizer from "./PhotoInputOptimizer";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoginGate>
      <PhotoInputOptimizer />
      <QrTargetIndexer />
      <App />
      <ScannerLauncher />
      <QrPrintPanel />
    </LoginGate>
  </React.StrictMode>
);
