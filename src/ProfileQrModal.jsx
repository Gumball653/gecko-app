import React, { useEffect, useState } from "react";
import { makeQrDataUrl, normalizeQrCode } from "./qrUtils";

export default function ProfileQrModal({ selected, onClose }) {
  const [qrUrl, setQrUrl] = useState("");
  const code = normalizeQrCode(selected?.qrCode || selected?.id || "");

  useEffect(() => {
    let active = true;

    async function renderQr() {
      if (!code) return;
      const url = await makeQrDataUrl(code);
      if (active) setQrUrl(url);
    }

    renderQr();

    return () => {
      active = false;
    };
  }, [code]);

  function printSingleQr() {
    window.print();
  }

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #single-profile-qr, #single-profile-qr * { visibility: visible; }
            #single-profile-qr {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 24px;
            }
            .single-qr-no-print {
              display: none !important;
            }
          }
        `}</style>

        <div id="single-profile-qr" className="rounded-2xl border-2 border-slate-950 bg-white p-4">
          <h2 className="text-xl font-black text-slate-950">{selected.name || "Reptile Notes"}</h2>
          <p className="mb-3 text-sm font-semibold text-slate-600">{selected.species || selected.type || selected.stage || "Profile"}</p>
          {qrUrl ? (
            <img src={qrUrl} alt={code} className="mx-auto h-64 w-64 bg-white" style={{ imageRendering: "pixelated" }} />
          ) : (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">Building QR...</div>
          )}
          <p className="mt-3 font-mono text-lg font-black text-black">{code}</p>
        </div>

        <div className="single-qr-no-print mt-4 flex gap-2">
          <button type="button" onClick={printSingleQr} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Print</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-900">Close</button>
        </div>
      </div>
    </div>
  );
}
