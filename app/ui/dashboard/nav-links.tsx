'use client';

import {
  UserGroupIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  TicketIcon,
  TrophyIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';


// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Leagues', href: '/dashboard/leagues', icon: GlobeAltIcon },
  { name: 'Draft Room', href: '/dashboard/draft', icon: HomeIcon },
  { name: 'Rosters', href: '/dashboard/rosters', icon: UserGroupIcon },
  { name: 'Free Agents', href: '/dashboard/free-agents', icon: DocumentDuplicateIcon },
  { name: 'Matchups', href: '/dashboard/matchups', icon: TrophyIcon },
  { name: 'Standings', href: '/dashboard/standings', icon: TicketIcon },
  { name: 'Admin', href: '/dashboard/admin', icon: Cog6ToothIcon },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600': pathname === link.href || pathname.startsWith(link.href + '/'),
              },
            )}          >
            <LinkIcon className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
