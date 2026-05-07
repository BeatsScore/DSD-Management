"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Loader2,
  QrCode,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Camera,
  RotateCcw,
  Check,
  CreditCard,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function PlannerPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [scanningOrder, setScanningOrder] = useState<any>(null);
  const supabase = createClient();

  // ID Capture states
  const [showIdCapture, setShowIdCapture] = useState(false);
  const [idCaptureStep, setIdCaptureStep] = useState<"front" | "back" | "review">("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [savingId, setSavingId] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, customer:customer_id(name), assigned:assigned_to(full_name)")
      .in("status", ["offen", "verhandlungsphase", "vertragsphase", "bestaetigt", "abgeholt"])
      .order("start_date", { ascending: true });
    setOrders(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Camera cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      toast.error("Kamera konnte nicht gestartet werden.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        if (idCaptureStep === "front") {
          setFrontImage(url);
          setFrontBlob(blob);
          setIdCaptureStep("back");
          // Restart camera for back side
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          startCamera();
        } else if (idCaptureStep === "back") {
          setBackImage(url);
          setBackBlob(blob);
          stopCamera();
          setIdCaptureStep("review");
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    if (idCaptureStep === "review" && backImage) {
      setBackImage(null);
      setBackBlob(null);
      setIdCaptureStep("back");
      startCamera();
    } else if (idCaptureStep === "back" && frontImage) {
      setBackImage(null);
      setBackBlob(null);
      setIdCaptureStep("front");
      startCamera();
    } else if (idCaptureStep === "front") {
      startCamera();
    }
  };

  const saveIdDocuments = async () => {
    if (!scanningOrderId || !frontBlob) return;
    setSavingId(true);

    const orderPrefix = scanningOrder?.order_number || scanningOrderId.substring(0, 8);
    const timestamp = Date.now();

    let frontUrl: string | null = null;
    let backUrl: string | null = null;

    // Upload front
    const frontPath = `${scanningOrderId}/front-${timestamp}.jpg`;
    const { error: frontError } = await supabase.storage
      .from("id-documents")
      .upload(frontPath, frontBlob, { contentType: "image/jpeg" });
    if (frontError) {
      toast.error("Fehler beim Upload Vorderseite: " + frontError.message);
      setSavingId(false);
      return;
    }
    const { data: frontData } = supabase.storage.from("id-documents").getPublicUrl(frontPath);
    frontUrl = frontData.publicUrl;

    // Upload back if exists
    if (backBlob) {
      const backPath = `${scanningOrderId}/back-${timestamp}.jpg`;
      const { error: backError } = await supabase.storage
        .from("id-documents")
        .upload(backPath, backBlob, { contentType: "image/jpeg" });
      if (backError) {
        toast.error("Fehler beim Upload Rückseite: " + backError.message);
        setSavingId(false);
        return;
      }
      const { data: backData } = supabase.storage.from("id-documents").getPublicUrl(backPath);
      backUrl = backData.publicUrl;
    }

    // Update order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        id_document_front_url: frontUrl,
        id_document_back_url: backUrl,
      })
      .eq("id", scanningOrderId);

    setSavingId(false);

    if (updateError) {
      toast.error("Fehler beim Speichern: " + updateError.message);
      return;
    }

    toast.success("ID-Dokumente gespeichert.");
    setShowIdCapture(false);
    setFrontImage(null);
    setBackImage(null);
    setFrontBlob(null);
    setBackBlob(null);
    setIdCaptureStep("front");
    setScanningOrder((prev: any) =>
      prev ? { ...prev, id_document_front_url: frontUrl, id_document_back_url: backUrl } : prev
    );
  };

  const openIdCapture = () => {
    setShowIdCapture(true);
    setIdCaptureStep("front");
    setFrontImage(null);
    setBackImage(null);
    setFrontBlob(null);
    setBackBlob(null);
    startCamera();
  };

  const closeIdCapture = () => {
    stopCamera();
    setShowIdCapture(false);
    setFrontImage(null);
    setBackImage(null);
    setFrontBlob(null);
    setBackBlob(null);
    setIdCaptureStep("front");
  };

  const startPickup = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    setScanningOrder(order || null);
    setScanningOrderId(orderId);
    setScannedItems([]);
    setScanInput("");
    const { data: items } = await supabase
      .from("order_items")
      .select("*, product:product_id(*)")
      .eq("order_id", orderId);
    setOrderItems(items || []);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || !scanningOrderId) return;

    const barcode = scanInput.trim();
    const matchedItem = orderItems.find(
      (item) => item.product?.barcode === barcode && !scannedItems.includes(item.product?.id)
    );

    if (matchedItem) {
      setScannedItems([...scannedItems, matchedItem.product.id]);
      toast.success(`${matchedItem.product.name} gescannt`);
    } else {
      const matchedById = orderItems.find(
        (item) => item.product?.product_id === barcode && !scannedItems.includes(item.product?.id)
      );
      if (matchedById) {
        setScannedItems([...scannedItems, matchedById.product.id]);
        toast.success(`${matchedById.product.name} gescannt`);
      } else {
        toast.error("Artikel nicht in diesem Auftrag gefunden oder bereits gescannt.");
      }
    }
    setScanInput("");
  };

  const confirmPickup = async () => {
    if (!scanningOrderId) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "abgeholt" })
      .eq("id", scanningOrderId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Abholung bestätigt.");
    setScanningOrderId(null);
    setScanningOrder(null);
    loadOrders();
  };

  const cancelScan = () => {
    setScanningOrderId(null);
    setScanningOrder(null);
    setScannedItems([]);
    setOrderItems([]);
    stopCamera();
    setShowIdCapture(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ID Capture Modal
  if (showIdCapture && scanningOrderId) {
    const hasFront = !!frontImage;
    const hasBack = !!backImage;

    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">ID Erfassung</h1>
          <button onClick={closeIdCapture} className="p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex-1 h-2 rounded-full ${
                hasFront ? "bg-green-500" : "bg-gray-200"
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                hasBack ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          </div>
          <div className="text-sm text-gray-500 text-center">
            {idCaptureStep === "front" && "Vorderseite des Ausweises fotografieren"}
            {idCaptureStep === "back" && "Rückseite des Ausweises fotografieren"}
            {idCaptureStep === "review" && "Überprüfung der Aufnahmen"}
          </div>
        </div>

        {/* Camera preview or captured image */}
        <div className="card mb-4 overflow-hidden">
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            {idCaptureStep === "review" ? (
              <div className="grid grid-cols-2 gap-2 h-full p-2">
                {frontImage && (
                  <img
                    src={frontImage}
                    alt="Vorderseite"
                    className="w-full h-full object-cover rounded"
                  />
                )}
                {backImage && (
                  <img
                    src={backImage}
                    alt="Rückseite"
                    className="w-full h-full object-cover rounded"
                  />
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-colors"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-3">
          {idCaptureStep === "review" ? (
            <>
              <button
                onClick={retake}
                className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Erneut versuchen
              </button>
              <button
                onClick={saveIdDocuments}
                disabled={savingId}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {savingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Fertigstellen
              </button>
            </>
          ) : (
            <button
              onClick={closeIdCapture}
              className="w-full btn-secondary py-3"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    );
  }

  // Scan Modal
  if (scanningOrderId) {
    const totalItems = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const scannedCount = scannedItems.length;
    const allScanned = scannedCount >= totalItems && totalItems > 0;
    const hasIdDocument = !!scanningOrder?.id_document_front_url;

    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">Abholung scannen</h1>
          <button onClick={cancelScan} className="p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ID Capture Button - only show if no ID yet */}
        {!hasIdDocument && (
          <div className="mb-4">
            <button
              onClick={openIdCapture}
              className="w-full card flex items-center justify-center gap-2 py-4 border-dashed border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-blue-700"
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">ID Erfassung</span>
            </button>
          </div>
        )}

        {/* ID Document indicator */}
        {hasIdDocument && (
          <div className="card mb-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">ID-Dokument erfasst</span>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Fortschritt</span>
            <span className="text-sm font-medium">
              {scannedCount} von {totalItems}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-accent h-2.5 rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (scannedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleScan} className="flex gap-2 mb-6">
          <input
            type="text"
            autoFocus
            inputMode="text"
            placeholder="Barcode scannen..."
            className="input-field flex-1"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4">
            <QrCode className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-2 mb-8">
          {orderItems.map((item) => {
            const isScanned = scannedItems.includes(item.product?.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isScanned
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isScanned ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isScanned ? "text-green-800" : ""}`}>
                    {item.product?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.product?.product_id} | {item.product?.manufacturer}
                  </div>
                </div>
                <span className="text-xs text-gray-400">x{item.quantity}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={confirmPickup}
          disabled={!allScanned}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
            allScanned
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-2" />
          Abholung bestätigen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Auftragsplaner</h1>
        <p className="text-gray-600 mt-1">Übersicht aller aktiven Aufträge</p>
      </div>

      <div className="grid gap-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-gray-500">{order.order_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="font-medium">{order.customer?.name || "-"}</div>
                <div className="text-sm text-gray-500">
                  {formatDate(order.start_date)} - {formatDate(order.end_date)}
                </div>
                {order.assigned && (
                  <div className="text-xs text-gray-400 mt-1">
                    Zugewiesen: {order.assigned.full_name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/auftraege/${order.id}/`} className="btn-secondary text-sm py-2 px-3">
                  Details
                </Link>
                {order.status === "bestaetigt" && (
                  <button onClick={() => startPickup(order.id)} className="btn-primary text-sm py-2 px-3">
                    <QrCode className="w-4 h-4 mr-1" /> Abholung
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Keine aktiven Aufträge.</p>
          </div>
        )}
      </div>
    </div>
  );
}
