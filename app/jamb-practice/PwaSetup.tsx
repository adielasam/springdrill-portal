'use client';

import { useEffect, useState } from 'react';

// Minimal shape of the beforeinstallprompt event (not in lib.dom).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Registers the offline service worker and shows a genuine Install button
// ONLY when the browser fires beforeinstallprompt (i.e. the app is
// actually installable here). No dead buttons: if the event never fires,
// nothing renders.
export default function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      // The worker's fetch handler is allow-listed to the practice page,
      // the pack JSON and hashed static assets only — it can never serve
      // stale portal pages. See public/sw.js.
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is a bonus; the page works online without it.
      });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="sd-jp-install-note">SpringDrill is installed on this device.</p>;
  }
  if (!installEvent) return null;

  const install = async () => {
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch {
      // The browser dismissed the prompt; the button stays for another try.
    } finally {
      setInstallEvent(null);
    }
  };

  return (
    <button type="button" className="sd-jp-install" onClick={install}>
      Install SpringDrill on this device
    </button>
  );
}
