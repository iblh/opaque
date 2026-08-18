'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'opaque_cookie_consent';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);

  const acknowledge = () => {
    localStorage.setItem(CONSENT_KEY, 'acknowledged');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9000] w-[calc(100vw-2rem)] max-w-[30rem] rounded-sm border border-border-light bg-surface-elevated p-3 shadow-[0_18px_46px_rgba(0,0,0,0.10)] sm:flex sm:items-center sm:gap-4">
      <div className="flex-1 text-xs leading-relaxed text-text-secondary">
        OPAQUE uses only essential cookies for sign-in and local preferences.
      </div>
      <div className="mt-3 flex justify-end sm:mt-0">
        <button
          type="button"
          onClick={acknowledge}
          className="opaque-button-primary"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
