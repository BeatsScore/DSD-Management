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
  const [activeCamera, setActiveCamera] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize audio beep
  useEffect(() => {
    const audio = new Audio("/beep.mp3");
    audio.volume = 0.5;
    beepRef.current = audio;
  }, []);

  const playBeep = useCallback(() => {
    if (beepRef.current) {
      beepRef.current.currentTime = 0;
      beepRef.current.play().catch(() => {});
    }
  }, []);

  // Fallback beep using Web Audio API if no audio file
  const playFallbackBeep = useCallback(() => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore
    }
  }, []);

  // Get cameras on open
  useEffect(() => {
    if (!open) return;
    setHasError(null);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCamera = devices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
          );
          setActiveCamera(backCamera ? backCamera.id : devices[0].id);
        } else {
          setHasError("Keine Kamera gefunden.");
        }
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setHasError("Kamera-Zugriff verweigert oder nicht verfügbar.");
      });
  }, [open]);

  // Start/stop scanner
  useEffect(() => {
    if (!open || !activeCamera) return;

    const containerId = "barcode-scanner-video";
    const scanner = new Html5Qrcode(containerId, {
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
      verbose: false,
    });

    scannerRef.current = scanner;

    scanner
      .start(
        activeCamera,
        {
          fps: 15,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.777,
        },
        (decodedText) => {
          playBeep();
          playFallbackBeep();
          setLastScan(decodedText);
          onScan(decodedText);
          // Auto-close after short delay so user sees the green flash
          setTimeout(() => {
            onClose();
          }, 400);
        },
        () => {
          // scan failure — ignore, camera keeps scanning
        }
      )
      .then(() => {
        setScanning(true);
        // Check if torch is supported by inspecting the actual video track
        setTimeout(() => {
          try {
            const video = document.querySelector("#barcode-scanner-video video") as HTMLVideoElement;
            const stream = video?.srcObject as MediaStream;
            const track = stream?.getVideoTracks()[0];
            const caps = track?.getCapabilities?.();
            if (caps && "torch" in caps) {
              setTorchSupported(true);
            }
          } catch {
            setTorchSupported(false);
          }
        }, 500);
      })
      .catch((err) => {
        console.error("Start scanner error:", err);
        setHasError("Kamera konnte nicht gestartet werden.");
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
            setScanning(false);
          })
          .catch(() => {
            scannerRef.current = null;
            setScanning(false);
          });
      }
    };
  }, [open, activeCamera, onScan, onClose, playBeep, playFallbackBeep]);

  const toggleCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCamera(cameras[nextIndex].id);
  };

  const toggleTorch = async () => {
    try {
      const video = document.querySelector("#barcode-scanner-video video") as HTMLVideoElement;
      const stream = video?.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track && typeof track.applyConstraints === "function") {
        // @ts-ignore – torch is a non-standard constraint supported by some mobile browsers
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
          {cameras.length > 1 && (
            <button
              onClick={toggleCamera}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Kamera wechseln"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
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
          {/* Video container */}
          <div
            ref={containerRef}
            id="barcode-scanner-video"
            className="absolute inset-0 w-full h-full"
          />

          {/* Overlay with scan area */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay outside scan area */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Clear scan area in center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[200px]">
              <div className="relative w-full h-full">
                {/* Transparent center */}
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

            {/* Text hint */}
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

      {/* Add scanline animation style */}
      <style jsx>{`
        @keyframes scanline {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scanline {
          animation: scanline 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
