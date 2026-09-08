'use client';

import { useState, useTransition } from 'react';
import DraftOrderStrip, { StripSlot } from './DraftOrderStrip';
import RosterPanel, { RosterEntry, PickHistoryEntry } from './RosterPanel';
import AvailableTeamsPanel, { AvailableTeamRow } from './AvailableTeamsPanel';
import PollingRefresher from './PollingRefresher';
import { undoLastPick } from '@/app/lib/ff-draft-actions';

export default function DraftLiveRoom({
  slots,
  currentPickNumber,
  viewerOwnerId,
  isMyTurn,
  isAdmin,
  draftId,
  poolRows,
  rostersByOwnerId,
  ownerNamesById,
  hasPicks,
  pickHistory,
}: {
  slots: StripSlot[];
  currentPickNumber: number;
  viewerOwnerId: string | null;
  isMyTurn: boolean;
  isAdmin: boolean;
  draftId: string;
  poolRows: AvailableTeamRow[];
  rostersByOwnerId: Record<string, RosterEntry[]>;
  ownerNamesById: Record<string, string>;
  hasPicks: boolean;
  pickHistory: PickHistoryEntry[];
}) {
  const currentSlot = slots.find((s) => s.pickNumber === currentPickNumber);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(currentSlot?.ownerId ?? null);
  const [adminMode, setAdminMode] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [isUndoing, startUndoTransition] = useTransition();

  const canDraftNow = isMyTurn || (isAdmin && adminMode);

  function handleUndo() {
    if (!window.confirm('Undo the most recent pick? This cannot be redone automatically.')) return;
    setUndoError(null);
    startUndoTransition(async () => {
      const result = await undoLastPick(draftId);
      if (!result.success) setUndoError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <PollingRefresher />

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-purple-900">
            <input
              type="checkbox"
              checked={adminMode}
              onChange={(e) => setAdminMode(e.target.checked)}
              className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
            />
            Admin mode — draft on behalf of whoever&apos;s turn it is
          </label>
          <button
            type="button"
            onClick={handleUndo}
            disabled={isUndoing || !hasPicks}
            className="rounded-md border border-purple-300 bg-white px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40"
          >
            {isUndoing ? 'Undoing…' : 'Undo Last Pick'}
          </button>
        </div>
      ) : null}
      {undoError ? <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{undoError}</p> : null}

      <DraftOrderStrip
        slots={slots}
        currentPickNumber={currentPickNumber}
        viewerOwnerId={viewerOwnerId}
        selectedOwnerId={selectedOwnerId}
        onSelectOwner={setSelectedOwnerId}
      />

      <div className="lg:flex lg:items-start lg:gap-4">
        <div className="lg:min-w-0 lg:flex-1">
          <AvailableTeamsPanel
            rows={poolRows}
            draftId={draftId}
            isMyTurn={canDraftNow}
            draftingForName={!isMyTurn && canDraftNow ? (currentSlot ? ownerNamesById[currentSlot.ownerId] : undefined) : undefined}
          />
        </div>
        <div className="mt-4 lg:mt-0">
          <RosterPanel
            ownerName={selectedOwnerId ? (ownerNamesById[selectedOwnerId] ?? null) : null}
            picks={selectedOwnerId ? (rostersByOwnerId[selectedOwnerId] ?? []) : []}
            pickHistory={pickHistory}
          />
        </div>
      </div>
    </div>
  );
}
