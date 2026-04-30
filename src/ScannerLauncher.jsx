import React, { useState } from "react";
import QrScanner from "./QrScanner";

function flashElement(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("ring-4", "ring-emerald-400", "ring-offset-2");
  window.setTimeout(() => element.classList.remove("ring-4", "ring-emerald-400", "ring-offset-2"), 3000);
}

function findTextElement(code) {
  const candidates = Array.from(document.querySelectorAll("button, [role='button'], a, div, article, section, li"));
  return candidates.find((el) => el.textContent && el.textContent.includes(code));
}

function autoOpenScannedProfile(code) {
  const escapedCode = CSS.escape(code);
  const directMatch = document.querySelector(`[data-qr-code="${escapedCode}"], [data-animal-id="${escapedCode}"], [data-profile-id="${escapedCode}"]`);

  if (directMatch) {
    const clickable = directMatch.closest("button, [role='button'], a") || directMatch.querySelector("button, [role='button'], a") || directMatch;
    clickable.click?.();
    flashElement(directMatch);
    return true;
  }

  const textMatch = findTextElement(code);
  if (textMatch) {
    const clickable = textMatch.closest("button, [role='button'], a") || textMatch;
    clickable.click?.();
    flashElement(textMatch);
    return true;
  }

  const shortId = code.replace(/^QR-/, "");
  const shortMatch = findTextElement(shortId);
  if (shortMatch) {
    const clickable = shortMatch.closest("button, [role='button'], a") || shortMatch;
    clickable.click?.();
    flashElement(shortMatch);
    return true;
  }

  return false;
}

export default function ScannerLauncher() {
  const [open, setOpen] = useState(false);
  const [lastScan, setLastScan] = useState("");
  const [scanMessage, setScanMessage] = useState("");

  function handleScan(result) {
    setLastScan(result);
    setOpen(false);

    window.dispatchEvent(
      new CustomEvent("reptile-notes-qr-scan", {
        detail: { code: result },
      })
    );

    window.setTimeout(() => {
      const opened = autoOpenScannedProfile(result);
      setScanMessage(opened ? `Opened ${result}` : `Scanned ${result}, but no matching profile was visible.`);
    }, 150);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800"
      >
        Scan QR
      </button>

      {(lastScan || scanMessage) && (
        <div className="fixed bottom-20 right-4 z-40 max-w-xs rounded-2xl bg-white p-3 text-sm shadow-lg">
          {lastScan && <p>Last scan: <span className="font-mono font-semibold">{lastScan}</span></p>}
          {scanMessage && <p className="mt-1 text-slate-600">{scanMessage}</p>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Scan QR Code</h2>
                <p className="text-sm text-slate-500">Point your camera at an animal, egg, or housing QR code.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <QrScanner onScan={handleScan} />
          </div>
        </div>
      )}
    </>
  );
}
