import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { auth0 } from "app/lib/auth0"; // Adjust path if your auth0 client is elsewhere

export default async function Page() {

    const session = await auth0.getSession();

  return (
    <main className="flex min-h-screen flex-col">

      <div className="relative w-full h-96 md:h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-lg">
            Fantasy Fantasy
          </h1>
          <p className="text-white/90 max-w-2xl text-lg md:text-2xl mb-8 drop-shadow-md">
            Draft real Yahoo fantasy teams into your own league and compete head-to-head all season.
          </p>

          <a 
            href="/auth/login?returnTo=/dashboard" 
            className="flex items-center gap-5 rounded-lg bg-blue-500 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-blue-400 drop-shadow-md"
          >
            <span>Log in</span> 
            <ArrowRightIcon className="w-6" />
          </a>
        </div>
      </div>
    </main>
  );
}
