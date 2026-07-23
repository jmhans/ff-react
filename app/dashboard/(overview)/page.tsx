
import Link from 'next/link';

export default async function Page() {
  return (
    <div className="w-full space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Fantasy Fantasy Dashboard</h1>
      <p className="text-sm text-slate-600">
        Configure Yahoo public leagues, import weekly scores, and manage owner rosters and matchups.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/leagues" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          Manage Leagues
        </Link>
        <Link href="/dashboard/draft" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Open Draft Room
        </Link>
      </div>
    </div>
  );
}