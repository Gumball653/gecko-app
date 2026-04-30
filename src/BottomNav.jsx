import React from "react";

export default function BottomNav() {
  function vibrate() {
    navigator.vibrate?.(10);
  }

  function openScanner() {
    vibrate();
    window.dispatchEvent(new CustomEvent("reptile-notes-open-scanner"));
  }

  return (
    <div className="mobile-bottom-nav ios-blur border-t border-slate-200">
      <div className="mx-auto flex max-w-md justify-around py-6 text-base font-semibold text-slate-900">
        <button onClick={vibrate}>Home</button>
        <button onClick={vibrate}>Animals</button>
        <button onClick={openScanner} className="text-lg font-bold">Scan</button>
        <button onClick={vibrate}>Logs</button>
        <button onClick={vibrate}>Settings</button>
      </div>
    </div>
  );
}
