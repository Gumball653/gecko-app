import { useEffect } from "react";

function isScanButton(element) {
  const text = (element.textContent || "").trim().toLowerCase();
  const label = (element.getAttribute("aria-label") || "").trim().toLowerCase();
  const title = (element.getAttribute("title") || "").trim().toLowerCase();
  const combined = `${text} ${label} ${title}`;

  return (
    combined.includes("camera scan") ||
    combined.includes("scan camera") ||
    combined.includes("camera qr") ||
    combined.includes("scan qr") ||
    combined === "scan"
  );
}

export default function ScanButtonBridge() {
  useEffect(() => {
    function handleClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button, [role='button'], a");
      if (!button) return;

      // Leave the floating Scan QR button alone because it already opens the scanner directly.
      if (button.className && String(button.className).includes("bottom-4 right-4")) return;

      if (isScanButton(button)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("reptile-notes-open-scanner"));
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
