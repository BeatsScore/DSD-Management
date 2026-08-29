"use client";

import { useRef, useState, useEffect } from "react";
import { X, Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  existingSignature?: string | null;
}

export function SignaturePad({ onSave, onCancel, existingSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale for high-DPI displays.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";

    // Draw existing signature if provided.
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawing(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawing(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div ref={containerRef} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Unterschrift erfassen</h3>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative w-full h-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-400">Hier unterschreiben</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eraser className="w-4 h-4" />
              Leeren
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!hasDrawing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
