'use client';

import { useState, useTransition } from 'react';
import { refreshNow } from '@/app/lib/refresh-actions';

export default function RefreshNowButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshNow();
      if (result.success) {
        setMessage('Refreshed rosters and win probabilities.');
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? 'Refreshing…' : 'Refresh Now'}
      </button>
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}
