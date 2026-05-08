"use client";

import { User } from "lucide-react";

export function AdminHeader({ userName }: { userName: string }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
      <div className="md:hidden w-8" /> {/* Spacer for hamburger */}
      <h1 className="text-base md:text-lg font-semibold text-gray-900">Admin Bereich</h1>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
          <span className="hidden sm:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}
