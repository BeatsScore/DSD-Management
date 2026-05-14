import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-CH");
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("de-CH");
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(amount);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `AUF-${year}-${random}`;
}

export function generateProductId(categoryPrefix: string, index: number): string {
  const padded = String(index).padStart(4, "0");
  return `${categoryPrefix.toUpperCase()}-${padded}`;
}

export function generateBarcode(): string {
  // 8-character alphanumeric barcode (uppercase + digits)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSerialNumber(productId: string, index: number): string {
  const padded = String(index).padStart(3, "0");
  return `${productId}-${padded}`;
}

export function safeParseFloat(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (str === "") return null;
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

export function safeParseInt(value: string | number | null | undefined, fallback = 1): number {
  if (value == null) return fallback;
  const str = String(value).trim();
  if (str === "") return fallback;
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function getRentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // inclusive of both start and end day
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    verfuegbar: "bg-green-100 text-green-800",
    vermietet: "bg-blue-100 text-blue-800",
    reserviert: "bg-yellow-100 text-yellow-800",
    defekt: "bg-red-100 text-red-800",
    offen: "bg-gray-100 text-gray-800",
    verhandlungsphase: "bg-yellow-100 text-yellow-800",
    vertragsphase: "bg-orange-100 text-orange-800",
    bestaetigt: "bg-green-100 text-green-800",
    abgeholt: "bg-blue-100 text-blue-800",
    zurueckgebracht: "bg-purple-100 text-purple-800",
    abgeschlossen: "bg-green-100 text-green-800",
    storniert: "bg-red-100 text-red-800",
    bearbeitung: "bg-blue-100 text-blue-800",
    abgelehnt: "bg-red-100 text-red-800",
    angebot_erstellt: "bg-yellow-100 text-yellow-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function sortCategoriesHierarchical(categories: { id: string; name: string; parent_id: string | null }[]) {
  const map = new Map<string, { id: string; name: string; parent_id: string | null }>();
  categories.forEach((c) => map.set(c.id, c));

  const mains = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: { id: string; name: string; parent_id: string | null; level: number }[] = [];

  mains.forEach((main) => {
    result.push({ ...main, level: 0 });
    const subs = categories
      .filter((c) => c.parent_id === main.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    subs.forEach((sub) => result.push({ ...sub, level: 1 }));
  });

  return result;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    verfuegbar: "Verfügbar",
    vermietet: "Vermietet",
    reserviert: "Reserviert",
    defekt: "Defekt",
    offen: "Offen",
    verhandlungsphase: "Verhandlungsphase",
    vertragsphase: "Vertragsphase",
    bestaetigt: "Bestätigt",
    abgeholt: "Abgeholt",
    zurueckgebracht: "Zurückgebracht",
    abgeschlossen: "Abgeschlossen",
    storniert: "Storniert",
    bearbeitung: "In Bearbeitung",
    abgelehnt: "Abgelehnt",
    angebot_erstellt: "Angebot erstellt",
  };
  return labels[status] || status;
}
