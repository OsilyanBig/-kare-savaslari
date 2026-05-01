// components/ui/Notification.tsx
'use client';

import { useUIStore } from '@/lib/store';
import { useEffect } from 'react';

export default function Notification() {
  const { notification, clearNotification } = useUIStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div className={`notification ${notification.type}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icons[notification.type]}</span>
        <span>{notification.message}</span>
        <button
          onClick={clearNotification}
          className="ml-4 opacity-70 hover:opacity-100 transition-opacity text-lg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}