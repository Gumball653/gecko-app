import React, { useMemo, useState } from "react";
import { makeQrDataUrl, normalizeQrCode } from "./qrUtils";

const LABEL_SIZES = {
  small: { name: "Small rack labels", cols: 3, width: "2.5in", height: "1.5in", qrClass: "h-28 w-28" },
  medium: { name: "Medium enclosure labels", cols: 2, width: "3.25in", height: "2.0in", qrClass: "h-32 w-32" },
  large: { name: "Large display labels", cols: 2, width: "3.75in", height: "2.5in", qrClass: "h-40 w-40" },
};

function pad(number) {
  return String(number).padStart(3, "0");
}

function buildRange(prefix, start, count) {
  return Array.from({ length: count }, (_, index) => ({
    code: normalizeQrCode(`${prefix}-${pad(start + index)}`),
    name: "",
    species: "",
    morph: "",
    notes: "",
  }));
}

function parseBulkText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [code = "", name = "", species = "", morph = "", notes = ""] = line.split(",").map((part) => part.trim());
      return { code: normalizeQrCode(code), name, species, morph, notes };
    })
    .filter((item) => item.code);
}

export default function QrPrintPanel() {
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("QR-A");
  const [start, setStart] = useState(1);
  const [count, setCount] = useState(12);
  const [labelSize, setLabelSize] = useState("medium");
  const [bulkText, setBulkText] = useState("QR-A-001,Juno,Ball Python,Pastel het Pied\nQR-A-002,Atlas,Ball Python,Clown line\nQR-H-001,Rack 2 Tub 7,Housing,Adult female tub");
  const [labels, setLabels] = useState([]);

  const size = LABEL_SIZES[labelSize];

  async function makeLabels(items) {
    const withImages = await Promise.all(
      items.map(async (item) => {
        const code = normalizeQrCode(item.code);
        return {
          ...item,
          code,
          img: await makeQrDataUrl(code),
        };
      })
    );
    setLabels(withImages);
  }

  function generateRange() {
    makeLabels(buildRange(prefix, Number(start), Number(count)));
  }

  function generateFromBulk() {
    makeLabels(parseBulkText(bulkText));
  }

  function updateLabel(index, field, value) {
    setLabels((current) => current.map((label, i) => (i === index ? { ...label, [field]: field === "code" ? normalizeQrCode(value) : value } : label)));
  }

  const printStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${size.cols}, ${size.width})`,
  }), [size]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 left-4 z-50 rounded-full bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-xl">
        Print QR
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] overflow-auto bg-white p-4 text-slate-900">
          <div id="qr-print-area" className="grid gap-3" style={printStyle}>
            {labels.map((label, index) => (
              <div key={`${label.code}-${index}`} className="qr-label flex items-center gap-3 rounded border-2 border-slate-950 bg-white p-2" style={{ width: size.width, height: size.height }}>
                <img src={label.img} alt={label.code} className={`${size.qrClass} shrink-0 bg-white`} style={{ imageRendering: "pixelated" }} />
                <div className="min-w-0 text-left leading-tight">
                  <p className="truncate text-sm font-black">{label.name || "Reptile Notes"}</p>
                  <p className="truncate text-xs font-semibold text-slate-700">{label.species}</p>
                  <p className="truncate text-xs text-slate-600">{label.morph}</p>
                  <p className="mt-1 font-mono text-sm font-black text-black">{label.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
