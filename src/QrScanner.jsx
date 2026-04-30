import React, { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Starting camera...");

  useEffect(() => {
    let active = true;

    async function startScanner() {
      try {
        if (!window.isSecureContext) {
          setError("Camera requires HTTPS. Open the live Vercel site, not an embedded preview.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("This browser does not allow in-app camera access.");
          return;
        }

        setStatus("Requesting camera permission...");

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 300,
        });

        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const backCamera = devices.find((device) => /back|rear|environment/i.test(device.label));
        const deviceId = backCamera?.deviceId || devices?.[devices.length - 1]?.deviceId || devices?.[0]?.deviceId;

        setStatus("Hold QR code inside the box. Move slowly closer if it does not detect.");

        controlsRef.current = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
          if (result && active) {
            const text = result.getText();
            setStatus(`QR found: ${text}`);
            onScan(text);
            controls.stop();
          }
        });
      } catch (err) {
        setError(`Camera scanning failed: ${err?.name || "Unknown error"}. Allow camera permission and use Safari from the live site.`);
        setStatus("");
      }
    }

    startScanner();

    return () => {
      active = false;
      controlsRef.current?.stop?.();
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" autoPlay muted playsInline />
        <div className="pointer-events-none absolute inset-10 rounded-3xl border-4 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
      </div>
      {status && <p className="text-sm font-semibold text-slate-700">{status}</p>}
      <p className="text-xs text-slate-500">Tip: good light, flat label, fill most of the green box.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
