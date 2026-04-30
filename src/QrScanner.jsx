import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const fileScannerRef = useRef(null);
  const [error, setError] = useState("");
  const [usingNative, setUsingNative] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function startNativeScanner() {
      if (!window.isSecureContext) {
        setError("Camera requires HTTPS. Open the deployed Vercel site, not a preview inside another app.");
        return;
      }

      if (!("BarcodeDetector" in window)) {
        setError("Live scanning is not supported by this phone browser. Use the QR photo upload option below.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        streamRef.current = stream;
        setUsingNative(true);

        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();

        async function scanFrame() {
          if (stopped || !video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          try {
            const codes = await detector.detect(video);
            if (codes?.length) {
              const value = codes[0].rawValue;
              onScan(value);
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
          } catch {}

          rafRef.current = requestAnimationFrame(scanFrame);
        }

        scanFrame();
      } catch (err) {
        setError("Camera could not start. Allow camera permission or use the QR photo upload option below.");
      }
    }

    startNativeScanner();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
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
    } catch {
      setError("Could not read a QR code from that image. Try taking a closer, clearer photo of the label.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <video ref={videoRef} className={`w-full rounded-2xl bg-black ${usingNative ? "block" : "hidden"}`} muted playsInline />
      <div id="qr-file-reader" className="hidden" />

      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">{error}</p>}

      <label className="block rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-700">
        Take/upload QR photo instead
        <input type="file" accept="image/*" capture="environment" onChange={handleFileScan} className="mt-3 block w-full text-sm" />
      </label>
    </div>
  );
}
