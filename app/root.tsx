import { Link, Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { LinksFunction } from 'react-router';

import './tailwind.css';
import { Logo } from '~/components/Logo';
import { ArrowUpRight, History, Search, CalendarPlus, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const links: LinksFunction = () => [];

const nav = [
  { title: 'Releases', path: '/release', icon: null },
  { title: 'History', path: '/history', icon: History },
  { title: 'Schedule', path: '/schedule', icon: CalendarPlus },
  { title: 'PR lookup', path: '/pr-lookup', icon: Search },
];

export function Chrome({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.cookie = `tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinks = nav.map((item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className="lu-capsule-item"
      prefetch="intent"
      onClick={() => setMobileMenuOpen(false)}
    >
      {item.icon ? <item.icon className="w-[15px] h-[15px]" strokeWidth={2} /> : null}
      {item.title}
    </NavLink>
  ));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 lu-chrome">
        <div className="mx-auto max-w-[var(--rs-content)] px-5 h-[var(--lu-size-titlebar)] flex items-center gap-4">
          <Link to="/" prefetch="intent" className="flex items-center gap-2.5 flex-1 min-w-0">
            <Logo className="w-7 h-7 flex-none" />
            <span className="truncate text-ink [font:var(--lu-type-headline)] [letter-spacing:var(--lu-type-headline-tracking)]">
              Electron Releases
            </span>
          </Link>

          {/* Desktop navigation: one glass capsule, like Fiddle's toolbar. */}
          <nav className="hidden md:inline-flex lu-capsule">{navLinks}</nav>

          <div className="hidden md:flex flex-1 justify-end">
            <Link
              to="https://www.electronjs.org/docs/latest"
              target="_blank"
              rel="noreferrer"
              className="lu-button lu-button-ghost rounded-capsule h-[var(--lu-size-toolbar)] px-4"
            >
              Docs
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden lu-button lu-button-ghost lu-button-icon rounded-capsule"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile navigation */}
        <nav
          className={`md:hidden flex flex-col gap-1 px-4 overflow-hidden transition-all duration-300 ease-lu ${
            mobileMenuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'
          }`}
        >
          {navLinks}
          <Link
            to="https://www.electronjs.org/docs/latest"
            target="_blank"
            rel="noreferrer"
            className="lu-capsule-item"
          >
            Docs
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[var(--rs-content)] px-5 pt-10 pb-16 flex-1">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[var(--rs-content)] px-5 pb-10">
        <div className="lu-hairline-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-ink-muted t-dense">
          <span>Provided with ❤️ by Electron</span>
          <div className="flex items-center gap-5">
            <Link to="https://github.com/electron/electron" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              GitHub
            </Link>
            <Link to="https://electronjs.org" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Website
            </Link>
            <Link to="https://bsky.app/profile/electronjs.org" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Bluesky
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Chrome>{children}</Chrome>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
