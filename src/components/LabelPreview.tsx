"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { LabelFormat, LabelElement, mmToPx, MM_TO_PX } from "@/lib/labelFormats";
import { generateBarcodeSvgSync } from "@/lib/barcodeGenerator";

interface LabelPreviewProps {
  format: LabelFormat;
  barcodeValue: string;
  productId: string;
  productName: string;
  serialNumber?: string;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<LabelElement>) => void;
  readOnly?: boolean;
}

export default function LabelPreview({
  format,
  barcodeValue,
  productId,
  productName,
  serialNumber,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  readOnly = false,
}: LabelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [barcodeSvgs, setBarcodeSvgs] = useState<Map<string, string>>(new Map());

  // Compute a dynamic scale so the label fits within available viewport
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current?.parentElement) {
        const rect = containerRef.current.parentElement.getBoundingClientRect();
        // Leave some padding
        setContainerSize({ w: rect.width - 64, h: rect.height - 64 });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Generate high-res barcode SVGs whenever format or barcode value changes
  useEffect(() => {
    const JsBarcode = require("jsbarcode");
    const map = new Map<string, string>();
    format.elements.forEach((el) => {
      if (el.type === "barcode") {
        const svg = generateBarcodeSvgSync(JsBarcode, {
          value: barcodeValue || "00000000",
          format: "CODE128",
          width: el.barcodeLineWidth || 2,
          height: el.barcodeHeight || 80,
          displayValue: el.barcodeDisplayValue ?? false,
          shorten: el.barcodeShorten ?? false,
          fontSize: 14,
          margin: 0,
        });
        map.set(el.id, svg);
      }
    });
    setBarcodeSvgs(map);
  }, [format, barcodeValue]);

  const baseWidthPx = mmToPx(format.width);
  const baseHeightPx = mmToPx(format.height);
  const scaleX = containerSize.w / baseWidthPx;
  const scaleY = containerSize.h / baseHeightPx;
  const scale = Math.min(scaleX, scaleY, 8); // cap at 8x so it's not too huge
  const widthPx = baseWidthPx * scale;
  const heightPx = baseHeightPx * scale;

  const getTextValue = (el: LabelElement): string => {
    switch (el.content) {
      case "product_id":
        return productId;
      case "product_name":
        return productName;
      case "serial_number":
        return serialNumber || productId;
      case "barcode_text":
        return barcodeValue;
      case "custom":
        return el.customText || "";
      default:
        return "";
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (readOnly || !onUpdateElement) return;
      e.stopPropagation();
      onSelectElement?.(elementId);
      const el = format.elements.find((x) => x.id === elementId);
      if (!el) return;
      setDragging({
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
      });
    },
    [readOnly, onUpdateElement, onSelectElement, format.elements]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !onUpdateElement) return;
      const dx = (e.clientX - dragging.startX) / scale / MM_TO_PX;
      const dy = (e.clientY - dragging.startY) / scale / MM_TO_PX;
      onUpdateElement(dragging.elementId, {
        x: Math.max(0, Math.round((dragging.origX + dx) * 10) / 10),
        y: Math.max(0, Math.round((dragging.origY + dy) * 10) / 10),
      });
    },
    [dragging, onUpdateElement, scale]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleContainerClick = useCallback(() => {
    if (!readOnly) onSelectElement?.(null);
  }, [readOnly, onSelectElement]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative bg-white border-2 border-gray-300 shadow-sm overflow-hidden select-none"
        style={{
          width: widthPx,
          height: heightPx,
          cursor: dragging ? "grabbing" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleContainerClick}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {Array.from({ length: Math.ceil(format.width / 5) }).map((_, i) => (
            <div
              key={`v${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-400"
              style={{ left: mmToPx(i * 5) * scale }}
            />
          ))}
          {Array.from({ length: Math.ceil(format.height / 5) }).map((_, i) => (
            <div
              key={`h${i}`}
              className="absolute left-0 right-0 border-t border-gray-400"
              style={{ top: mmToPx(i * 5) * scale }}
            />
          ))}
        </div>

        {/* Padding indicator */}
        <div
          className="absolute border border-dashed border-red-300 pointer-events-none opacity-40"
          style={{
            left: mmToPx(format.padding.left) * scale,
            top: mmToPx(format.padding.top) * scale,
            width: mmToPx(format.width - format.padding.left - format.padding.right) * scale,
            height: mmToPx(format.height - format.padding.top - format.padding.bottom) * scale,
          }}
        />

        {/* Elements */}
        {format.elements.map((el) => {
          const isSelected = selectedElementId === el.id;
          const left = mmToPx(el.x) * scale;
          const top = mmToPx(el.y) * scale;
          const w = mmToPx(el.width) * scale;
          const h = mmToPx(el.height) * scale;
          const rotation = el.rotation || 0;
          const transformOrigin = "center center";

          return (
            <div
              key={el.id}
              className={`absolute overflow-hidden ${
                isSelected && !readOnly
                  ? "ring-2 ring-blue-500 ring-offset-1"
                  : ""
              } ${!readOnly ? "cursor-grab hover:ring-1 hover:ring-blue-300" : ""}`}
              style={{
                left,
                top,
                width: w,
                height: h,
                transform: `rotate(${rotation}deg)`,
                transformOrigin,
              }}
              onMouseDown={(e) => handleMouseDown(e, el.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(el.id);
              }}
            >
              {el.type === "logo" && (
                <img
                  src="/logo.png"
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              )}
              {el.type === "barcode" && (
                <div
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: barcodeSvgs.get(el.id) || "" }}
                />
              )}
              {el.type === "text" && (
                <div
                  className="w-full h-full flex items-center"
                  style={{
                    fontSize: Math.max(8, (el.fontSize || 12) * scale * 0.25),
                    fontWeight: el.fontWeight || "400",
                    justifyContent:
                      el.align === "center"
                        ? "center"
                        : el.align === "right"
                        ? "flex-end"
                        : "flex-start",
                    lineHeight: 1.1,
                    wordBreak: "break-word",
                    color: "#333",
                  }}
                >
                  {getTextValue(el)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dimensions label */}
      <div className="text-xs text-gray-400">
        {format.width} mm × {format.height} mm (Vorschau vergrössert)
      </div>
    </div>
  );
}
