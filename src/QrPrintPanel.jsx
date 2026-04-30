import React, { useMemo, useState } from "react";
import QRCode from "qrcode";

const LABEL_SIZES = {
  small: { name: "Small rack labels", cols: 3, width: "2.5in", height: "1.5in", qrClass: "h-28 w-28" },
  medium: { name: "Medium enclosure labels", cols: 2, width: "3.25in", height: "2.0in", qrClass: "h-32 w-32" },
  large: { name: "Large display labels", cols: 2, width: "3.75in", height: "2.5in", qrClass: "h-40 w-40" },
};

function pad(number) {
  return String(number).padStart(3, "0");
}

function normalizeCode(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return "";
  return clean.startsWith("QR-") ? clean : `QR-${clean}`;
}

function buildRange(prefix, start, count) {
  return Array.from({ length: count }, (_, index) => ({
    code: normalizeCode(`${prefix}-${pad(start + index)}`),
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
      return { code: normalizeCode(code), name, species, morph, notes };
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
        const code = normalizeCode(item.code);
        return {
          ...item,
          code,
          img: await QRCode.toDataURL(code, {
            errorCorrectionLevel: "H",
            margin: 4,
            width: 420,
            color: { dark: "#000000", light: "#ffffff" },
          }),
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
    setLabels((current) => current.map((label, i) => (i === index ? { ...label, [field]: field === "code" ? normalizeCode(value) : value } : label)));
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
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #qr-print-area, #qr-print-area * { visibility: visible; }
              #qr-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
              .qr-label { break-inside: avoid; page-break-inside: avoid; }
              img { image-rendering: pixelated; }
            }
          `}</style>

          <div className="no-print mb-4 rounded-2xl border bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">Smart QR Label Generator</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Print</button>
                <button onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 font-bold">Close</button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl bg-white p-3 shadow-sm">
                <h3 className="mb-2 font-bold">Advanced range generator</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="rounded border p-2" placeholder="QR-A" />
                  <input type="number" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border p-2" placeholder="Start" />
                  <input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="rounded border p-2" placeholder="Count" />
                  <button onClick={generateRange} className="rounded bg-slate-950 p-2 font-bold text-white">Generate</button>
                </div>
                <p className="mt-2 text-sm text-slate-500">Examples: QR-A animals, QR-E eggs, QR-H housing. QR is now larger/high-contrast for reliable scanning.</p>
              </section>

              <section className="rounded-xl bg-white p-3 shadow-sm">
                <h3 className="mb-2 font-bold">Label size</h3>
                <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)} className="w-full rounded border p-2">
                  {Object.entries(LABEL_SIZES).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}
                </select>
              </section>
            </div>

            <section className="mt-4 rounded-xl bg-white p-3 shadow-sm">
              <h3 className="mb-2 font-bold">Bulk smart labels</h3>
              <p className="mb-2 text-sm text-slate-500">One label per line: code, name, species/type, morph/location, notes</p>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="h-28 w-full rounded border p-2 font-mono text-sm" />
              <button onClick={generateFromBulk} className="mt-2 rounded bg-emerald-600 px-4 py-2 font-bold text-white">Generate from bulk list</button>
            </section>

            {labels.length > 0 && (
              <section className="mt-4 rounded-xl bg-white p-3 shadow-sm">
                <h3 className="mb-2 font-bold">Edit labels before printing</h3>
                <div className="max-h-64 overflow-auto">
                  {labels.map((label, index) => (
                    <div key={`${label.code}-${index}`} className="grid gap-2 border-b py-2 md:grid-cols-5">
                      <input value={label.code} onChange={(e) => updateLabel(index, "code", e.target.value)} className="rounded border p-2 font-mono" />
                      <input value={label.name} onChange={(e) => updateLabel(index, "name", e.target.value)} className="rounded border p-2" placeholder="Name" />
                      <input value={label.species} onChange={(e) => updateLabel(index, "species", e.target.value)} className="rounded border p-2" placeholder="Species/Type" />
                      <input value={label.morph} onChange={(e) => updateLabel(index, "morph", e.target.value)} className="rounded border p-2" placeholder="Morph/Location" />
                      <input value={label.notes} onChange={(e) => updateLabel(index, "notes", e.target.value)} className="rounded border p-2" placeholder="Notes" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div id="qr-print-area" className="grid gap-3" style={printStyle}>
            {labels.map((label, index) => (
              <div key={`${label.code}-${index}`} className="qr-label flex items-center gap-3 rounded border-2 border-slate-950 bg-white p-2" style={{ width: size.width, height: size.height }}>
                <img src={label.img} alt={label.code} className={`${size.qrClass} shrink-0 bg-white`} style={{ imageRendering: "pixelated" }} />
                <div className="min-w-0 text-left leading-tight">
                  <p className="truncate text-sm font-black">{label.name || "Reptile Notes"}</p>
                  <p className="truncate text-xs font-semibold text-slate-700">{label.species}</p>
                  <p className="truncate text-xs text-slate-600">{label.morph}</p>
                  <p className="mt-1 font-mono text-sm font-black text-black">{label.code}</p>
                  {label.notes && <p className="truncate text-[10px] text-slate-500">{label.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
