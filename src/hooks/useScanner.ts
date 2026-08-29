"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface UseScannerOptions {
  /** Callback bei erfolgreichem Scan. */
  onScan: (token: string) => void;
  /** Pause zwischen zwei Scans in ms (Standard: 2500). */
  cooldownMs?: number;
  /** Mindestzeit in ms, in der derselbe Token blockiert wird (Standard: 1500). */
  minScan?: number;
  /** Optionaler Fehler-Callback. */
  onError?: (error: Error) => void;
  /** Kamera-Facing-Mode oder konkrete Kamera-ID. */
  facingMode?: "environment" | "user";
}

export interface UseScannerReturn {
  /** Referenz, die auf den Scanner-DOM-Container zeigen muss. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Eindeutige ID, die auf dem Scanner-DOM-Container gesetzt werden muss. */
  containerId: string;
  /** true, solange der Scanner läuft. */
  isScanning: boolean;
  /** true, während die Kamera initialisiert wird. */
  isStarting: boolean;
  /** Aktueller Fehler oder null. */
  error: Error | null;
  /** Startet den Scanner. */
  start: () => Promise<void>;
  /** Stoppt den Scanner. */
  stop: () => Promise<void>;
  /** Umschalten zwischen Start/Stop. */
  toggle: () => Promise<void>;
  /** Liste der verfügbaren Kameras (wird beim ersten Start geladen). */
  cameras: { id: string; label: string }[];
  /** Aktuell verwendete Kamera-ID. */
  activeCameraId: string | null;
}

function useScannerId() {
  const reactId = useId();
  // useId liefert IDs mit Doppelpunkten; für HTML-Attribute bereinigen.
  return `scanner-view-port-${reactId.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

/** Formate, die der Scanner erkennen soll – QR und gängige Barcodes. */
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
];

export function useScanner({
  onScan,
  cooldownMs = 2500,
  minScan = 1500,
  onError,
  facingMode = "environment",
}: UseScannerOptions): UseScannerReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerId = useScannerId();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  const lastScanRef = useRef<{ token: string; at: number } | null>(null);
  const cooldownUntilRef = useRef<number>(0);

  const handleScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();

      if (now < cooldownUntilRef.current) {
        return;
      }

      const last = lastScanRef.current;
      if (last && last.token === decodedText && now - last.at < minScan) {
        return;
      }

      lastScanRef.current = { token: decodedText, at: now };
      cooldownUntilRef.current = now + cooldownMs;
      onScan(decodedText);
    },
    [cooldownMs, minScan, onScan]
  );

  const stop = useCallback(async () => {
    if (!scannerRef.current) return;

    setIsScanning(false);

    try {
      await scannerRef.current.stop();
    } catch (err) {
      // Scanner war bereits gestoppt – ignorieren
    }
  }, []);

  const start = useCallback(async () => {
    if (!containerRef.current) {
      const err = new Error("Scanner-Container nicht gefunden.");
      setError(err);
      onError?.(err);
      return;
    }

    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      const err = new Error(
        "Kamera nicht verfügbar. Bitte HTTPS oder localhost verwenden und Kamera-Berechtigungen erlauben."
      );
      setError(err);
      onError?.(err);
      return;
    }

    setError(null);
    setIsStarting(true);

    try {
      if (scannerRef.current) {
        await stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      const availableCameras = await Html5Qrcode.getCameras();
      const mappedCameras = availableCameras.map((c) => ({ id: c.id, label: c.label }));
      setCameras(mappedCameras);

      // Bevorzuge die Rückkamera (environment) und versuche, die passende Kamera-ID zu finden.
      let cameraId: string | { facingMode: string } = { facingMode };
      const backCamera = mappedCameras.find(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("rück") ||
          c.label.toLowerCase().includes("rear") ||
          c.label.toLowerCase().includes("environment")
      );
      if (backCamera) {
        cameraId = backCamera.id;
        setActiveCameraId(backCamera.id);
      } else if (mappedCameras.length > 0) {
        cameraId = mappedCameras[0].id;
        setActiveCameraId(mappedCameras[0].id);
      }

      scannerRef.current = new Html5Qrcode(containerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          aspectRatio: 1.777,
        },
        handleScan,
        undefined
      );

      setIsScanning(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsStarting(false);
    }
  }, [facingMode, handleScan, onError, stop]);

  const toggle = useCallback(async () => {
    if (isScanning) {
      await stop();
    } else {
      await start();
    }
  }, [isScanning, start, stop]);

  useEffect(() => {
    return () => {
      stop().catch(() => {});
      scannerRef.current?.clear();
    };
  }, [stop]);

  return {
    containerRef,
    containerId,
    isScanning,
    isStarting,
    error,
    start,
    stop,
    toggle,
    cameras,
    activeCameraId,
  };
}
