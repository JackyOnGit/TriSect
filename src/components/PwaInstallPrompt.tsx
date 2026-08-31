import React, { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const DISMISS_STORAGE_KEY = 'trisect-pwa-install-dismissed';

const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return true;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setDismissed(window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'true');

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
      window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === 'accepted') {
      handleDismiss();
    }
  };

  if (isStandalone || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Install TriSect on your phone</p>
          <p className="mt-1 text-sm text-gray-600">
            Add the app to your Android home screen for a faster, full-screen experience.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Install app
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
