"use client";

import { useEffect, useRef } from "react";
import { ScanLine, ScanBarcode, CameraOff, Loader2, RefreshCw } from "lucide-react";
import { useScanner } from "@/hooks/useScanner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ScannerViewProps {
  /** Callback bei erfolgreichem Scan. */
  onScan: (token: string) => void;
  /** Pause zwischen zwei Scans in ms (Standard: 2500). */
  cooldownMs?: number;
  /** Mindestzeit in ms, in der derselbe Token blockiert wird (Standard: 1500). */
  minScan?: number;
  /** Optionaler Fehler-Callback. */
  onError?: (error: Error) => void;
  /** Zusätzliche Tailwind-Klassen für den äusseren Wrapper. */
  className?: string;
  /** Ob der Scanner beim Mounten automatisch starten soll. */
  autoStart?: boolean;
}

export function ScannerView({
  onScan,
  cooldownMs,
  minScan,
  onError,
  className,
  autoStart = true,
}: ScannerViewProps) {
  const { containerRef, containerId, isScanning, isStarting, error, start, stop, toggle } = useScanner({
    onScan,
    cooldownMs,
    minScan,
    onError,
  });

  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // Kurzes Delay, damit das DOM-Element mit containerId garantiert gerendert ist.
      const timer = setTimeout(() => start(), 0);
      return () => clearTimeout(timer);
    }
  }, [autoStart, start]);

  useEffect(() => {
    return () => {
      stop().catch(() => {});
    };
  }, [stop]);

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full min-h-[360px] overflow-hidden rounded-2xl bg-black",
        className
      )}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <ScanBarcode className="w-5 h-5" />
          <span className="font-medium text-sm">Code scannen</span>
        </div>
        <button
          onClick={toggle}
          disabled={isStarting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-white rounded-full hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          {isStarting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isScanning ? (
            <CameraOff className="w-3.5 h-3.5" />
          ) : (
            <ScanLine className="w-3.5 h-3.5" />
          )}
          {isStarting ? "Startet…" : isScanning ? "Stoppen" : "Starten"}
        </button>
      </div>

      {/* Video-Port */}
      <div className="relative flex-1 min-h-0 bg-black">
        <div
          id={containerId}
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center"
        />

        {/* Overlay, solange keine Kamera aktiv ist */}
        {!isScanning && !isStarting && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-white bg-black/60">
            <ScanBarcode className="w-12 h-12 opacity-50" />
            <p className="text-sm text-white/80">Scanner ist gestoppt</p>
            <button
              onClick={start}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-white/90 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Scanner starten
            </button>
          </div>
        )}

        {/* Scan-Fenster-Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[170px] max-w-[80%] max-h-[45%]">
              <div className="relative w-full h-full">
                {/* Ecken */}
                <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />

                {/* Scan-Linie */}
                <div className="absolute left-1 right-1 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.9)] animate-scanline" />
              </div>
            </div>

            <div className="absolute bottom-20 left-0 right-0 text-center">
              <p className="text-white/90 text-sm font-medium px-6">
                QR-Code oder Barcode innerhalb des Rahmens halten
              </p>
            </div>
          </div>
        )}

        {/* Ladezustand */}
        {isStarting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-white bg-black/70">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm text-white/80">Kamera wird gestartet…</p>
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 p-6 text-center text-white bg-black/85">
            <div className="p-3 rounded-full bg-red-500/20">
              <CameraOff className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-medium">Kamera-Fehler</p>
              <p className="text-sm text-white/70 mt-1">{error.message}</p>
            </div>
            <button
              onClick={start}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-white/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Erneut versuchen
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        .animate-scanline {
          animation: scanline 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
