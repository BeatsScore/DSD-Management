"use client";

import { User } from "lucide-react";

export function AdminHeader({ userName }: { userName: string }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">Admin Bereich</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span>{userName}</span>
        </div>
      </div>
    </header>
  );
}
