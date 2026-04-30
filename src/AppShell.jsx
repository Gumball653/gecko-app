import { useEffect, useState } from "react";

export default function AppShell({ children }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const timer = setTimeout(() => setLoading(false), 800);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="mb-4 text-2xl font-bold">Reptile Notes</div>
            <div className="animate-pulse text-sm">Loading...</div>
          </div>
        </div>
      )}

      {!online && (
        <div className="fixed top-0 z-[998] w-full bg-amber-500 p-2 text-center text-sm font-semibold text-black">
          Offline mode — changes will sync when back online
        </div>
      )}

      {children}
    </>
  );
}
