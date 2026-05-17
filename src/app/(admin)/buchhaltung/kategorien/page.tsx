"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AccountingCategory } from "@/types";
import { Plus, Edit2, Trash2, XCircle, Check } from "lucide-react";

const COLORS = [
  "#22c55e", "#f97316", "#3b82f6", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f59e0b", "#6b7280", "#ec4899", "#10b981",
];

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<AccountingCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountingCategory | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "ausgabe" as "einnahme" | "ausgabe",
    color: COLORS[0],
    active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase
      .from("accounting_categories")
      .select("*")
      .order("type")
      .order("name");
    setCategories(data || []);
  }

  function openModal(category?: AccountingCategory) {
    if (category) {
      setEditingCategory(category);
      setForm({
        name: category.name,
        type: category.type,
        color: category.color || COLORS[0],
        active: category.active,
      });
    } else {
      setEditingCategory(null);
      setForm({ name: "", type: "ausgabe", color: COLORS[0], active: true });
    }
    setShowModal(true);
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      alert("Name ist erforderlich");
      return;
    }

    if (editingCategory) {
      const { error } = await supabase
        .from("accounting_categories")
        .update(form)
        .eq("id", editingCategory.id);
      if (error) {
        alert("Fehler: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("accounting_categories").insert(form);
      if (error) {
        alert("Fehler: " + error.message);
        return;
      }
    }

    setShowModal(false);
    fetchCategories();
  }

  async function toggleActive(category: AccountingCategory) {
    const { error } = await supabase
      .from("accounting_categories")
      .update({ active: !category.active })
      .eq("id", category.id);
    if (!error) fetchCategories();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Kategorie wirklich löschen?")) return;
    const { error } = await supabase.from("accounting_categories").delete().eq("id", id);
    if (error) {
      alert("Fehler: " + error.message);
      return;
    }
    fetchCategories();
  }

  const incomeCategories = categories.filter((c) => c.type === "einnahme");
  const expenseCategories = categories.filter((c) => c.type === "ausgabe");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buchhaltungskategorien</h1>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Neue Kategorie
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryGroup
          title="Einnahmen"
          categories={incomeCategories}
          onEdit={openModal}
          onToggle={toggleActive}
          onDelete={deleteCategory}
        />
        <CategoryGroup
          title="Ausgaben"
          categories={expenseCategories}
          onEdit={openModal}
          onToggle={toggleActive}
          onDelete={deleteCategory}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Kategoriename"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="einnahme">Einnahme</option>
                  <option value="ausgabe">Ausgabe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        form.color === c ? "border-gray-800 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={saveCategory}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingCategory ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  categories: AccountingCategory[];
  onEdit: (c: AccountingCategory) => void;
  onToggle: (c: AccountingCategory) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {categories.length === 0 && (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">Keine Kategorien</div>
        )}
        {categories.map((c) => (
          <div
            key={c.id}
            className={`flex items-center justify-between px-5 py-3 ${!c.active ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: c.color || "#9ca3af" }}
              />
              <span className="text-sm font-medium text-gray-700">{c.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggle(c)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title={c.active ? "Deaktivieren" : "Aktivieren"}
              >
                {c.active ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit(c)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Bearbeiten"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(c.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
