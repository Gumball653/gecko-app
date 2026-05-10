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
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        video.muted = true;
        await video.play();

        setStatus("Point camera at QR code...");
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

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

          scanCount += 1;
          if (scanCount % 10 === 0) {
            setStatus(`Scanning... frames checked: ${scanCount}`);
            setDebug(`Camera ${video.videoWidth}x${video.videoHeight}`);
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
      </div>
      {status && <p className="text-sm font-semibold text-slate-700">{status}</p>}
      {debug && <p className="rounded-lg bg-slate-100 p-2 font-mono text-[11px] text-slate-600">{debug}</p>}
      <p className="text-xs text-slate-500">Tip: center the QR code in the camera view. If scanning a screen, turn brightness up and avoid glare.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
