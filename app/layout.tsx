import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata } from 'next';

// appleWebApp is what actually gets iOS to launch this in standalone mode
// once added to the Home Screen (Share -> Add to Home Screen) — without it,
// "Add to Home Screen" just creates a bookmark that still opens inside
// Safari's browser chrome, and iOS never exposes the Push API to it.
export const metadata: Metadata = {
  title: 'Fantasy Fantasy',
  description: 'Draft real Sleeper fantasy teams into your own league and compete head-to-head all season.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fantasy Fantasy',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  
  return (
    <html lang="en">
        <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
