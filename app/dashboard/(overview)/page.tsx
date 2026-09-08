import Link from 'next/link';
import {
  UserCircleIcon,
  HomeIcon,
  TicketIcon,
  TrophyIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

const dashboardSections = [
  { name: 'Draft Room', description: 'Set the draft order and make live picks.', href: '/dashboard/draft', icon: HomeIcon },
  { name: 'My Roster', description: 'Manage your starters and bench.', href: '/dashboard/my-roster', icon: UserCircleIcon },
  { name: 'Standings', description: 'See the season leaderboard.', href: '/dashboard/standings', icon: TicketIcon },
  { name: 'Matchups', description: 'This week’s head-to-head matchups.', href: '/dashboard/matchups', icon: TrophyIcon },
  { name: 'Sleeper Leagues', description: 'Browse the real Sleeper leagues in the pool.', href: '/dashboard/leagues', icon: GlobeAltIcon },
  { name: 'Sleeper Team Pool', description: 'Browse and research draftable Sleeper teams.', href: '/dashboard/sleeper-pool', icon: TableCellsIcon },
  { name: 'Admin', description: 'Owners, league picker, and schedule tools.', href: '/dashboard/admin', icon: Cog6ToothIcon },
];

export default async function Page() {
  return (
    <main className="w-full space-y-5">
      <h1 className="text-2xl font-semibold text-slate-900">Fantasy Fantasy Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardSections.map((section) => (
          <Link
            key={section.name}
            href={section.href}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-300"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <section.icon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{section.name}</h2>
              <p className="mt-0.5 text-sm text-gray-500">{section.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
