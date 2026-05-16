"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, ScanLine, Flashlight, FlashlightOff } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ open, onScan, onClose }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const isMountedRef = useRef(true);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const cleanup = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setTorchSupported(false);
    setTorchOn(false);
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }

    setError(null);
    setScanning(false);
    setLastScan(null);

    const start = async () => {
      try {
        // 1. Open back camera with optimal constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video || !isMountedRef.current) return;

        video.srcObject = stream;
        await video.play();

        // 2. Apply advanced camera settings after stream is running
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            // @ts-ignore – non-standard constraints
            await track.applyConstraints({
              advanced: [
                { focusMode: "continuous" },
                { exposureMode: "continuous" },
                { whiteBalanceMode: "continuous" },
              ],
            } as any);
          } catch {
            // ignore if not supported
          }

          const caps = track.getCapabilities?.();
          if (caps && "torch" in caps) {
            setTorchSupported(true);
          }
        }

        // 3. Prepare offscreen canvas for decoding
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        canvasRef.current = canvas;

        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }

        setScanning(true);

        // 4. Run custom decode loop with requestAnimationFrame
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const loop = () => {
          if (!isMountedRef.current) return;

          frameCountRef.current++;

          // Decode every 2nd frame (~30 FPS decode on 60 FPS camera)
          if (frameCountRef.current % 2 === 0 && video.readyState >= 2) {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const result = readerRef.current!.decodeFromCanvas(canvas);
              if (result) {
                const text = result.getText();
                setLastScan(text);
                onScanRef.current(text);
                setTimeout(() => {
                  cleanup();
                  onCloseRef.current();
                }, 400);
                return; // stop loop
              }
            } catch {
              // no barcode found in this frame – keep scanning
            }
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Scanner start error:", err);
        if (isMountedRef.current) {
          setError("Kamera konnte nicht gestartet werden.");
        }
      }
    };

    const timer = setTimeout(start, 100);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 text-white">
          <ScanLine className="w-5 h-5" />
          <span className="font-medium">Barcode scannen</span>
        </div>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              onClick={async () => {
                try {
                  const track = streamRef.current?.getVideoTracks()[0];
                  if (track && typeof track.applyConstraints === "function") {
                    // @ts-ignore
                    await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
                    setTorchOn((prev) => !prev);
                  }
                } catch {
                  setTorchSupported(false);
                }
              }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Taschenlampe"
            >
              {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={() => { cleanup(); onClose(); }}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-white">
            <p className="text-lg font-medium mb-2">Kamera-Fehler</p>
            <p className="text-white/70 text-sm">{error}</p>
            <button
              onClick={() => { cleanup(); onClose(); }}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Schliessen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover brightness-150 contrast-125 saturate-110"
            muted
            playsInline
          />

          {/* Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/50" />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[160px]">
              <div className="relative w-full h-full">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                {scanning && !lastScan && (
                  <div className="absolute left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-scanline" />
                )}

                {lastScan && (
                  <div className="absolute inset-0 bg-green-500/20 rounded-lg border-2 border-green-400 animate-pulse" />
                )}
              </div>
            </div>

            <div className="absolute bottom-24 left-0 right-0 text-center">
              <p className="text-white/80 text-sm font-medium">
                {lastScan ? (
                  <span className="text-green-400">Erkannt: {lastScan}</span>
                ) : scanning ? (
                  "Barcode in den Rahmen halten"
                ) : (
                  "Kamera wird gestartet..."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scanline {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scanline {
          animation: scanline 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
