import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner({ onScan }) {
  const ref = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        onScan(decodedText);
        scanner.stop();
      },
      () => {}
    );

    return () => scanner.stop().catch(() => {});
  }, []);

  return <div id="qr-reader" style={{ width: "100%" }} />;
}
