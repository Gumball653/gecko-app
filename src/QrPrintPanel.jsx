import React, { useState } from "react";
import QRCode from "qrcode";

function generateCodes(prefix, count) {
  const results = [];
  for (let i = 1; i <= count; i++) {
    results.push(`${prefix}-${String(i).padStart(3, "0")}`);
  }
  return results;
}

export default function QrPrintPanel() {
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("QR-A");
  const [count, setCount] = useState(12);
  const [codes, setCodes] = useState([]);

  async function handleGenerate() {
    const list = generateCodes(prefix, count);
    const withImages = await Promise.all(
      list.map(async (code) => ({
        code,
        img: await QRCode.toDataURL(code),
      }))
    );
    setCodes(withImages);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-xl"
      >
        Print QR
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto p-4">
          <div className="mb-4 flex gap-2">
            <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="Prefix (QR-A)" className="border p-2" />
            <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} className="border p-2 w-24" />
            <button onClick={handleGenerate} className="bg-black text-white px-4">Generate</button>
            <button onClick={handlePrint} className="bg-blue-600 text-white px-4">Print</button>
            <button onClick={() => setOpen(false)} className="px-4">Close</button>
          </div>

          <div className="grid grid-cols-3 gap-4 print:grid-cols-4">
            {codes.map(({ code, img }) => (
              <div key={code} className="border p-2 text-center">
                <img src={img} alt={code} />
                <div className="text-sm font-mono">{code}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
