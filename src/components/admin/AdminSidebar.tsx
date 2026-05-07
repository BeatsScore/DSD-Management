"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  CalendarDays,
  Users,
  Volume2,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login/");
  };

  const links = [
    { href: "/dashboard/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventar/", label: "Inventar", icon: Package },
    { href: "/auftraege/", label: "Aufträge", icon: ClipboardList },
    { href: "/planer/", label: "Planer", icon: CalendarDays },
    { href: "/kunden/", label: "Kunden", icon: Users },
  ];

  return (
    <aside className="w-64 bg-gray-950 text-gray-300 flex flex-col fixed inset-y-0 left-0 z-40">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Volume2 className="w-5 h-5 text-white" />
        <span className="font-bold text-white">DSD Management</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
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
  );
}
