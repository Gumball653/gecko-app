import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect iOS
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = window.navigator.standalone;

    if (isIOS && !isStandalone) {
      setShowIOSHelp(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (!deferredPrompt && !showIOSHelp) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 w-[90%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
      {deferredPrompt && (
        <>
          <p className="mb-2 font-semibold">Install this app</p>
          <button onClick={installApp} className="w-full rounded-xl bg-slate-950 px-4 py-2 text-white">Install</button>
        </>
      )}

      {showIOSHelp && (
        <>
          <p className="mb-2 text-sm">To install on iPhone:</p>
          <ol className="mb-2 list-decimal pl-4 text-sm">
            <li>Tap the Share button</li>
            <li>Select "Add to Home Screen"</li>
          </ol>
        </>
      )}
    </div>
  );
}
