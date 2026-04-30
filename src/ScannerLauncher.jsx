import React, { useState } from "react";
import QrScanner from "./QrScanner";

export default function ScannerLauncher() {
  const [open, setOpen] = useState(false);
  const [lastScan, setLastScan] = useState("");

  function handleScan(result) {
    setLastScan(result);
    setOpen(false);

    window.dispatchEvent(
      new CustomEvent("reptile-notes-qr-scan", {
        detail: { code: result },
      })
    );

    const matchingElement = document.querySelector(`[data-qr-code="${CSS.escape(result)}"]`);
    if (matchingElement) {
      matchingElement.scrollIntoView({ behavior: "smooth", block: "center" });
      matchingElement.classList.add("ring-4", "ring-emerald-400");
      window.setTimeout(() => matchingElement.classList.remove("ring-4", "ring-emerald-400"), 2500);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800"
      >
        Scan QR
      </button>

      {lastScan && (
        <div className="fixed bottom-20 right-4 z-40 max-w-xs rounded-2xl bg-white p-3 text-sm shadow-lg">
          Last scan: <span className="font-mono font-semibold">{lastScan}</span>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Scan QR Code</h2>
                <p className="text-sm text-slate-500">Point your camera at an animal, egg, or housing QR code.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
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
