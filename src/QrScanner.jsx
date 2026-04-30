import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

function isCameraSupported() {
  return Boolean(
    window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export default function QrScanner({ onScan }) {
  const scannerRef = useRef(null);
  const fileScannerRef = useRef(null);
  const [error, setError] = useState("");
  const [cameraSupported, setCameraSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      if (!isCameraSupported()) {
        setCameraSupported(false);
        setError("Live camera scanning is not available in this browser. Use the image upload option below.");
        return;
      }

      try {
        const scanner = new Html5Qrcode("qr-reader", { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: { ideal: "environment" } },
          { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          async (decodedText) => {
            if (cancelled) return;
            onScan(decodedText);
            await scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err) {
        setCameraSupported(false);
        setError("Camera scanning could not start. Check camera permission, use HTTPS, or upload a QR image below.");
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.stop?.().catch(() => {});
      scannerRef.current?.clear?.().catch(() => {});
    };
  }, [onScan]);

  async function handleFileScan(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const scanner = fileScannerRef.current || new Html5Qrcode("qr-file-reader", { verbose: false });
      fileScannerRef.current = scanner;
      const result = await scanner.scanFile(file, true);
      onScan(result);
      setError("");
    } catch (err) {
      setError("Could not read a QR code from that image. Try a clearer photo.");
    }
  }

  return (
    <div className="space-y-3">
      {cameraSupported && <div id="qr-reader" className="overflow-hidden rounded-2xl" style={{ width: "100%" }} />}
      <div id="qr-file-reader" className="hidden" />

      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">{error}</p>}

      <label className="block rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-700">
        Upload QR image instead
        <input type="file" accept="image/*" capture="environment" onChange={handleFileScan} className="mt-3 block w-full text-sm" />
      </label>
    </div>
  );
}
