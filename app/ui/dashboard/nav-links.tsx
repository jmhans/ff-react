'use client';

import {
  UserCircleIcon,
  HomeIcon,
  TicketIcon,
  TrophyIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';


// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Draft Room', href: '/dashboard/draft', icon: HomeIcon },
  { name: 'My Roster', href: '/dashboard/my-roster', icon: UserCircleIcon },
  { name: 'Standings', href: '/dashboard/standings', icon: TicketIcon },
  { name: 'Matchups', href: '/dashboard/matchups', icon: TrophyIcon },
  { name: 'Sleeper Leagues', href: '/dashboard/leagues', icon: GlobeAltIcon },
  { name: 'Sleeper Team Pool', href: '/dashboard/sleeper-pool', icon: TableCellsIcon },
  { name: 'Admin', href: '/dashboard/admin', icon: Cog6ToothIcon },
];

export default function NavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
        return (
          <Link
            key={link.name}
            href={link.href}
            title={collapsed ? link.name : undefined}
            className={clsx(
              'flex h-[48px] grow items-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:p-2 md:px-3',
              collapsed ? 'justify-center md:justify-center' : 'justify-center md:justify-start',
              { 'bg-sky-100 text-blue-600': isActive },
            )}
          >
            <LinkIcon className="w-6 shrink-0" />
            <p className={collapsed ? 'hidden' : 'hidden md:block'}>{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
