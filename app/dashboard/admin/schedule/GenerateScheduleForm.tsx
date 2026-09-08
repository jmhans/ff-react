'use client';

import { useState, useTransition } from 'react';
import { generateSchedule } from '@/app/lib/ff-schedule-actions';

export default function GenerateScheduleForm({ hasFinalWeeks }: { hasFinalWeeks: boolean }) {
  const [weeks, setWeeks] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateSchedule(weeks);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">Generate Schedule</h2>
      <p className="mt-1 text-sm text-gray-600">
        Builds a round-robin schedule across all active owners for the given number of weeks.
      </p>

      {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="weeks" className="block text-xs font-medium text-gray-700">
            Weeks
          </label>
          <input
            id="weeks"
            type="number"
            min={1}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            disabled={hasFinalWeeks}
            className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || hasFinalWeeks}
          className="rounded-md bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Generate Schedule
        </button>
      </div>
      {hasFinalWeeks ? (
        <p className="mt-2 text-xs text-gray-500">Some weeks are already final — the schedule is locked.</p>
      ) : null}
    </div>
  );
}
