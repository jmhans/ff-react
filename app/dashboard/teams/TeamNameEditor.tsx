'use client';

import { useState, useTransition } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import { updateOwnerTeamName } from '@/app/lib/ff-owner-actions';

export default function TeamNameEditor({
  ownerId,
  teamName,
  fallbackLabel,
}: {
  ownerId: string;
  teamName: string | null;
  fallbackLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(teamName ?? '');
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-semibold text-gray-900">{teamName ?? fallbackLabel}</h1>
        <button
          type="button"
          onClick={() => {
            setValue(teamName ?? '');
            setEditing(true);
          }}
          aria-label="Edit team name"
          className="text-gray-400 hover:text-gray-600"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  function handleSave() {
    const formData = new FormData();
    formData.set('teamName', value);
    startTransition(async () => {
      await updateOwnerTeamName(ownerId, formData);
      setEditing(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a team name"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xl font-semibold outline-none ring-blue-400 focus:ring"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
}
