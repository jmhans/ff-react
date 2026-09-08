'use client';

import { useMemo, useState, useTransition } from 'react';
import { makePick } from '@/app/lib/ff-draft-actions';

export type AvailableTeamRow = {
  key: string;
  leagueKey: string;
  userId: string;
  overallRank: number | null;
  teamName: string;
  leagueName: string;
  projectedPoints: number | null;
  histRanksDisplay: string;
  histWinPct: number | null;
  compositeZ: number | null;
};

type SortKey = 'overallRank' | 'teamName' | 'leagueName' | 'projectedPoints' | 'histRanksDisplay' | 'histWinPct' | 'compositeZ';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'overallRank', label: 'Overall Rank' },
  { key: 'teamName', label: 'Team Name' },
  { key: 'leagueName', label: 'League' },
  { key: 'projectedPoints', label: 'Projected Points' },
  { key: 'histRanksDisplay', label: 'Historical Ranks' },
  { key: 'histWinPct', label: 'Hist Win Pct' },
  { key: 'compositeZ', label: 'Combined Z-Score' },
];

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export default function AvailableTeamsPanel({
  rows,
  draftId,
  isMyTurn,
  draftingForName,
}: {
  rows: AvailableTeamRow[];
  draftId: string;
  isMyTurn: boolean;
  draftingForName?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('overallRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selected, setSelected] = useState<AvailableTeamRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey]);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function confirmPick() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await makePick(draftId, selected.leagueKey, selected.userId, selected.teamName);
      if (!result.success) {
        setError(result.error);
      }
      setSelected(null);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {selected ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 p-3">
          <span className="text-sm text-blue-900">
            Draft <span className="font-semibold">{selected.teamName}</span>
            {draftingForName ? (
              <>
                {' '}
                for <span className="font-semibold">{draftingForName}</span>
              </>
            ) : null}
            ?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmPick}
              disabled={isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Drafting…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="border-b border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {!isMyTurn ? (
        <p className="border-b border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
          Waiting for the current picker — you&apos;ll be able to draft when it&apos;s your turn.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-3"></th>
              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <th key={col.key} className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      {col.label}
                      <span className="text-gray-400">{isActive ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row) => (
              <tr key={row.key} className="align-top">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    disabled={!isMyTurn}
                    onClick={() => {
                      setError(null);
                      setSelected(row);
                    }}
                    className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    Draft
                  </button>
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">{row.overallRank ?? '-'}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-gray-900">{row.teamName}</p>
                </td>
                <td className="px-3 py-3 text-gray-700">{row.leagueName}</td>
                <td className="px-3 py-3">{row.projectedPoints != null ? row.projectedPoints.toFixed(1) : '-'}</td>
                <td className="px-3 py-3 text-xs text-gray-700">{row.histRanksDisplay || '-'}</td>
                <td className="px-3 py-3">{row.histWinPct != null ? row.histWinPct.toFixed(3) : '-'}</td>
                <td className="px-3 py-3">{row.compositeZ != null ? row.compositeZ.toFixed(3) : '-'}</td>
              </tr>
            ))}
            {sortedRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={COLUMNS.length + 1}>
                  No teams left — draft complete.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
