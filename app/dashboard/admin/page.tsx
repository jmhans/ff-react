import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import {
  MapPinIcon,
  UserGroupIcon,
  TrophyIcon,
  TicketIcon,
  UsersIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const adminSections = [
  {
    name: 'Golfers',
    description: 'Manage golfer profiles and accounts.',
    href: '/dashboard/golfers',
    icon: UserGroupIcon,
  },
  {
    name: 'Courses',
    description: 'Add and edit golf courses.',
    href: '/dashboard/golf/courses',
    icon: MapPinIcon,
  },
  {
    name: 'Play Golf',
    description: 'Record and view golf rounds.',
    href: '/dashboard/golf/rounds',
    icon: TrophyIcon,
  },
  {
    name: 'Raffles',
    description: 'Manage raffles and prizes.',
    href: '/dashboard/raffles',
    icon: TicketIcon,
  },
  {
    name: 'Owners',
    description: 'Manage FantasyFantasy owners and season assignments.',
    href: '/dashboard/admin/owners',
    icon: UsersIcon,
  },
  {
    name: 'League Picker',
    description: 'Compare league settings and draft details before selection.',
    href: '/dashboard/admin/league-picker',
    icon: FunnelIcon,
  },
];

export default function AdminPage() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-6 text-xl md:text-2xl`}>Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
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
