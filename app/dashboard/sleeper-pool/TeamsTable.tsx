'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type TeamTableRow = {
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
  // Nulls always sort last, regardless of direction.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export default function TeamsTable({ rows }: { rows: TeamTableRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('overallRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey]);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
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
                      <span className="text-gray-400">
                        {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row) => (
              <tr key={row.key} className="align-top">
                <td className="px-3 py-3 font-medium text-gray-900">{row.overallRank ?? '-'}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/dashboard/sleeper-pool/${row.leagueKey}/${row.userId}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {row.teamName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-gray-700">{row.leagueName}</td>
                <td className="px-3 py-3">
                  {row.projectedPoints != null ? row.projectedPoints.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">{row.histRanksDisplay || '-'}</td>
                <td className="px-3 py-3">
                  {row.histWinPct != null ? row.histWinPct.toFixed(3) : '-'}
                </td>
                <td className="px-3 py-3">
                  {row.compositeZ != null ? row.compositeZ.toFixed(3) : '-'}
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={COLUMNS.length}>
                  No teams found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
