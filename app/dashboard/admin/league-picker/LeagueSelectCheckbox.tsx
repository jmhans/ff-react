'use client';

import { useTransition } from 'react';
import { setLeagueIncluded } from '@/app/lib/ff-league-actions';

export default function LeagueSelectCheckbox({
  leagueId,
  included,
}: {
  leagueId: string;
  included: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={included}
      disabled={isPending}
      onChange={(e) => {
        const formData = new FormData();
        formData.set('included', String(e.target.checked));
        startTransition(() => {
          setLeagueIncluded(leagueId, formData);
        });
      }}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
}
