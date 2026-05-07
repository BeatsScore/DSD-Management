"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  FolderOpen,
  Folder,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

interface CategoryWithCounts extends Category {
  subcategoryCount: number;
  productCount: number;
}

export default function KategorienPage() {
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create/edit states
  const [showCreateMain, setShowCreateMain] = useState(false);
  const [newMainName, setNewMainName] = useState("");
  const [creatingMain, setCreatingMain] = useState(false);

  const [creatingSubFor, setCreatingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const supabase = createClient();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const { data: cats, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Kategorien");
      setLoading(false);
      return;
    }

    // Get subcategory counts
    const subCounts: Record<string, number> = {};
    cats?.forEach((c) => {
      if (c.parent_id) {
        subCounts[c.parent_id] = (subCounts[c.parent_id] || 0) + 1;
      }
    });

    // Get product counts per category
    const { data: products } = await supabase
      .from("products")
      .select("category_id");

    const prodCounts: Record<string, number> = {};
    products?.forEach((p) => {
      if (p.category_id) {
        prodCounts[p.category_id] = (prodCounts[p.category_id] || 0) + 1;
      }
    });

    const enriched: CategoryWithCounts[] =
      cats?.map((c) => ({
        ...c,
        subcategoryCount: subCounts[c.id] || 0,
        productCount: prodCounts[c.id] || 0,
      })) || [];

    setCategories(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMainCategory = async () => {
    const name = newMainName.trim();
    if (!name) return;
    setCreatingMain(true);
    const { error } = await supabase
      .from("product_categories")
      .insert({ name, parent_id: null });
    if (error) {
      toast.error("Fehler beim Erstellen");
    } else {
      toast.success("Hauptkategorie erstellt");
      setNewMainName("");
      setShowCreateMain(false);
      loadCategories();
    }
    setCreatingMain(false);
  };

  const createSubCategory = async (parentId: string) => {
    const name = newSubName.trim();
    if (!name) return;
    setCreatingSub(true);
    const { error } = await supabase
      .from("product_categories")
      .insert({ name, parent_id: parentId });
    if (error) {
      toast.error("Fehler beim Erstellen");
    } else {
      toast.success("Unterkategorie erstellt");
      setNewSubName("");
      setCreatingSubFor(null);
      setExpanded((prev) => new Set(prev).add(parentId));
      loadCategories();
    }
    setCreatingSub(false);
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("product_categories")
      .update({ name })
      .eq("id", id);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Kategorie aktualisiert");
      setEditingId(null);
      loadCategories();
    }
    setSavingEdit(false);
  };

  const deleteCategory = async (id: string) => {
    setDeletingId(id);
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    // Safety check: must have no subcategories and no products
    if (cat.subcategoryCount > 0 || cat.productCount > 0) {
      toast.error("Kategorie enthält noch Unterkategorien oder Produkte");
      setDeletingId(null);
      setDeleteConfirm(null);
      return;
    }

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Kategorie gelöscht");
      setDeleteConfirm(null);
      loadCategories();
    }
    setDeletingId(null);
  };

  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/inventar/"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategorien</h1>
          <p className="text-sm text-gray-500 mt-1">
            Haupt- und Unterkategorien verwalten
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Kategorieübersicht</h2>
          <button
            onClick={() => setShowCreateMain(true)}
            className="btn-secondary text-sm"
            disabled={showCreateMain}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Hauptkategorie
          </button>
        </div>

        {showCreateMain && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMainName}
                onChange={(e) => setNewMainName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createMainCategory();
                  if (e.key === "Escape") {
                    setShowCreateMain(false);
                    setNewMainName("");
                  }
                }}
                placeholder="Name der Hauptkategorie"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={createMainCategory}
                disabled={!newMainName.trim() || creatingMain}
                className="btn-primary text-sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {creatingMain ? "..." : "Speichern"}
              </button>
              <button
                onClick={() => {
                  setShowCreateMain(false);
                  setNewMainName("");
                }}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Kategorien werden geladen...
          </div>
        ) : mainCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>Keine Kategorien vorhanden</p>
            <p className="text-sm mt-1">
              Erstellen Sie eine Hauptkategorie, um zu beginnen.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {mainCategories.map((main) => {
              const subs = getSubCategories(main.id);
              const isExpanded = expanded.has(main.id);

              return (
                <div key={main.id}>
                  {/* Main category row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => toggleExpand(main.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />

                    {editingId === main.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(main.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(main.id)}
                          disabled={!editName.trim() || savingEdit}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-gray-900">
                          {main.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {main.subcategoryCount} Unterkategorie
                          {main.subcategoryCount !== 1 ? "n" : ""}
                          {", "}
                          {main.productCount} Produkt
                          {main.productCount !== 1 ? "e" : ""}
                        </span>
                      </>
                    )}

                    {editingId !== main.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(main.id);
                            setEditName(main.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                          title="Bearbeiten"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCreatingSubFor(main.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50"
                          title="Unterkategorie hinzufügen"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              main.subcategoryCount > 0 ||
                              main.productCount > 0
                            ) {
                              toast.error(
                                "Kategorie enthält noch Unterkategorien oder Produkte"
                              );
                              return;
                            }
                            setDeleteConfirm(main.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Create subcategory inline */}
                  {creatingSubFor === main.id && (
                    <div className="px-4 py-3 bg-green-50 border-y border-green-100 ml-8">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-4 h-4 text-green-500" />
                        <input
                          type="text"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") createSubCategory(main.id);
                            if (e.key === "Escape") {
                              setCreatingSubFor(null);
                              setNewSubName("");
                            }
                          }}
                          placeholder="Name der Unterkategorie"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={() => createSubCategory(main.id)}
                          disabled={!newSubName.trim() || creatingSub}
                          className="btn-primary text-sm bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-1.5" />
                          {creatingSub ? "..." : "Speichern"}
                        </button>
                        <button
                          onClick={() => {
                            setCreatingSubFor(null);
                            setNewSubName("");
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subcategories */}
                  {isExpanded && subs.length > 0 && (
                    <div className="ml-8 divide-y divide-gray-50">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <FolderOpen className="w-4 h-4 text-green-500 flex-shrink-0 ml-5" />

                          {editingId === sub.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(sub.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => saveEdit(sub.id)}
                                disabled={!editName.trim() || savingEdit}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-700">
                                {sub.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {sub.productCount} Produkt
                                {sub.productCount !== 1 ? "e" : ""}
                              </span>
                            </>
                          )}

                          {editingId !== sub.id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingId(sub.id);
                                  setEditName(sub.name);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                                title="Bearbeiten"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (sub.productCount > 0) {
                                    toast.error(
                                      "Kategorie enthält noch Produkte"
                                    );
                                    return;
                                  }
                                  setDeleteConfirm(sub.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                                title="Löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Kategorie löschen?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Produkte in
              dieser Kategorie verlieren ihre Kategoriezuordnung.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteCategory(deleteConfirm)}
                disabled={deletingId === deleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === deleteConfirm ? "Löschen..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
