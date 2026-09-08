'use client';

import { useState, useTransition } from 'react';
import { saveDraftOrder, startDraft } from '@/app/lib/ff-draft-actions';

export type SetupOwner = { id: string; displayName: string; teamName: string | null };

export default function DraftSetupForm({
  activeOwners,
  initialOrder,
  initialRounds,
  isAdmin,
  hasSavedOrder,
}: {
  activeOwners: SetupOwner[];
  initialOrder: string[]; // owner ids, already ordered — empty if none saved yet
  initialRounds: number;
  isAdmin: boolean;
  hasSavedOrder: boolean;
}) {
  const ownerById = new Map(activeOwners.map((o) => [o.id, o]));
  const [order, setOrder] = useState<string[]>(
    initialOrder.length > 0 ? initialOrder : activeOwners.map((o) => o.id),
  );
  const [rounds, setRounds] = useState(initialRounds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function randomize() {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('ownerIdsJson', JSON.stringify(order));
      formData.set('rounds', String(rounds));
      const result = await saveDraftOrder(formData);
      if (!result.success) setError(result.error);
    });
  }

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startDraft();
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">Draft Order Setup</h2>
      <p className="mt-1 text-sm text-gray-600">
        {isAdmin
          ? 'Arrange the pick order, set rounds, then start the draft when ready.'
          : 'Waiting for an admin to finalize the order and start the draft.'}
      </p>

      {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}

      <ol className="mt-4 space-y-2">
        {order.map((ownerId, i) => {
          const owner = ownerById.get(ownerId);
          return (
            <li
              key={ownerId}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <span className="text-sm text-gray-900">
                <span className="mr-2 text-gray-400">{i + 1}.</span>
                {owner?.displayName ?? ownerId}
              </span>
              {isAdmin ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={i === 0 || isPending}
                    onClick={() => move(i, -1)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === order.length - 1 || isPending}
                    onClick={() => move(i, 1)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {isAdmin ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={randomize}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Randomize
            </button>
            <div>
              <label htmlFor="rounds" className="block text-xs font-medium text-gray-700">
                Rounds
              </label>
              <input
                id="rounds"
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Save Order
            </button>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={isPending || !hasSavedOrder}
            className="w-full rounded-md bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
          >
            Start Draft
          </button>
          {!hasSavedOrder ? <p className="text-xs text-gray-500">Save the order at least once before starting.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
