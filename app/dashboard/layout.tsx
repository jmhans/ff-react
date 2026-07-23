import SideNav from '@/app/ui/dashboard/sidenav';
import { auth0 } from '@/app/lib/auth0';

export const dynamic = 'force-dynamic';
export const experimental_ppr = false;

export default async function Layout({ children }: { children: React.ReactNode }) {
  await auth0.getSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row md:h-screen md:overflow-hidden">
      <div className="flex-none w-full md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow p-4 md:overflow-y-auto md:p-12">{children}</div>
    </div>
  );
}
