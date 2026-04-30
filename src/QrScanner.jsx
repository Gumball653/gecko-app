import React, { useState } from "react";

export default function QrScanner({ onScan }) {
  const [manualCode, setManualCode] = useState("");

  function submitManual(event) {
    event.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    onScan(code.startsWith("QR-") ? code : `QR-${code}`);
    setManualCode("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        iPhone photo scanning has been disabled because loading full-resolution library photos can freeze Safari. Enter the printed QR code below instead.
      </div>

      <form onSubmit={submitManual} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          QR code or ID
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="QR-A-001 or A-001"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-500"
            autoCapitalize="characters"
            inputMode="text"
          />
        </label>
        <button type="submit" className="w-full rounded-xl bg-slate-950 px-4 py-3 text-base font-bold text-white">
          Open Profile
        </button>
      </form>
    </div>
  );
}
