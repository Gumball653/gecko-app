import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { normalizeQrCode, QR_RENDER_OPTIONS } from "./qrUtils";

export default function ProfileQrModal({ selected, onClose }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Building real QR...");
  const code = normalizeQrCode(selected?.qrCode || selected?.id || "");

  useEffect(() => {
    let active = true;

    async function renderQr() {
      if (!canvasRef.current || !code) return;
      setStatus("Building real QR...");
      try {
        await QRCode.toCanvas(canvasRef.current, code, {
          ...QR_RENDER_OPTIONS,
          width: 300,
          margin: 3,
        });
        if (active) setStatus("");
      } catch (error) {
        console.error("Real QR render failed", error);
        if (active) setStatus("QR render failed. Check qrcode package install.");
      }
    }

    renderQr();

    return () => {
      active = false;
    };
  }, [code]);

  async function printSingleQr() {
    try {
      const qrUrl = await QRCode.toDataURL(code, {
        ...QR_RENDER_OPTIONS,
        width: 420,
        margin: 4,
      });
      const printWindow = window.open("", "_blank", "width=480,height=640");
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${selected?.name || "Profile"} QR Code</title>
            <style>
              @page { size: auto; margin: 0.35in; }
              html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; }
              body { display: flex; align-items: flex-start; justify-content: center; }
              .card { width: 3.25in; min-height: 4.25in; text-align: center; border: 2px solid #000; border-radius: 18px; padding: 0.18in; box-sizing: border-box; page-break-inside: avoid; }
              h1 { font-size: 18px; line-height: 1.15; margin: 0 0 6px; }
              .sub { font-size: 12px; margin: 0 0 10px; color: #334155; font-weight: 700; }
              img { display: block; width: 2.35in; height: 2.35in; margin: 0 auto; image-rendering: pixelated; }
              .code { font-family: monospace; font-size: 16px; font-weight: 900; margin: 10px 0 0; }
            </style>
          </head>
          <body>
            <main class="card">
              <h1>${selected?.name || "Reptile Notes"}</h1>
              <p class="sub">${selected?.species || selected?.type || selected?.stage || "Profile"}</p>
              <img src="${qrUrl}" alt="${code}" />
              <p class="code">${code}</p>
            </main>
            <script>
              window.onload = () => {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("QR print failed", error);
      setStatus("QR print failed. Try closing and reopening this QR code.");
    }
  }

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-4">
      <div className="w-full max-w-[360px] rounded-3xl bg-white p-4 text-center shadow-2xl sm:p-5">
        <div id="single-profile-qr" className="rounded-2xl border-2 border-slate-950 bg-white p-3 sm:p-4">
          <p className="mb-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800">Real scannable QR</p>
          <h2 className="truncate text-lg font-black text-slate-950 sm:text-xl">{selected.name || "Reptile Notes"}</h2>
          <p className="mb-3 truncate text-sm font-semibold text-slate-600">{selected.species || selected.type || selected.stage || "Profile"}</p>
          <div className="mx-auto flex w-full max-w-[280px] items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            <canvas ref={canvasRef} aria-label={code} className="block h-auto max-h-[280px] w-full max-w-[280px] bg-white" style={{ imageRendering: "pixelated" }} />
          </div>
          {status && <p className="mt-2 text-sm font-semibold text-slate-500">{status}</p>}
          <p className="mt-3 break-all font-mono text-base font-black text-black sm:text-lg">{code}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={printSingleQr} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Print</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-900">Close</button>
        </div>
      </div>
    </div>
  );
}
