"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SessionGuard() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionRemember = sessionStorage.getItem("dsd_remember");
      const localRemember = localStorage.getItem("dsd_remember");

      // Session-only login (current tab) → allowed
      if (sessionRemember === "false") return;

      // Remember-me login → allowed
      if (localRemember === "true") return;

      // No valid remember flag found → sign out
      await supabase.auth.signOut();
      localStorage.removeItem("dsd_remember");
      sessionStorage.removeItem("dsd_remember");
      router.push("/login");
      router.refresh();
    };

    checkSession();
  }, [supabase, router]);

  return null;
}
