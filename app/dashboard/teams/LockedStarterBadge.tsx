'use client';

export default function LockedStarterBadge({ isStarter, lockAt }: { isStarter: boolean; lockAt: string }) {
  const localTime = new Date(lockAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <span
      title={`Locked at ${localTime}`}
      className={
        isStarter
          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
          : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
      }
    >
      {isStarter ? 'Starter' : 'Bench'} (Locked)
    </span>
  );
}
