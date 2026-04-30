import React, { useState } from "react";
import QrScanner from "./QrScanner";

export default function EmergencyScanButton() {
  const [open, setOpen] = useState(false);

  function handleScan(result) {
    const code = String(result || "").trim().toUpperCase();
    const normalized = code.startsWith("QR-") ? code : `QR-${code}`;
    setOpen(false);
    window.dispatchEvent(new CustomEvent("reptile-notes-qr-scan", { detail: { code: normalized } }));
    alert(`Scanned: ${normalized}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 2147483647,
          background: "#020617",
          color: "white",
          border: "3px solid #22c55e",
          borderRadius: "9999px",
          padding: "18px 22px",
          fontSize: "16px",
          fontWeight: 900,
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        }}
      >
        Scan QR
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483646,
            background: "rgba(0,0,0,0.75)",
            padding: 16,
          }}
        >
          <div style={{ maxWidth: 480, margin: "0 auto", background: "white", borderRadius: 24, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Scan QR Code</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Point your camera at the QR label.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}>
                Close
              </button>
            </div>
            <QrScanner onScan={handleScan} />
          </div>
        </div>
      )}
    </>
  );
}
