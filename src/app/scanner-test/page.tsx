"use client";

import { useState } from "react";
import { ScannerView } from "@/components/scanner/ScannerView";
import { Copy, Check, Trash2, ScanBarcode } from "lucide-react";
import toast from "react-hot-toast";

export default function ScannerTestPage() {
  const [scans, setScans] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleScan = (token: string) => {
    setScans((prev) => [token, ...prev]);
    toast.success(`Gescannt: ${token}`, { duration: 2000 });
  };

  const handleError = (error: Error) => {
    toast.error(error.message);
  };

  const copyLast = () => {
    if (!scans.length) return;
    navigator.clipboard.writeText(scans[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clear = () => setScans([]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScanBarcode className="w-7 h-7 text-accent" />
            Scanner-Test
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Teste QR-Codes und Barcodes. Kamera erfordert HTTPS oder localhost.
          </p>
        </div>

        <div className="h-[420px] sm:h-[520px] mb-6 shadow-lg rounded-2xl overflow-hidden">
          <ScannerView
            onScan={handleScan}
            onError={handleError}
            cooldownMs={2500}
            minScan={1500}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Gescannte Tokens</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLast}
                disabled={!scans.length}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
              <button
                onClick={clear}
                disabled={!scans.length}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Leeren
              </button>
            </div>
          </div>

          {scans.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Noch keine Codes gescannt.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {scans.map((token, index) => (
                <li
                  key={`${token}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <span className="font-mono text-sm text-gray-900 break-all">{token}</span>
                  <span className="text-xs text-gray-400 shrink-0">#{scans.length - index}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
