"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Users,
  UserCog,
  LogOut,
  Menu,
  X,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login/");
  };

  const links = [
    { href: "/dashboard/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventar/", label: "Inventar", icon: Package },
    { href: "/inventar/kalender/", label: "Kalender", icon: CalendarRange },
    { href: "/anfragen/", label: "Anfragen", icon: Inbox },
    { href: "/auftraege/", label: "Aufträge", icon: ClipboardList },
    { href: "/planer/", label: "Planer", icon: CalendarDays },
    { href: "/kunden/", label: "Kunden", icon: Users },
    ...(role === "admin" ? [{ href: "/mitarbeiter/", label: "Mitarbeiter", icon: UserCog }] : []),
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        aria-label="Menü öffnen"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-gray-950 text-gray-300 flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="DSD Management" className="h-8 w-auto object-contain" />
          </div>
          <button
            onClick={closeMobile}
            className="md:hidden p-1 text-gray-400 hover:text-white"
            aria-label="Menü schliessen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-3 px-3">
            Rolle: {role === "admin" ? "Administrator" : "Mitarbeiter"}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-900 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
