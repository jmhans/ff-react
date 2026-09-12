'use client';

import { useMemo, useState } from 'react';
import { OwnerPlayerDetails } from '@/app/lib/ff-player-details';

function OwnerPlayerTable({ side }: { side: OwnerPlayerDetails }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 p-4 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{side.ownerName}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3"># For</th>
              <th className="px-4 py-3">Pts For</th>
              <th className="px-4 py-3"># Against</th>
              <th className="px-4 py-3">Pts Against</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {side.players.map((p) => (
              <tr key={p.playerId}>
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                  {p.name}
                  {!p.hasPlayed ? <span className="ml-1.5 text-xs text-gray-400">•</span> : null}
                </td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.position ?? '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countFor || '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countFor ? p.ptsFor.toFixed(1) : '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countAgainst || '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countAgainst ? p.ptsAgainst.toFixed(1) : '-'}</td>
              </tr>
            ))}
            {side.players.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No players to show.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlayerDetailsView({ home, away }: { home: OwnerPlayerDetails; away: OwnerPlayerDetails }) {
  const [remainingOnly, setRemainingOnly] = useState(false);

  const filteredHome = useMemo(
    () => (remainingOnly ? { ...home, players: home.players.filter((p) => !p.hasPlayed) } : home),
    [home, remainingOnly],
  );
  const filteredAway = useMemo(
    () => (remainingOnly ? { ...away, players: away.players.filter((p) => !p.hasPlayed) } : away),
    [away, remainingOnly],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRemainingOnly(false)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            !remainingOnly ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
          }`}
        >
          All Players
        </button>
        <button
          type="button"
          onClick={() => setRemainingOnly(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            remainingOnly ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
          }`}
        >
          Remaining Players Only
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OwnerPlayerTable side={filteredHome} />
        <OwnerPlayerTable side={filteredAway} />
      </div>
    </div>
  );
}
