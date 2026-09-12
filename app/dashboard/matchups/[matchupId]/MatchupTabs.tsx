import Link from 'next/link';

export default function MatchupTabs({ matchupId, active }: { matchupId: string; active: 'matchup' | 'players' }) {
  const tabs = [
    { key: 'matchup' as const, label: 'Matchup', href: `/dashboard/matchups/${matchupId}` },
    { key: 'players' as const, label: 'Player Details', href: `/dashboard/matchups/${matchupId}/players` },
  ];

  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            active === tab.key
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
