'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBell } from '@tabler/icons-react';
import type { AppNotification } from '@/lib/useNotifications';

interface NotificationsMenuProps {
  notifications: AppNotification[];
  unreadCount: number;
  onOpen: () => void;
}

const TONE_DOT: Record<AppNotification['tone'], string> = {
  positive: 'bg-accent-green',
  negative: 'bg-accent-red',
  neutral: 'bg-ink-300',
};

// Short relative time for the notification timescale ("just now" … "3d ago").
function relativeTime(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Steam-style notification tray: a bell with an unread badge and a quiet
// dropdown of recent system events. Opening marks everything read.
export default function NotificationsMenu({
  notifications,
  unreadCount,
  onOpen,
}: NotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      if (next) onOpen(); // Mark read on open, like Steam.
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="opaque-toolbar-icon relative"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-accent-red px-1 font-mono text-[9px] font-medium leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="opaque-menu-popover" data-overlay>
          <div className="opaque-menu-panel">
            <div className="flex items-center justify-between border-b border-border-light px-3.5 py-2.5">
              <span className="font-serif text-sm text-text-primary">Notifications</span>
              {notifications.length > 0 && (
                <span className="font-mono text-[10px] text-text-tertiary">
                  {notifications.length}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-3.5 py-6 text-center text-xs text-text-tertiary">
                Nothing new.
              </div>
            ) : (
              <div className="max-h-80 divide-y divide-border-light overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                    <span
                      className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE_DOT[notification.tone]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs leading-relaxed text-text-primary">
                        {notification.title}
                      </div>
                      {notification.detail && (
                        <div className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">
                          {notification.detail}
                        </div>
                      )}
                      <div className="mt-1 font-mono text-[10px] text-text-muted">
                        {relativeTime(notification.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
