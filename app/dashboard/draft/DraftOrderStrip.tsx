'use client';

import { useEffect, useRef } from 'react';

export type StripSlot = {
  pickNumber: number;
  round: number;
  ownerId: string;
  ownerName: string;
  pickedTeamName: string | null;
};

export default function DraftOrderStrip({
  slots,
  currentPickNumber,
  viewerOwnerId,
  selectedOwnerId,
  onSelectOwner,
}: {
  slots: StripSlot[];
  currentPickNumber: number;
  viewerOwnerId: string | null;
  selectedOwnerId: string | null;
  onSelectOwner: (ownerId: string) => void;
}) {
  const currentRef = useRef<HTMLButtonElement>(null);

  // Re-center whenever the current pick actually changes (not just on first
  // mount) — this strip stays visible across polling refreshes as the draft
  // advances, so it needs to keep following the pick, not just center once.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [currentPickNumber]);

  // The viewer's own next upcoming pick (could be the current one, or a future one).
  const viewerNextPick = viewerOwnerId
    ? slots.find((s) => s.ownerId === viewerOwnerId && s.pickNumber >= currentPickNumber)
    : undefined;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1.5 pb-1.5">
        {slots.map((slot) => {
          const isCurrent = slot.pickNumber === currentPickNumber;
          const isYourTurn = isCurrent && slot.ownerId === viewerOwnerId;
          const isYourNext = !isCurrent && viewerNextPick?.pickNumber === slot.pickNumber;
          const isSelected = slot.ownerId === selectedOwnerId;

          // The current pick gets a bigger, richer card so it's the visual
          // anchor of the strip — everything else is a compact chip, so the
          // strip stays scannable on a phone instead of needing 10+ full
          // cards' worth of horizontal scroll to make sense of.
          if (isCurrent) {
            return (
              <button
                key={slot.pickNumber}
                ref={currentRef}
                type="button"
                onClick={() => onSelectOwner(slot.ownerId)}
                className={`flex w-28 shrink-0 flex-col rounded-lg border p-2 text-left shadow-sm ${
                  isYourTurn
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400'
                    : 'border-blue-500 bg-blue-50 ring-2 ring-blue-400'
                }`}
              >
                <span className="text-[10px] font-medium text-gray-500">Pick {slot.pickNumber}</span>
                <span className="mt-0.5 truncate text-sm font-semibold text-gray-900">{slot.ownerName}</span>
                {isYourTurn ? (
                  <span className="mt-0.5 inline-block w-fit rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    YOUR PICK
                  </span>
                ) : (
                  <span className="mt-0.5 text-[10px] text-gray-500">on the clock</span>
                )}
              </button>
            );
          }

          return (
            <button
              key={slot.pickNumber}
              type="button"
              onClick={() => onSelectOwner(slot.ownerId)}
              title={`Pick ${slot.pickNumber} · Round ${slot.round} · ${slot.ownerName}${slot.pickedTeamName ? ` — ${slot.pickedTeamName}` : ''}`}
              className={`flex w-14 shrink-0 flex-col items-center rounded-md border px-1 py-1 text-center transition ${
                isYourNext
                  ? 'border-emerald-300 bg-emerald-50'
                  : isSelected
                    ? 'border-gray-400 bg-gray-100'
                    : slot.pickedTeamName
                      ? 'border-gray-200 bg-white'
                      : 'border-dashed border-gray-200 bg-white'
              }`}
            >
              <span className="text-[9px] text-gray-400">#{slot.pickNumber}</span>
              <span className="w-full truncate text-[11px] font-medium text-gray-800">{slot.ownerName}</span>
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${slot.pickedTeamName ? 'bg-gray-400' : 'bg-gray-200'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
