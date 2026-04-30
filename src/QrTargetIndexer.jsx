import { useEffect } from "react";

const QR_PATTERN = /\bQR-[AEH]-\d{3,}\b/g;
const ID_PATTERN = /\b[AEH]-\d{3,}\b/g;

function getBestTarget(element) {
  return element.closest("button, [role='button'], a, article, section, li, .card") || element;
}

function indexQrTargets() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const found = new Map();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue || "";
    const qrMatches = text.match(QR_PATTERN) || [];
    const idMatches = text.match(ID_PATTERN) || [];

    [...qrMatches, ...idMatches.map((id) => `QR-${id}`)].forEach((qrCode) => {
      const parent = node.parentElement;
      if (!parent) return;
      const target = getBestTarget(parent);
      if (!found.has(qrCode)) found.set(qrCode, target);
    });
  }

  found.forEach((target, qrCode) => {
    target.setAttribute("data-qr-code", qrCode);
    target.setAttribute("data-profile-id", qrCode);
  });
}

export default function QrTargetIndexer() {
  useEffect(() => {
    indexQrTargets();

    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__qrTargetIndexTimer);
      window.__qrTargetIndexTimer = window.setTimeout(indexQrTargets, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
