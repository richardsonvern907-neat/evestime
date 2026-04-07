"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/offers?productTrack=core_investing", label: "Core Investing" },
  { href: "/offers?productTrack=pro_opportunities", label: "Pro Opportunities" },
  { href: "/coin-assets", label: "Coin Catalog" },
  { href: "/offers", label: "All Offers" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary md:text-2xl">
          Evestime
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-primary/80 transition hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-full border border-primary/20 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary/40"
          >
            Log in
          </Link>
          <Link
            href="/offers"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent/90"
          >
            Start now
          </Link>
        </nav>
        <button
          className="rounded-md p-2 text-primary md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>
      {isOpen && (
        <div className="border-t border-primary/10 bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-1 text-sm font-medium text-primary/85 transition hover:bg-primary/5 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-1 rounded-full border border-primary/20 px-4 py-2 text-center text-sm font-semibold text-primary"
            >
              Log in
            </Link>
            <Link
              href="/offers"
              className="rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-ink"
            >
              Start now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
