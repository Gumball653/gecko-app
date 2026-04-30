import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function startScanner() {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices?.[0]?.deviceId;

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (result && active) {
            onScan(result.getText());
            reader.reset();
          }
        });
      } catch (err) {
        setError("Camera scanning failed. Allow camera permission.");
      }
    }

    startScanner();

    return () => {
      active = false;
      readerRef.current?.reset();
    };
  }, [onScan]);

  return (
    <div className="space-y-3">
      <video ref={videoRef} className="w-full rounded-2xl bg-black" autoPlay muted playsInline />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
