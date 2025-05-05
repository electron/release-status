import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from '@remix-run/react';
import type { LinksFunction } from '@remix-run/node';

import './tailwind.css';
import { Logo } from '~/components/Logo';
import { ArrowUpRight, History, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export const links: LinksFunction = () => [];

const nav = [
  {
    title: 'All Releases',
    path: '/release',
  },
  {
    title: (
      <>
        <History className="w-4 h-4" />
        History
      </>
    ),
    path: '/history',
  },
  {
    title: (
      <>
        <Search className="w-4 h-4" />
        PR Lookup
      </>
    ),
    path: '/pr-lookup',
  },
  {
    title: (
      <>
        Docs
        <ArrowUpRight className="w-3 h-3" />
      </>
    ),
    path: 'https://www.electronjs.org/docs/latest',
  },
];

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  const [trying, setTrying] = useState(false);
  const handleClick = () => {
    setTrying(true);
    window.location.reload();
  };
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center bg-white dark:bg-zinc-900">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
          Oops! Something went wrong
        </h1>

        <p className="text-base text-gray-700 dark:text-gray-300">
          {isRouteErrorResponse(error)
            ? `${error.status} - ${error.statusText}`
            : error instanceof Error
              ? error.message
              : 'An unexpected error occurred.'}
        </p>

        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-500 dark:border-gray-700 text-gray-800 dark:text-gray-400 transition-colors`}
          onClick={handleClick}
          disabled={trying}
        >
          {trying ? 'Trying...' : 'Try again'}
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.cookie = `tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex flex-col">
          <header className="sticky top-0 z-10 bg-white/90 dark:bg-[#2f3241]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#9feaf9]/10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Logo className="w-6 h-6 text-[#2f3241] dark:text-[#9feaf9]" />
                <Link to="/" prefetch="intent">
                  <h1 className="text-xl font-semibold text-[#2f3241] dark:text-white">
                    Electron Releases
                  </h1>
                </Link>
              </div>
              <nav className="flex items-center gap-6">
                {nav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    target={item.path.startsWith('/') ? undefined : '_blank'}
                    rel={item.path.startsWith('/') ? undefined : 'noreferrer'}
                    className={({ isActive, isPending }) =>
                      `${
                        isActive || isPending
                          ? 'text-[#2f3241] dark:text-[#9feaf9] hover:text-[#47496b] dark:hover:text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:text-[#2f3241] dark:hover:text-white'
                      } transition-colors text-sm font-medium flex items-center gap-1`
                    }
                    prefetch={item.path.startsWith('/') ? 'intent' : undefined}
                  >
                    {item.title}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="container mx-auto px-4 py-12 flex-1">{children}</main>

          <footer className="container mx-auto px-4 py-8 mt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Provided with ❤️ by Electron
                </span>
              </div>
              <div className="flex items-center gap-6">
                <Link
                  to="https://github.com/electron/electron"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-[#2f3241] dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
                >
                  GitHub
                </Link>
                <Link
                  to="https://electronjs.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-[#2f3241] dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
                >
                  Website
                </Link>
                <Link
                  to="https://bsky.app/profile/electronjs.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-[#2f3241] dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
                >
                  Bluesky
                </Link>
              </div>
            </div>
          </footer>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
