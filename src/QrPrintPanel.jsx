import React, { useMemo, useState } from "react";
import { makeQrDataUrl, normalizeQrCode } from "./qrUtils";

const LABEL_SIZES = {
  small: { name: "Small rack labels - 18 per page", cols: 3, width: "2.35in", height: "1.35in", qrClass: "h-20 w-20", defaultCount: 18 },
  medium: { name: "Medium enclosure labels - 12 per page", cols: 3, width: "2.35in", height: "1.95in", qrClass: "h-24 w-24", defaultCount: 12 },
  large: { name: "Large display labels - 8 per page", cols: 2, width: "3.45in", height: "2.45in", qrClass: "h-32 w-32", defaultCount: 8 },
};

function pad(number) {
  return String(number).padStart(3, "0");
}

function buildRange(prefix, start, count) {
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => ({
    code: normalizeQrCode(`${prefix}-${pad((Number(start) || 1) + index)}`),
    name: "",
    species: "",
    morph: "",
    notes: "",
  }));
}

function parseBulkText(text) {
  return String(text || "")
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
  const [labelSize, setLabelSize] = useState("medium");
  const [count, setCount] = useState(LABEL_SIZES.medium.defaultCount);
  const [bulkText, setBulkText] = useState("QR-A-001,Juno,Ball Python,Pastel het Pied\nQR-A-002,Atlas,Ball Python,Clown line\nQR-H-001,Rack 2 Tub 7,Housing,Adult female tub");
  const [labels, setLabels] = useState([]);
  const [message, setMessage] = useState("");

  const size = LABEL_SIZES[labelSize];

  async function makeLabels(items) {
    setMessage("Generating real QR codes...");
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
    setMessage(`Generated ${withImages.length} QR label${withImages.length === 1 ? "" : "s"}.`);
  }

  function generateRange() {
    makeLabels(buildRange(prefix, start, count));
  }

  function generateFromBulk() {
    makeLabels(parseBulkText(bulkText));
  }

  function updateLabel(index, field, value) {
    setLabels((current) =>
      current.map((label, i) =>
        i === index ? { ...label, [field]: field === "code" ? normalizeQrCode(value) : value } : label
      )
    );
  }

  const printStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${size.cols}, ${size.width})`,
  }), [size]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-xl hover:bg-emerald-700"
      >
        Print QR
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] overflow-auto bg-white p-4 text-slate-900">
          <div className="mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Print QR Codes</h2>
                <p className="text-sm text-slate-600">Generate real QR labels, choose a size, then print.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm font-semibold">
                Label size
                <select
                  value={labelSize}
                  onChange={(event) => {
                    const nextSize = event.target.value;
                    setLabelSize(nextSize);
                    setCount(LABEL_SIZES[nextSize].defaultCount);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  {Object.entries(LABEL_SIZES).map(([key, item]) => (
                    <option key={key} value={key}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Prefix
                <input
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-semibold">
                Start number
                <input
                  type="number"
                  min="1"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-semibold">
                Count
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </label>
            </div>

            <label className="text-sm font-semibold">
              Bulk labels: code, name, species, morph
              <textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={generateRange} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">
                Generate Range
              </button>
              <button type="button" onClick={generateFromBulk} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">
                Generate From Bulk
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
                disabled={labels.length === 0}
              >
                Print
              </button>
            </div>
            {message && <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{message}</p>}
          </div>

          {labels.length === 0 && (
            <p className="mx-auto max-w-5xl rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 print:hidden">
              Click Generate Range or Generate From Bulk to create printable QR labels.
            </p>
          )}

          <div id="qr-print-area" className="mx-auto grid max-w-5xl gap-3" style={printStyle}>
            {labels.map((label, index) => (
              <div
                key={`${label.code}-${index}`}
                className="qr-label flex items-center gap-2 rounded border-2 border-slate-950 bg-white p-2"
                style={{ width: size.width, height: size.height }}
              >
                <img src={label.img} alt={label.code} className={`${size.qrClass} shrink-0 bg-white`} style={{ imageRendering: "pixelated" }} />
                <div className="min-w-0 text-left leading-tight">
                  <input value={label.name || ""} onChange={(event) => updateLabel(index, "name", event.target.value)} placeholder="Name" className="w-full border-0 bg-transparent text-sm font-black outline-none" />
                  <input value={label.species || ""} onChange={(event) => updateLabel(index, "species", event.target.value)} placeholder="Species" className="w-full border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none" />
                  <input value={label.morph || ""} onChange={(event) => updateLabel(index, "morph", event.target.value)} placeholder="Morph / note" className="w-full border-0 bg-transparent text-xs text-slate-600 outline-none" />
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
