"use client";

import { useState } from 'react';
import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import ProfileServer from '@/app/ui/clientProfile';
import { LoginButton, LogoutButton } from '@/app/ui/auth/buttons';
import { useUser } from "@auth0/nextjs-auth0";
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function SideNav() {
  const { user } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 h-14">
        <Link href="/" className="flex items-center h-10 w-10 shrink-0">
          <AcmeLogo />
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ──────────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-gray-800 px-3 py-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="w-28 text-white" onClick={() => setDrawerOpen(false)}>
                <AcmeLogo />
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
                aria-label="Close menu"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col grow space-y-1 overflow-y-auto" onClick={() => setDrawerOpen(false)}>
              <NavLinks />
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-gray-700 mt-3">
              <ProfileServer />
              {!user && <LoginButton />}
              {user && <LogoutButton />}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <div className="hidden md:flex h-full flex-col px-3 py-4 md:px-2">
        <Link
          className="mb-2 flex h-40 items-center justify-center rounded-md p-4"
          href="/"
        >
          <div className="w-40 text-white">
            <AcmeLogo />
          </div>
        </Link>
        <div className="flex flex-col grow space-y-2">
          <NavLinks />
          <div className="h-auto w-full grow rounded-md bg-gray-50" />
          <ProfileServer />
          <div>
            {!user && <LoginButton />}
            {user && <LogoutButton />}
          </div>
        </div>
      </div>
    </>
  );
}
