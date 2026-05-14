"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Pencil, Trash2, KeyRound, X, Check, Mail, User, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface StaffUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function StaffManagementPage() {
  const supabase = createClient();
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "staff">("staff");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .in("role", ["admin", "staff"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden: " + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formPassword.trim()) {
      toast.error("E-Mail und Passwort sind erforderlich.");
      return;
    }
    if (formPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    setSaving(true);

    // Create user via Supabase Auth (admin only endpoint)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formEmail.trim(),
      password: formPassword,
      options: {
        data: {
          full_name: formName.trim() || formEmail.trim(),
          role: formRole,
        },
      },
    });

    if (authError) {
      setSaving(false);
      toast.error("Fehler beim Erstellen: " + authError.message);
      return;
    }

    // Update profile role if needed (signUp creates with customer default, trigger should handle it but let's be sure)
    if (authData.user) {
      await supabase
        .from("profiles")
        .update({ role: formRole, full_name: formName.trim() || formEmail.trim() })
        .eq("id", authData.user.id);
    }

    setSaving(false);
    toast.success("Mitarbeiter erstellt.");
    resetForm();
    loadUsers();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formName.trim() || null,
        role: formRole,
      })
      .eq("id", editingUser.id);

    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
      return;
    }

    toast.success("Mitarbeiter aktualisiert.");
    resetForm();
    loadUsers();
  };

  const handleDelete = async (user: StaffUser) => {
    if (!(await confirm("Mitarbeiter löschen?", `Soll ${user.email} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`, { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;

    // Delete from auth (cascades to profiles via FK)
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      // Fallback: just delete from profiles if admin API not available
      await supabase.from("profiles").delete().eq("id", user.id);
    }

    toast.success("Mitarbeiter gelöscht.");
    loadUsers();
  };

  const handleForcePasswordReset = async (user: StaffUser) => {
    if (!(await confirm("Passwort-Reset erzwingen?", `Ein Reset-Link wird an ${user.email} gesendet.`, { confirmLabel: "Senden", cancelLabel: "Abbrechen" }))) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login/`,
    });

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Reset-Link gesendet.");
  };

  const startEdit = (user: StaffUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormName(user.full_name || "");
    setFormRole(user.role as "admin" | "staff");
    setFormPassword("");
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormName("");
    setFormRole("staff");
    setFormPassword("");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormEmail("");
    setFormName("");
    setFormRole("staff");
    setFormPassword("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Mitarbeiter-Verwaltung</h1>
        <button onClick={startCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neuer Mitarbeiter
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {editingUser ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
            </h2>
            <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={editingUser ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">E-Mail *</label>
                <input
                  type="email"
                  className="input-field"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={!!editingUser}
                  required
                />
              </div>
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Vorname Nachname"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Rolle *</label>
                <select
                  className="input-field"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as "admin" | "staff")}
                  required
                >
                  <option value="staff">Mitarbeiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="label">Passwort *</label>
                  <input
                    type="password"
                    className="input-field"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    required={!editingUser}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="flex-1 btn-secondary py-2.5">
                Abbrechen
              </button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingUser ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User List */}
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{user.full_name || "—"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {user.role === "admin" ? "Admin" : "Mitarbeiter"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleForcePasswordReset(user)}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-2 transition-colors"
                title="Passwort-Reset senden"
              >
                <KeyRound className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={() => startEdit(user)}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-2 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(user)}
                className="inline-flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Keine Mitarbeiter vorhanden.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        open={state.open}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
