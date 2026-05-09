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
  Eye,
  Truck,
  PackageOpen,
  User,
  Clock,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { formatDate, getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export default function PlannerPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"pickup" | "return">("pickup");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [scanningOrder, setScanningOrder] = useState<any>(null);
  const supabase = createClient();

  // Damage capture states
  const [showDamageCapture, setShowDamageCapture] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageSeverity, setDamageSeverity] = useState<"leicht" | "mittel" | "schwer">("leicht");
  const [damagePhotoFile, setDamagePhotoFile] = useState<File | null>(null);
  const [damagePhotoPreview, setDamagePhotoPreview] = useState<string | null>(null);
  const [damageProductIds, setDamageProductIds] = useState<string[]>([]);
  const [damageOrderId, setDamageOrderId] = useState<string | null>(null);
  const [savingDamage, setSavingDamage] = useState(false);
  const [damageCameraActive, setDamageCameraActive] = useState(false);

  // ID Capture states
  const [showIdCapture, setShowIdCapture] = useState(false);
  const [idCaptureStep, setIdCaptureStep] = useState<"front" | "back" | "review">("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [backBlob, setBackBlob] = useState<Blob | null>(null);
  const [savingId, setSavingId] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Barcode scanner states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:customer_id(name), assigned:assigned_to(full_name), pickup_staff:pickup_staff_id(full_name), return_staff:return_staff_id(full_name)")
      .in("status", ["offen", "verhandlungsphase", "vertragsphase", "bestaetigt", "abgeholt", "zurueckgebracht"])
      .order("start_date", { ascending: true });
    if (error) {
      console.error("Failed to load orders:", error);
      toast.error("Fehler beim Laden der Aufträge.");
    }
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
          if (frontImage?.startsWith("blob:")) URL.revokeObjectURL(frontImage);
          setFrontImage(url);
          setFrontBlob(blob);
          setIdCaptureStep("back");
          // Restart camera for back side
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          startCamera();
        } else if (idCaptureStep === "back") {
          if (backImage?.startsWith("blob:")) URL.revokeObjectURL(backImage);
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

    const customerId = scanningOrder?.customer_id;
    if (!customerId) {
      toast.error("Kein Kunde für diesen Auftrag gefunden.");
      setSavingId(false);
      return;
    }

    const timestamp = Date.now();

    let frontPath: string | null = null;
    let backPath: string | null = null;

    // Upload front
    const frontFilePath = `${customerId}/front-${timestamp}.jpg`;
    const { error: frontError } = await supabase.storage
      .from("id-documents")
      .upload(frontFilePath, frontBlob, { contentType: "image/jpeg" });
    if (frontError) {
      toast.error("Fehler beim Upload Vorderseite: " + frontError.message);
      setSavingId(false);
      return;
    }
    frontPath = frontFilePath;

    // Upload back if exists
    if (backBlob) {
      const backFilePath = `${customerId}/back-${timestamp}.jpg`;
      const { error: backError } = await supabase.storage
        .from("id-documents")
        .upload(backFilePath, backBlob, { contentType: "image/jpeg" });
      if (backError) {
        toast.error("Fehler beim Upload Rückseite: " + backError.message);
        setSavingId(false);
        return;
      }
      backPath = backFilePath;
    }

    // Update customer (store path only, not public URL)
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        id_document_front_url: frontPath,
        id_document_back_url: backPath,
      })
      .eq("id", customerId);

    setSavingId(false);

    if (updateError) {
      toast.error("Fehler beim Speichern: " + updateError.message);
      return;
    }

    toast.success("ID-Dokumente beim Kunden gespeichert.");
    setShowIdCapture(false);
    setFrontImage(null);
    setBackImage(null);
    setFrontBlob(null);
    setBackBlob(null);
    setIdCaptureStep("front");
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
    if (frontImage?.startsWith("blob:")) URL.revokeObjectURL(frontImage);
    if (backImage?.startsWith("blob:")) URL.revokeObjectURL(backImage);
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
    setScanMode("pickup");
    setScannedItems([]);
    setScanInput("");
    const { data: items } = await supabase
      .from("order_items")
      .select("*, product:product_id(*)")
      .eq("order_id", orderId);
    setOrderItems(items || []);
  };

  const startReturn = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    setScanningOrder(order || null);
    setScanningOrderId(orderId);
    setScanMode("return");
    setScannedItems([]);
    setScanInput("");
    const { data: items } = await supabase
      .from("order_items")
      .select("*, product:product_id(*)")
      .eq("order_id", orderId);
    setOrderItems(items || []);
  };

  const processBarcode = useCallback((barcode: string) => {
    if (!barcode || !scanningOrderId) return;

    const trimmed = barcode.trim();
    const matchedItem = orderItems.find(
      (item) => item.product?.barcode === trimmed && !scannedItems.includes(item.product?.id)
    );

    if (matchedItem) {
      setScannedItems((prev) => [...prev, matchedItem.product.id]);
      toast.success(`${matchedItem.product.name} gescannt`);
    } else {
      const matchedById = orderItems.find(
        (item) => item.product?.product_id === trimmed && !scannedItems.includes(item.product?.id)
      );
      if (matchedById) {
        setScannedItems((prev) => [...prev, matchedById.product.id]);
        toast.success(`${matchedById.product.name} gescannt`);
      } else {
        toast.error("Artikel nicht in diesem Auftrag gefunden oder bereits gescannt.");
      }
    }
    setScanInput("");
  }, [scanningOrderId, orderItems, scannedItems]);

  useEffect(() => {
    if (!showBarcodeScanner) return;

    const scanner = new Html5QrcodeScanner(
      "barcode-scanner-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false
    );

    scanner.render(
      (decodedText: string) => {
        processBarcode(decodedText);
        setShowBarcodeScanner(false);
        scanner.clear().catch(() => {});
        scannerRef.current = null;
      },
      () => {}
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showBarcodeScanner, processBarcode]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(scanInput);
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

  const confirmReturn = async () => {
    if (!scanningOrderId) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "zurueckgebracht" })
      .eq("id", scanningOrderId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Rückgabe bestätigt.");
    // Open damage capture
    setDamageOrderId(scanningOrderId);
    setScanningOrderId(null);
    setScanningOrder(null);
    setScannedItems([]);
    setOrderItems([]);
    setShowDamageCapture(true);
    setDamageProductIds(orderItems[0]?.product?.id ? [orderItems[0].product.id] : []);
    loadOrders();
  };

  const handleDamagePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild hochladen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5 MB gross sein.");
      return;
    }
    if (damagePhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(damagePhotoPreview);
    }
    const url = URL.createObjectURL(file);
    setDamagePhotoFile(file);
    setDamagePhotoPreview(url);
  };

  const saveDamage = async () => {
    if (!damageOrderId || !damageDescription.trim()) {
      toast.error("Bitte eine Beschreibung eingeben.");
      return;
    }
    setSavingDamage(true);

    let photoPath: string | null = null;
    if (damagePhotoFile) {
      const ext = damagePhotoFile.name.split(".").pop() || "jpg";
      const fileName = `damage-${damageOrderId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("damage-photos")
        .upload(fileName, damagePhotoFile, { contentType: damagePhotoFile.type });
      if (uploadError) {
        toast.error("Fehler beim Upload: " + uploadError.message);
        setSavingDamage(false);
        return;
      }
      photoPath = fileName;
    }

    const { error } = await supabase.from("damage_logs").insert({
      order_id: damageOrderId,
      product_ids: damageProductIds.length > 0 ? damageProductIds : null,
      description: damageDescription.trim(),
      photo_path: photoPath,
      severity: damageSeverity,
    });

    setSavingDamage(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Schadensprotokoll gespeichert.");
    closeDamageCapture();
  };

  const closeDamageCapture = () => {
    setShowDamageCapture(false);
    setDamageDescription("");
    setDamageSeverity("leicht");
    setDamagePhotoFile(null);
    if (damagePhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(damagePhotoPreview);
    }
    setDamagePhotoPreview(null);
    setDamageProductIds([]);
    setDamageCameraActive(false);
    stopCamera();
    setDamageOrderId(null);
  };

  const startDamageCamera = async () => {
    setDamageCameraActive(true);
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
      setDamageCameraActive(false);
    }
  };

  const captureDamagePhoto = () => {
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
        if (damagePhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(damagePhotoPreview);
        const file = new File([blob], `damage-${Date.now()}.jpg`, { type: "image/jpeg" });
        setDamagePhotoFile(file);
        setDamagePhotoPreview(url);
        stopCamera();
        setDamageCameraActive(false);
      },
      "image/jpeg",
      0.9
    );
  };

  const cancelScan = () => {
    setScanningOrderId(null);
    setScanningOrder(null);
    setScannedItems([]);
    setOrderItems([]);
    stopCamera();
    setShowIdCapture(false);
    setShowBarcodeScanner(false);
    setShowDamageCapture(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
  };

  // Filter orders
  const pickupOrders = orders
    .filter((o) => o.pickup_date)
    .sort((a, b) => new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime());

  const returnOrders = orders
    .filter((o) => o.return_date)
    .sort((a, b) => new Date(a.return_date).getTime() - new Date(b.return_date).getTime());

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
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {backImage && (
                  <img
                    src={backImage}
                    alt="Rückseite"
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                    decoding="async"
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
    const isPickup = scanMode === "pickup";

    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">{isPickup ? "Abholung scannen" : "Rückgabe scannen"}</h1>
          <button onClick={cancelScan} className="p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ID Capture Button - only for pickup */}
        {isPickup && (
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
          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            className="btn-primary px-4"
          >
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
          onClick={isPickup ? confirmPickup : confirmReturn}
          disabled={!allScanned}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
            allScanned
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-2" />
          {isPickup ? "Abholung bestätigen" : "Rückgabe bestätigen"}
        </button>

        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Barcode scannen</h3>
                <button
                  onClick={() => {
                    setShowBarcodeScanner(false);
                    if (scannerRef.current) {
                      scannerRef.current.clear().catch(() => {});
                      scannerRef.current = null;
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div id="barcode-scanner-container" className="rounded-lg overflow-hidden" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Damage Capture Modal
  if (showDamageCapture) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">Schadensprotokoll</h1>
          <button onClick={closeDamageCapture} className="p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Optionale Schadensdokumentation</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Betroffene Artikel</label>
            <div className="space-y-2">
              {orderItems.map((item) => {
                const pid = item.product?.id;
                const checked = pid && damageProductIds.includes(pid);
                return (
                  <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => {
                        if (!pid) return;
                        setDamageProductIds((prev) =>
                          e.target.checked ? [...prev, pid] : prev.filter((id) => id !== pid)
                        );
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="text-sm">{item.product?.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{item.product?.product_id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schweregrad</label>
            <div className="flex gap-2">
              {(["leicht", "mittel", "schwer"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setDamageSeverity(s)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    damageSeverity === s
                      ? s === "schwer"
                        ? "bg-red-100 border-red-300 text-red-800"
                        : s === "mittel"
                        ? "bg-amber-100 border-amber-300 text-amber-800"
                        : "bg-green-100 border-green-300 text-green-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "leicht" ? "Leicht" : s === "mittel" ? "Mittel" : "Schwer"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
            <textarea
              rows={3}
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              placeholder="Beschreiben Sie den Schaden..."
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
            {damagePhotoPreview ? (
              <div className="relative inline-block">
                <img
                  src={damagePhotoPreview}
                  alt="Vorschau"
                  className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                  loading="lazy"
                  decoding="async"
                />
                <button
                  onClick={() => {
                    if (damagePhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(damagePhotoPreview);
                    setDamagePhotoPreview(null);
                    setDamagePhotoFile(null);
                  }}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : damageCameraActive ? (
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    onClick={() => {
                      stopCamera();
                      setDamageCameraActive(false);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm backdrop-blur"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={captureDamagePhoto}
                    className="w-14 h-14 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startDamageCamera}
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Foto aufnehmen</span>
                </button>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Foto hochladen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleDamagePhotoChange} />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={closeDamageCapture} className="flex-1 btn-secondary py-3">
            Überspringen
          </button>
          <button
            onClick={saveDamage}
            disabled={savingDamage || !damageDescription.trim()}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {savingDamage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Auftragsplaner</h1>
        <p className="text-gray-600 mt-1">Übersicht aller aktiven Aufträge</p>
      </div>

      {/* Pickups */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Abholungen</h2>
          <span className="text-sm text-gray-500">({pickupOrders.length})</span>
        </div>
        <div className="grid gap-4">
          {pickupOrders.length > 0 ? (
            pickupOrders.map((order) => (
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
                  <div className="flex items-center gap-2 mt-1">
                    {order.payment_status === "vollstaendig" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                        Bezahlt
                      </span>
                    )}
                    {order.payment_status === "anzahlung" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                        Anzahlung
                      </span>
                    )}
                    {order.payment_status === "offen" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                        Offen
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                    <div className="flex items-center gap-1.5 text-blue-700">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="font-medium">{formatDate(order.pickup_date)}</span>
                      {order.pickup_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.pickup_time}
                        </span>
                      )}
                    </div>
                    {order.pickup_staff && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        {order.pickup_staff.full_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/auftraege/${order.id}/`}
                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    title="Details"
                  >
                    <Eye className="w-4 h-4" />
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
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Keine geplanten Abholungen.</p>
            </div>
          )}
        </div>
      </div>

      {/* Returns */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <PackageOpen className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">Rückgaben</h2>
          <span className="text-sm text-gray-500">({returnOrders.length})</span>
        </div>
        <div className="grid gap-4">
          {returnOrders.length > 0 ? (
            returnOrders.map((order) => (
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
                  <div className="flex items-center gap-2 mt-1">
                    {order.payment_status === "vollstaendig" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">Bezahlt</span>
                    )}
                    {order.payment_status === "anzahlung" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">Anzahlung</span>
                    )}
                    {order.payment_status === "offen" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">Offen</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                    <div className="flex items-center gap-1.5 text-purple-700">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="font-medium">{formatDate(order.return_date)}</span>
                      {order.return_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {order.return_time}
                        </span>
                      )}
                    </div>
                    {order.return_staff && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        {order.return_staff.full_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/auftraege/${order.id}/`}
                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    title="Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {(order.status === "abgeholt" || order.status === "bestaetigt") && (
                    <button onClick={() => startReturn(order.id)} className="btn-primary text-sm py-2 px-3">
                      <QrCode className="w-4 h-4 mr-1" /> Rückgabe
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <PackageOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Keine geplanten Rückgaben.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
