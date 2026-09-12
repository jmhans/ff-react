'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { processPickup, type MyPick } from '@/app/lib/ff-pickup-actions';

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
  pickId: string | null; // set once someone's drafted this Sleeper team
  ownerName: string | null;
  isMine: boolean;
  // In-season
  wins: number | null;
  losses: number | null;
  ties: number | null;
  avgPointsFor: number | null; // season-to-date points, per game played
  avgRatio: number | null; // season-to-date points / that league's season-to-date average
  winProbWeek: number | null; // this week's live win probability
  opponentNameWeek: string | null;
};

type View = 'inseason' | 'preseason';
type SortKey = keyof Pick<
  TeamTableRow,
  | 'overallRank'
  | 'teamName'
  | 'leagueName'
  | 'ownerName'
  | 'projectedPoints'
  | 'histRanksDisplay'
  | 'histWinPct'
  | 'compositeZ'
  | 'wins'
  | 'avgPointsFor'
  | 'avgRatio'
  | 'winProbWeek'
>;
type SortDirection = 'asc' | 'desc';

const IN_SEASON_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'teamName', label: 'Team Name' },
  { key: 'leagueName', label: 'League' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'wins', label: 'W-L-T' },
  { key: 'avgPointsFor', label: 'Avg PF' },
  { key: 'avgRatio', label: 'Avg Ratio' },
  { key: 'winProbWeek', label: 'Win % (This Week)' },
];

const PRE_SEASON_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'overallRank', label: 'Overall Rank' },
  { key: 'teamName', label: 'Team Name' },
  { key: 'leagueName', label: 'League' },
  { key: 'ownerName', label: 'Owner' },
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

function PickupDialog({
  row,
  myPicks,
  onClose,
}: {
  row: TeamTableRow;
  myPicks: MyPick[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [dropPickId, setDropPickId] = useState(myPicks[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!dropPickId) return;
    setError(null);
    startTransition(async () => {
      const result = await processPickup(dropPickId, row.leagueKey, row.userId, row.teamName);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pick Up {row.teamName}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Choose a team to drop from your roster.</p>

        {myPicks.length === 0 ? (
          <p className="mt-4 text-sm text-red-600">You don&apos;t have any teams to drop.</p>
        ) : (
          <select
            value={dropPickId}
            onChange={(e) => setDropPickId(e.target.value)}
            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          >
            {myPicks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pickedName ?? 'Unnamed team'} {p.leagueName ? `(${p.leagueName})` : ''}
              </option>
            ))}
          </select>
        )}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || myPicks.length === 0}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Processing…' : 'Confirm Pickup'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamsTable({
  rows,
  canPickup,
  myPicks,
  currentWeek,
}: {
  rows: TeamTableRow[];
  canPickup: boolean;
  myPicks: MyPick[];
  currentWeek: number;
}) {
  const [view, setView] = useState<View>('inseason');
  const [sortKey, setSortKey] = useState<SortKey>('winProbWeek');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [freeAgentsOnly, setFreeAgentsOnly] = useState(true);
  const [pickupRow, setPickupRow] = useState<TeamTableRow | null>(null);

  const columns = view === 'inseason' ? IN_SEASON_COLUMNS : PRE_SEASON_COLUMNS;

  function setViewMode(next: View) {
    setView(next);
    setSortKey(next === 'inseason' ? 'winProbWeek' : 'overallRank');
    setSortDirection(next === 'inseason' ? 'desc' : 'asc');
  }

  const filteredRows = useMemo(
    () => (freeAgentsOnly ? rows.filter((r) => !r.ownerName) : rows),
    [rows, freeAgentsOnly],
  );

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey]);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('inseason')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === 'inseason' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            In-Season (Week {currentWeek})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preseason')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === 'preseason' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pre-Season
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFreeAgentsOnly(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              freeAgentsOnly ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Free Agents
          </button>
          <button
            type="button"
            onClick={() => setFreeAgentsOnly(false)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              !freeAgentsOnly ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Teams
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                {columns.map((col) => {
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
                {canPickup ? <th className="px-3 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.map((row) => (
                <tr key={row.key} className="align-top">
                  {view === 'preseason' ? (
                    <td className="px-3 py-3 font-medium text-gray-900">{row.overallRank ?? '-'}</td>
                  ) : null}
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/sleeper-pool/${row.leagueKey}/${row.userId}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {row.teamName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{row.leagueName}</td>
                  <td className="px-3 py-3 text-gray-700">
                    {row.ownerName ? (row.isMine ? `${row.ownerName} (you)` : row.ownerName) : 'Free Agent'}
                  </td>
                  {view === 'inseason' ? (
                    <>
                      <td className="px-3 py-3 text-gray-700">
                        {row.wins != null ? `${row.wins}-${row.losses}-${row.ties}` : '-'}
                      </td>
                      <td className="px-3 py-3">{row.avgPointsFor != null ? row.avgPointsFor.toFixed(1) : '-'}</td>
                      <td className="px-3 py-3">{row.avgRatio != null ? row.avgRatio.toFixed(3) : '-'}</td>
                      <td className="px-3 py-3">
                        {row.winProbWeek != null ? `${(row.winProbWeek * 100).toFixed(0)}%` : '-'}
                        {row.opponentNameWeek ? (
                          <span className="ml-1 text-xs text-gray-400">vs {row.opponentNameWeek}</span>
                        ) : null}
                      </td>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                  {canPickup ? (
                    <td className="px-3 py-3">
                      {!row.ownerName ? (
                        <button
                          type="button"
                          onClick={() => setPickupRow(row)}
                          className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
                        >
                          Pick Up
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length + (canPickup ? 1 : 0)}>
                    No teams found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {pickupRow ? <PickupDialog row={pickupRow} myPicks={myPicks} onClose={() => setPickupRow(null)} /> : null}
    </div>
  );
}
