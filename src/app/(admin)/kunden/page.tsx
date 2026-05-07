"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, Users, Search } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true })
        .limit(50);
      setCustomers(data || []);
      setFiltered(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.company?.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term)
      )
    );
  }, [search, customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Kunden</h1>
          <p className="text-gray-600 mt-1">
            {customers.length} Kunden gesamt
          </p>
        </div>
        <Link href="/kunden/neu/" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Kunde erstellen
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Name, Firma, E-Mail oder Telefon..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Firma</th>
                <th className="pb-3 font-medium">E-Mail</th>
                <th className="pb-3 font-medium">Telefon</th>
                <th className="pb-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{customer.name}</td>
                    <td className="py-3 text-gray-600">{customer.company || "-"}</td>
                    <td className="py-3 text-gray-600">{customer.email}</td>
                    <td className="py-3 text-gray-600">{customer.phone || "-"}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/kunden/${customer.id}/`}
                        className="text-accent hover:underline text-xs"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Keine Kunden gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
