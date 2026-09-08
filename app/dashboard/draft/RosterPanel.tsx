'use client';

import { useState } from 'react';

export type RosterEntry = { pickNumber: number; teamName: string };
export type PickHistoryEntry = { pickNumber: number; ownerName: string; teamName: string };

type Tab = 'roster' | 'history';

function RosterList({ ownerName, picks }: { ownerName: string | null; picks: RosterEntry[] }) {
  return (
    <>
      <p className="font-semibold text-gray-900">{ownerName ?? 'Select a team'}</p>
      {picks.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {picks.map((p) => (
            <li key={p.pickNumber} className="flex items-baseline gap-2 text-sm">
              <span className="w-8 shrink-0 text-xs text-gray-400">#{p.pickNumber}</span>
              <span className="text-gray-800">{p.teamName}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No picks yet.</p>
      )}
    </>
  );
}

function HistoryList({ history }: { history: PickHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No picks made yet.</p>;
  }
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {history.map((p) => (
        <li key={p.pickNumber} className="flex items-baseline gap-2 text-sm">
          <span className="w-8 shrink-0 text-xs text-gray-400">#{p.pickNumber}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-gray-800">{p.teamName}</span>
            <span className="block truncate text-xs text-gray-500">{p.ownerName}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function RosterPanel({
  ownerName,
  picks,
  pickHistory,
}: {
  ownerName: string | null;
  picks: RosterEntry[];
  pickHistory: PickHistoryEntry[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('roster');

  const tabBar = (
    <div className="flex border-b border-gray-200">
      {(['roster', 'history'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
            tab === t
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t === 'roster' ? 'Roster' : 'Pick History'}
        </button>
      ))}
    </div>
  );

  const content = (
    <div className="pt-3">
      {tab === 'roster' ? <RosterList ownerName={ownerName} picks={picks} /> : <HistoryList history={pickHistory} />}
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:w-80 lg:shrink-0">
      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {tab === 'roster' ? `Roster — ${ownerName ?? 'Select a team'}` : 'Pick History'}
          </span>
          <span className="text-gray-400">{mobileOpen ? '▲' : '▼'}</span>
        </button>
        {mobileOpen ? (
          <div className="px-4 pb-4">
            {tabBar}
            {content}
          </div>
        ) : null}
      </div>

      {/* Desktop: always open */}
      <div className="hidden p-5 lg:block">
        {tabBar}
        {content}
      </div>
    </div>
  );
}
