"use client";

import { ScanBarcode, X } from "lucide-react";
import { ScannerView } from "./ScannerView";

interface ScannerModalProps {
  open: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}

export function ScannerModal({ open, onScan, onClose }: ScannerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <ScanBarcode className="w-5 h-5" />
          <span className="font-medium text-sm">Barcode scannen</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Schliessen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <ScannerView
        onScan={onScan}
        onError={(err) => console.error("Scanner-Fehler:", err)}
        autoStart
        className="flex-1 rounded-none"
      />
    </div>
  );
}
