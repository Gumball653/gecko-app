import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import QrTargetIndexer from "./QrTargetIndexer";
import QrPrintPanel from "./QrPrintPanel";
import MobilePhotoUploader from "./MobilePhotoUploader";
import InstallPrompt from "./InstallPrompt";
import AppShell from "./AppShell";
import BottomNav from "./BottomNav";
import ScanButtonBridge from "./ScanButtonBridge";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell>
      <LoginGate>
        <ScanButtonBridge />
        <QrTargetIndexer />
        <App />
        <ScannerLauncher />
        <QrPrintPanel />
        <InstallPrompt />
        <BottomNav />
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 w-[min(92vw,420px)]">
          <MobilePhotoUploader />
        </div>
      </LoginGate>
    </AppShell>
  </React.StrictMode>
);
