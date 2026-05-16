"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, SwitchCamera, Flashlight, FlashlightOff, ScanLine } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ open, onScan, onClose }: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [statusText, setStatusText] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const audio = new Audio("/beep.mp3");
    audio.volume = 0.5;
    beepRef.current = audio;
  }, []);

  const playBeep = useCallback(() => {
    beepRef.current?.play?.().catch(() => {});
  }, []);

  const playFallbackBeep = useCallback(() => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch { /* ignore */ }
  }, []);

  const beepFnsRef = useRef({ playBeep, playFallbackBeep });
  beepFnsRef.current = { playBeep, playFallbackBeep };

  // List cameras on open
  useEffect(() => {
    if (!open) return;
    setHasError(null);
    setStatusText("Kameras werden gesucht...");

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMountedRef.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // pick back camera if possible
          const backIdx = devices.findIndex((d) =>
            /back|rear|environment/i.test(d.label)
          );
          const idx = backIdx >= 0 ? backIdx : 0;
          setActiveIndex(idx);
        } else {
          setHasError("Keine Kamera gefunden.");
          setStatusText("");
        }
      })
      .catch((err) => {
        console.error("Camera error:", err);
        if (isMountedRef.current) {
          setHasError("Kamera-Zugriff verweigert oder nicht verfügbar.");
          setStatusText("");
        }
      });
  }, [open]);

  const stopScanner = useCallback(async () => {
    setScanning(false);
    setTorchSupported(false);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (cameraId: string) => {
    if (!isMountedRef.current) return;
    if (scannerRef.current) await stopScanner();
    if (!isMountedRef.current) return;

    const container = document.getElementById("barcode-scanner-video");
    if (!container) {
      console.error("Container nicht gefunden");
      setHasError("Interner Fehler: Container fehlt.");
      return;
    }

    const scanner = new Html5Qrcode("barcode-scanner-video", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });

    scannerRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        {
          fps: 25,
          qrbox: { width: 320, height: 160 },
          aspectRatio: 1.777,
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: "continuous",
          },
        },
        (decodedText) => {
          if (!isMountedRef.current) return;
          beepFnsRef.current.playBeep();
          beepFnsRef.current.playFallbackBeep();
          setLastScan(decodedText);
          onScanRef.current(decodedText);
          setTimeout(() => { if (isMountedRef.current) onCloseRef.current(); }, 400);
        },
        () => { /* scan failure — ignore */ }
      );

      if (!isMountedRef.current) {
        scanner.stop().catch(() => {});
        scannerRef.current = null;
        return;
      }

      setScanning(true);
      setStatusText("Barcode in den Rahmen halten");

      setTimeout(() => {
        if (!isMountedRef.current) return;
        try {
          const video = document.querySelector("#barcode-scanner-video video") as HTMLVideoElement;
          const stream = video?.srcObject as MediaStream;
          const track = stream?.getVideoTracks()[0];
          if (track && typeof track.applyConstraints === "function") {
            // @ts-ignore
            track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
          }
          const caps = track?.getCapabilities?.();
          if (caps && "torch" in caps) setTorchSupported(true);
        } catch {
          setTorchSupported(false);
        }
      }, 600);
    } catch (err) {
      console.error("Start scanner error:", err);
      if (isMountedRef.current) {
        setHasError("Kamera konnte nicht gestartet werden.");
        setStatusText("");
      }
    }
  }, [stopScanner]);

  // Start when we know which camera to use
  useEffect(() => {
    if (!open || cameras.length === 0) return;
    const cameraId = cameras[activeIndex]?.id;
    if (!cameraId) return;

    const timer = setTimeout(() => startScanner(cameraId), 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cameras, activeIndex]);

  // Stop on close
  useEffect(() => {
    if (!open) stopScanner();
  }, [open, stopScanner]);

  const toggleCamera = async () => {
    if (isTransitioning || cameras.length < 2) return;
    setIsTransitioning(true);
    setStatusText("Kamera wird gewechselt...");

    await stopScanner();

    if (!isMountedRef.current) {
      setIsTransitioning(false);
      return;
    }

    const nextIndex = (activeIndex + 1) % cameras.length;
    setActiveIndex(nextIndex);
    // The useEffect on [open, cameras, activeIndex] will auto-start the new camera

    if (isMountedRef.current) {
      setIsTransitioning(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const video = document.querySelector("#barcode-scanner-video video") as HTMLVideoElement;
      const stream = video?.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track && typeof track.applyConstraints === "function") {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn((prev) => !prev);
      } else {
        setTorchSupported(false);
      }
    } catch (err) {
      console.error("Torch error:", err);
      setTorchSupported(false);
    }
  };

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
          <button
            onClick={toggleCamera}
            disabled={isTransitioning || cameras.length < 2}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40"
            title="Kamera wechseln"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Taschenlampe"
            >
              {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Schliessen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-white">
            <p className="text-lg font-medium mb-2">Kamera-Fehler</p>
            <p className="text-white/70 text-sm">{hasError}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* Scanner view */}
      {!hasError && (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <div id="barcode-scanner-video" className="absolute inset-0 w-full h-full" />

          {/* Overlay with scan area */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/50" />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[160px]">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-transparent" />

                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                {/* Animated scan line */}
                {scanning && !lastScan && (
                  <div className="absolute left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-scanline" />
                )}

                {/* Success flash */}
                {lastScan && (
                  <div className="absolute inset-0 bg-green-500/20 rounded-lg border-2 border-green-400 animate-pulse" />
                )}
              </div>
            </div>

            {/* Status text */}
            <div className="absolute bottom-24 left-0 right-0 text-center">
              <p className="text-white/80 text-sm font-medium">
                {lastScan ? (
                  <span className="text-green-400">Erkannt: {lastScan}</span>
                ) : (
                  statusText || (scanning ? "Barcode in den Rahmen halten" : "Kamera wird gestartet...")
                )}
              </p>
              {cameras.length > 1 && (
                <p className="text-white/50 text-xs mt-1">
                  Kamera {activeIndex + 1} von {cameras.length}
                </p>
              )}
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
