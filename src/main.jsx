import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import QrTargetIndexer from "./QrTargetIndexer";
import QrPrintPanel from "./QrPrintPanel";
import InstallPrompt from "./InstallPrompt";
import AppShell from "./AppShell";
import ScanButtonBridge from "./ScanButtonBridge";
import EmergencyScanButton from "./EmergencyScanButton";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EmergencyScanButton />
    <AppShell>
      <LoginGate>
        <ScanButtonBridge />
        <QrTargetIndexer />
        <App />
        <ScannerLauncher />
        <QrPrintPanel />
        <InstallPrompt />
      </LoginGate>
    </AppShell>
  </React.StrictMode>
);
