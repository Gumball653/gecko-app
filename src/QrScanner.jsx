import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

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

        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera = devices.find((device) => /back|rear|environment/i.test(device.label));
        const deviceId = backCamera?.deviceId || devices?.[devices.length - 1]?.deviceId || devices?.[0]?.deviceId;

        setStatus("Point camera at QR code...");

        controlsRef.current = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
          if (result && active) {
            setStatus("QR found");
            onScan(result.getText());
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
        <div className="pointer-events-none absolute inset-8 rounded-3xl border-4 border-white/80" />
      </div>
      {status && <p className="text-sm font-semibold text-slate-700">{status}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
