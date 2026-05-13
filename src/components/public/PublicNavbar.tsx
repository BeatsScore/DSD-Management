"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Volume2 } from "lucide-react";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/katalog/", label: "Katalog" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-end gap-2 h-20 pb-2">
            <img src="/logo.png" alt="DSD Management" className="h-24 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/anfrage/" className="btn-primary text-sm py-2 px-4">
              Anfrage stellen
            </Link>
          </nav>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/anfrage/"
              className="block px-3 py-2 text-base font-medium text-white bg-black rounded-md text-center"
              onClick={() => setMobileOpen(false)}
            >
              Anfrage stellen
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
