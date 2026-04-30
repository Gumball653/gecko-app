import React from "react";
import jsQR from "jsqr";

export default function QrScanner({ onScan }) {

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        onScan(code.data);
      } else {
        alert("No QR code found. Try a clearer photo.");
      }

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  return (
    <div className="space-y-3">
      <label className="block rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-700">
        📸 Tap to scan QR code
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="mt-3 block w-full"
        />
      </label>
    </div>
  );
}
