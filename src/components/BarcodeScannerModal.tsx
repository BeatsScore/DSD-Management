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
  const [cameraKey, setCameraKey] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);

  // Keep callbacks in refs so they don't trigger re-renders / effect re-runs
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

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

  // Keep beep callbacks in ref so effect doesn't depend on them
  const beepFnsRef = useRef({ playBeep, playFallbackBeep });
  beepFnsRef.current = { playBeep, playFallbackBeep };

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
          const selected = backCamera ? backCamera.id : devices[0].id;
          setActiveCamera(selected);
          // bump key so scanner mounts fresh
          setCameraKey((k) => k + 1);
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

    let cancelled = false;

    const run = async () => {
      // Make sure any previous scanner is fully stopped before creating a new one
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }

      if (cancelled) return;

      const containerId = `barcode-scanner-video-${cameraKey}`;
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
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      scannerRef.current = scanner;

      try {
        await scanner.start(
          activeCamera,
          {
            fps: 25,
            qrbox: { width: 320, height: 160 },
            aspectRatio: 1.777,
            videoConstraints: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              // @ts-ignore – focusMode is supported by many mobile browsers but not yet in TS DOM types
              focusMode: "continuous",
            },
          },
          (decodedText) => {
            beepFnsRef.current.playBeep();
            beepFnsRef.current.playFallbackBeep();
            setLastScan(decodedText);
            onScanRef.current(decodedText);
            // Auto-close after short delay so user sees the green flash
            setTimeout(() => {
              onCloseRef.current();
            }, 400);
          },
          () => {
            // scan failure — ignore, camera keeps scanning
          }
        );

        if (cancelled) {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          return;
        }

        setScanning(true);

        // Apply continuous focus + check torch after camera is running
        setTimeout(() => {
          try {
            const video = document.querySelector(`#${containerId} video`) as HTMLVideoElement;
            const stream = video?.srcObject as MediaStream;
            const track = stream?.getVideoTracks()[0];
            if (track && typeof track.applyConstraints === "function") {
              // @ts-ignore – focusMode is a non-standard constraint
              track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
            }
            const caps = track?.getCapabilities?.();
            if (caps && "torch" in caps) {
              setTorchSupported(true);
            }
          } catch {
            setTorchSupported(false);
          }
        }, 600);
      } catch (err) {
        if (!cancelled) {
          console.error("Start scanner error:", err);
          setHasError("Kamera konnte nicht gestartet werden.");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      setScanning(false);
      setTorchSupported(false);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, activeCamera, cameraKey]);

  const toggleCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCamera(cameras[nextIndex].id);
    setCameraKey((k) => k + 1);
  };

  const toggleTorch = async () => {
    try {
      const containerId = `barcode-scanner-video-${cameraKey}`;
      const video = document.querySelector(`#${containerId} video`) as HTMLVideoElement;
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

  const containerId = `barcode-scanner-video-${cameraKey}`;

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
          {/* Video container — unique id per camera switch ensures clean mount/unmount */}
          <div
            id={containerId}
            key={cameraKey}
            className="absolute inset-0 w-full h-full"
          />

          {/* Overlay with scan area */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay outside scan area */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Clear scan area in center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[160px]">
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
