'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAccount, useDisconnect } from 'wagmi';
import { Sun, Moon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { href: '/',           label: 'Dashboard'  },
  { href: '/markets',    label: 'Markets'    },
  { href: '/borrow',     label: 'Borrow'     },
  { href: '/lend',       label: 'Lend'       },
  { href: '/reputation', label: 'Reputation' },
  { href: '/portfolio',  label: 'Portfolio'  },
];

const MORE_LINKS = [
  { href: '/history',       label: 'History',       icon: '📋', sub: 'Your complete loan record' },
  { href: '/liquidations',  label: 'Liquidations',  icon: '⚡', sub: 'Keeper-driven default recovery' },
  { href: '/score-history', label: 'Score history', icon: '📈', sub: 'Every on-chain reputation signal' },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--border)] bg-bg-card hover:bg-bg-surface transition-colors"
      aria-label="Toggle theme"
    >
      {mounted && (resolvedTheme === 'dark'
        ? <Moon className="h-3.5 w-3.5 text-text-secondary" />
        : <Sun  className="h-3.5 w-3.5 text-text-secondary" />
      )}
    </button>
  );
}

function WalletChip() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-bg-card px-3 py-1.5 text-xs font-mono hover:bg-bg-surface transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            <span className="text-text-secondary">{short}</span>
            {chain?.name && (
              <span className="text-text-tertiary">· {chain.name}</span>
            )}
            <ChevronDown className="h-3 w-3 text-text-tertiary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-bg-card border-[var(--border)]">
          <DropdownMenuItem onClick={() => disconnect()} className="text-danger cursor-pointer">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/onboarding')}
      className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
    >
      Get started →
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-[52px] flex items-center border-b border-[var(--border)] bg-bg-card">
      <div className="container flex items-center gap-5">
        {/* Logo */}
        <Link href="/" className="text-base font-bold text-brand flex-shrink-0">
          TraceCredit
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                pathname === href
                  ? 'bg-brand-subtle text-brand font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface',
              )}
            >
              {label}
            </Link>
          ))}

          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  MORE_LINKS.some(l => l.href === pathname)
                    ? 'bg-brand-subtle text-brand'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface',
                )}
              >
                More <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-bg-card border-[var(--border)] p-1">
              {MORE_LINKS.map(({ href, label, icon, sub }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer',
                      pathname === href ? 'bg-brand-subtle' : '',
                    )}
                  >
                    <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                      style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
                      {icon}
                    </span>
                    <div>
                      <p className={cn('text-xs font-medium', pathname === href ? 'text-brand' : 'text-text-primary')}>{label}</p>
                      <p className="text-text-tertiary" style={{ fontSize: 10 }}>{sub}</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <WalletChip />
        </div>
      </div>
    </header>
  );
}
