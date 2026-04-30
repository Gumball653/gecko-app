import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginGate from "./LoginGate";
import ScannerLauncher from "./ScannerLauncher";
import QrTargetIndexer from "./QrTargetIndexer";
import QrPrintPanel from "./QrPrintPanel";
import MobilePhotoUploader from "./MobilePhotoUploader";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoginGate>
      <QrTargetIndexer />
      <App />
      <ScannerLauncher />
      <QrPrintPanel />
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-[min(92vw,420px)]">
        <MobilePhotoUploader />
      </div>
    </LoginGate>
  </React.StrictMode>
);
