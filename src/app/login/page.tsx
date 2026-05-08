"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Volume2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error("Anmeldung fehlgeschlagen: " + error.message);
      return;
    }
    toast.success("Erfolgreich angemeldet");
    router.push("/dashboard/");
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email,
          role: "customer",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrierung fehlgeschlagen: " + error.message);
      return;
    }
    toast.success("Account erstellt! Sie koennen sich jetzt anmelden.");
    setMode("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Volume2 className="w-7 h-7 text-black" />
          <span className="font-bold text-xl tracking-tight">DSD Management</span>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-center mb-6">
            {mode === "login" ? "Admin Login" : "Account erstellen"}
          </h2>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">E-Mail</label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="label">Passwort</label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anmelden"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="label">Name</label>
                <input
                  id="fullName"
                  type="text"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="regEmail" className="label">E-Mail</label>
                <input
                  id="regEmail"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="regPassword" className="label">Passwort</label>
                <input
                  id="regPassword"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Mindestens 6 Zeichen</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Account erstellen"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-sm text-accent hover:underline"
            >
              {mode === "login"
                ? "Noch kein Account? Registrieren"
                : "Bereits Account? Anmelden"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} DSD Management
        </p>
      </div>
    </div>
  );
}
