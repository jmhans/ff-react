'use client';

import { useRouter } from 'next/navigation';

export default function RosterWeekSelect({
  basePath,
  weeks,
  selected,
}: {
  basePath: string;
  weeks: number[];
  selected: number;
}) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => router.push(`${basePath}?week=${e.target.value}`)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-blue-400 focus:ring"
    >
      {weeks.map((week) => (
        <option key={week} value={week}>
          Week {week}
        </option>
      ))}
    </select>
  );
}
