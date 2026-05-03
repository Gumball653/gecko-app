import QRCode from "./ProfileQrModal";

export function normalizeQrCode(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return "";
  return clean.startsWith("QR-") ? clean : `QR-${clean}`;
}

export const QR_RENDER_OPTIONS = {
  errorCorrectionLevel: "H",
  margin: 4,
  width: 420,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
};

export async function makeQrDataUrl(code) {
  const normalized = normalizeQrCode(code);
  return QRCode.toDataURL(normalized, QR_RENDER_OPTIONS);
}
