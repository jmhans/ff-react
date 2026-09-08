'use client';

import { useTransition } from 'react';
import { setPickStarterStatus } from '@/app/lib/ff-draft-actions';

export default function StarterToggle({
  pickId,
  week,
  isStarter,
}: {
  pickId: string;
  week: number;
  isStarter: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setPickStarterStatus(pickId, week, !isStarter);
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        isStarter ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {isStarter ? 'Starter' : 'Bench'}
    </button>
  );
}
