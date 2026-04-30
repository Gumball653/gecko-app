import React from "react";

export default function BottomNav() {
  function vibrate() {
    navigator.vibrate?.(10);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 ios-blur border-t border-slate-200">
      <div className="mx-auto flex max-w-md justify-around py-2 text-xs font-semibold text-slate-700">
        <button onClick={vibrate}>Home</button>
        <button onClick={vibrate}>Animals</button>
        <button onClick={vibrate}>Scan</button>
        <button onClick={vibrate}>Logs</button>
        <button onClick={vibrate}>Settings</button>
      </div>
    </div>
  );
}
