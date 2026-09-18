import type { Metadata, Viewport } from 'next';
import './globals.css';
import './game.css';
import './effects.css';
export const metadata: Metadata = { title: 'ARONCANDY — A little match. A lot of magic.', description: 'Explore five sweet worlds in ARONCANDY, an original match-3 candy adventure.', icons: { icon: '/assets/icons/icon.png' }, manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ARONCANDY' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#ed639b' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
