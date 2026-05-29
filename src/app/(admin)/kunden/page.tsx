"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, Users, Search, Eye, Shield, ShieldCheck, ShieldAlert, CreditCard } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true })
        .limit(1000);
      if (error) {
        console.error("Failed to load customers:", error);
      }
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Kunden</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {customers.length} Kunden gesamt
          </p>
        </div>
        <Link href="/kunden/neu/" className="btn-primary text-sm px-4 py-2.5">
          <Plus className="w-4 h-4 mr-1.5" /> Kunde erstellen
        </Link>
      </div>

      <div className="card p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Suchen nach Name, Firma, E-Mail oder Telefon..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Firma</th>
                <th className="pb-3 font-medium">E-Mail</th>
                <th className="pb-3 font-medium">Telefon</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">ID</th>
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
                    <td className="py-3">
                      {customer.trust_status === "gruen" && (
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      )}
                      {customer.trust_status === "gelb" && (
                        <Shield className="w-5 h-5 text-yellow-500" />
                      )}
                      {customer.trust_status === "rot" && (
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                      )}
                      {!customer.trust_status && (
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                    <td className="py-3">
                      {(customer.id_document_front_url || customer.id_document_back_url) ? (
                        <span title="ID-Dokument hinterlegt">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/kunden/${customer.id}/`}
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Keine Kunden gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filtered.length > 0 ? (
            filtered.map((customer) => (
              <Link
                key={customer.id}
                href={`/kunden/${customer.id}/`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{customer.name}</span>
                    {customer.trust_status === "gruen" && (
                      <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                    {customer.trust_status === "gelb" && (
                      <Shield className="w-4 h-4 text-yellow-500 shrink-0" />
                    )}
                    {customer.trust_status === "rot" && (
                      <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    {(customer.id_document_front_url || customer.id_document_back_url) && (
                      <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{customer.email}</div>
                  <div className="text-xs text-gray-400">{customer.phone || customer.company || "-"}</div>
                </div>
                <Eye className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Keine Kunden gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
