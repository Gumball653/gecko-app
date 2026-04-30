import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Starting camera...");
  const [debug, setDebug] = useState("");

  useEffect(() => {
    let active = true;
    let scanCount = 0;

    async function startCamera() {
      try {
        if (!window.isSecureContext) {
          setError("Camera requires HTTPS. Open the live site, not an embedded preview.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("This browser does not allow in-app camera access.");
          return;
        }

        setStatus("Requesting camera permission...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        await video.play();

        setStatus("Scanning frames... hold QR code inside the box.");
        scanLoop();
      } catch (err) {
        setError(`Camera failed: ${err?.name || "Unknown error"}. Allow camera permission and use Safari/Chrome on the live site.`);
        setStatus("");
      }
    }

    function scanLoop() {
      if (!active) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvasRef.current = canvas;

        const scanSize = 960;
        canvas.width = scanSize;
        canvas.height = scanSize;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const side = Math.min(video.videoWidth, video.videoHeight);
        const sx = Math.max(0, (video.videoWidth - side) / 2);
        const sy = Math.max(0, (video.videoHeight - side) / 2);

        try {
          ctx.drawImage(video, sx, sy, side, side, 0, 0, scanSize, scanSize);
          const imageData = ctx.getImageData(0, 0, scanSize, scanSize);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

          scanCount += 1;
          if (scanCount % 10 === 0) {
            setStatus(`Scanning... frames checked: ${scanCount}`);
            setDebug(`Camera ${video.videoWidth}x${video.videoHeight} → scanning center ${scanSize}x${scanSize}`);
          }

          if (qr?.data) {
            setStatus(`QR found: ${qr.data}`);
            streamRef.current?.getTracks?.().forEach((track) => track.stop());
            onScan(qr.data);
            return;
          }
        } catch (err) {
          setDebug(`Frame read error: ${err?.name || "unknown"}`);
        }
      } else {
        setDebug(`Waiting for video frame... readyState=${video?.readyState || 0}`);
      }

      frameRef.current = window.setTimeout(scanLoop, 80);
    }

    startCamera();

    return () => {
      active = false;
      if (frameRef.current) window.clearTimeout(frameRef.current);
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" autoPlay muted playsInline />
        <div className="pointer-events-none absolute inset-4 rounded-3xl border-4 border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
      </div>
      {status && <p className="text-sm font-semibold text-slate-700">{status}</p>}
      {debug && <p className="rounded-lg bg-slate-100 p-2 font-mono text-[11px] text-slate-600">{debug}</p>}
      <p className="text-xs text-slate-500">Tip: fill most of the green box. If scanning a screen, turn brightness up and avoid glare.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
