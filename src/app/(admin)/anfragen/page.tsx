"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Phone, Calendar, ArrowRight, TrendingUp, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface RequestItem {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  event_description: string | null;
  start_date: string | null;
  end_date: string | null;
  product_ids: string[] | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  offen: { label: "Offen", color: "bg-blue-100 text-blue-700", icon: Clock },
  bearbeitung: { label: "In Bearbeitung", color: "bg-amber-100 text-amber-700", icon: TrendingUp },
  angebot_erstellt: { label: "Angebot erstellt", color: "bg-green-100 text-green-700", icon: FileText },
  abgelehnt: { label: "Abgelehnt", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function RequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("alle");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden:", error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const filtered = filter === "alle"
    ? requests
    : requests.filter((r) => r.status === filter);

  const counts = {
    alle: requests.length,
    offen: requests.filter((r) => r.status === "offen").length,
    bearbeitung: requests.filter((r) => r.status === "bearbeitung").length,
    angebot_erstellt: requests.filter((r) => r.status === "angebot_erstellt").length,
    abgelehnt: requests.filter((r) => r.status === "abgelehnt").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Anfragen</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { key: "alle", label: "Alle" },
          { key: "offen", label: "Offen" },
          { key: "bearbeitung", label: "In Bearbeitung" },
          { key: "angebot_erstellt", label: "Angebot erstellt" },
          { key: "abgelehnt", label: "Abgelehnt" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {counts[tab.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const cfg = statusConfig[req.status] || statusConfig.offen;
          const StatusIcon = cfg.icon;
          return (
            <Link
              key={req.id}
              href={`/anfragen/${req.id}/`}
              className="card flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(req.created_at)}</span>
                </div>
                <div className="font-medium text-gray-900">{req.name}</div>
                {req.company && <div className="text-sm text-gray-500">{req.company}</div>}
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {req.email}
                  </span>
                  {req.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {req.phone}
                    </span>
                  )}
                </div>
                {(req.start_date || req.end_date) && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {req.start_date ? formatDate(req.start_date) : "—"} – {req.end_date ? formatDate(req.end_date) : "—"}
                  </div>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 hidden sm:block" />
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Keine Anfragen vorhanden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
