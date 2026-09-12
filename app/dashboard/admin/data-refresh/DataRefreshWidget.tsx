'use client';

import { useTransition, useState } from 'react';
import {
  adminRefreshRosters,
  adminRefreshActuals,
  adminRefreshWinProbabilities,
  adminRefreshPoolWinProbabilities,
  type AdminRefreshResult,
} from '@/app/lib/ff-admin-refresh-actions';

type ActionKey = 'rosters' | 'actuals' | 'winProb' | 'poolWinProb';

const ACTIONS: { key: ActionKey; title: string; description: string; run: () => Promise<AdminRefreshResult> }[] = [
  {
    key: 'rosters',
    title: 'Sleeper Rosters',
    description: 'Re-sync every pool league’s current roster (who’s on each Sleeper team right now).',
    run: adminRefreshRosters,
  },
  {
    key: 'actuals',
    title: 'Actual Stats/Scores',
    description: 'Pull the latest per-player actual stats from Sleeper for the current week.',
    run: adminRefreshActuals,
  },
  {
    key: 'winProb',
    title: 'Win Probability',
    description: 'Re-run the live actual+remaining-projection simulation for every drafted team.',
    run: adminRefreshWinProbabilities,
  },
  {
    key: 'poolWinProb',
    title: 'Pool Win Probability',
    description: 'Same simulation, for every team in the pool (not just drafted ones) — powers the Sleeper Team Pool in-season view. Run rosters first if it’s been a while.',
    run: adminRefreshPoolWinProbabilities,
  },
];

export default function DataRefreshWidget() {
  const [isPending, startTransition] = useTransition();
  const [runningKey, setRunningKey] = useState<ActionKey | null>(null);
  const [results, setResults] = useState<Record<ActionKey, AdminRefreshResult | null>>({
    rosters: null,
    actuals: null,
    winProb: null,
    poolWinProb: null,
  });

  function handleRun(action: (typeof ACTIONS)[number]) {
    setRunningKey(action.key);
    startTransition(async () => {
      const result = await action.run();
      setResults((prev) => ({ ...prev, [action.key]: result }));
      setRunningKey(null);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">Data Refresh</h2>
      <p className="mt-1 text-sm text-gray-600">
        Manually trigger any of the daily refresh steps — useful mid-week if something looks stale.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action) => {
          const result = results[action.key];
          const isRunning = isPending && runningKey === action.key;
          return (
            <div key={action.key} className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{action.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{action.description}</p>
              <button
                type="button"
                onClick={() => handleRun(action)}
                disabled={isPending}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunning ? 'Running…' : 'Refresh'}
              </button>
              {result ? (
                <p className={`mt-2 text-xs ${result.success ? 'text-gray-600' : 'text-red-600'}`}>
                  {result.success ? result.message : result.error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
