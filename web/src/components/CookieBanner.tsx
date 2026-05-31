'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'opaque_cookie_consent';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);

  const setConsent = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(CONSENT_KEY, value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9000] w-[calc(100vw-2rem)] max-w-[34rem] rounded-sm border border-border-light bg-white p-3 shadow-[0_18px_46px_rgba(0,0,0,0.10)]">
      <div className="text-xs leading-relaxed text-text-secondary">
        OPAQUE uses essential cookies for sign-in and local preferences. No marketing cookies.
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setConsent('rejected')}
          className="opaque-button"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => setConsent('accepted')}
          className="opaque-button-primary"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
