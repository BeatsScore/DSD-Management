import { createClient } from "@/lib/supabase/client";

export type LabelElementType = "logo" | "barcode" | "text";

export type TextContent =
  | "product_id"
  | "product_name"
  | "serial_number"
  | "barcode_text"
  | "custom";

export interface LabelElement {
  id: string;
  type: LabelElementType;
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
  rotation?: number; // degrees: 0, 45, 90, 180, 270
  // barcode-specific
  barcodeLineWidth?: number; // px, default 2
  barcodeHeight?: number; // px, default 80
  barcodeDisplayValue?: boolean; // show text under bars, default false
  barcodeShorten?: boolean; // use shortened value (last 6 chars), default false
  // text-specific
  content?: TextContent;
  customText?: string;
  fontSize?: number; // px
  fontWeight?: string;
  align?: "left" | "center" | "right";
}

export interface LabelFormat {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: LabelElement[];
  is_default?: boolean;
}

const STORAGE_KEY = "dsd-label-formats-cache";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const DEFAULT_FORMATS: LabelFormat[] = [
  {
    id: "62mm-default",
    name: "62mm Endlos (62 x 30mm)",
    width: 62,
    height: 30,
    padding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
    is_default: true,
    elements: [
      {
        id: "el1",
        type: "logo",
        x: 2,
        y: 3,
        width: 18,
        height: 10,
      },
      {
        id: "el2",
        type: "text",
        x: 24,
        y: 4,
        width: 35,
        height: 5,
        content: "product_id",
        fontSize: 11,
        fontWeight: "600",
        align: "left",
      },
      {
        id: "el3",
        type: "text",
        x: 24,
        y: 10,
        width: 35,
        height: 5,
        content: "product_name",
        fontSize: 13,
        fontWeight: "400",
        align: "left",
      },
      {
        id: "el4",
        type: "barcode",
        x: 2,
        y: 16,
        width: 58,
        height: 10,
        barcodeLineWidth: 3,
        barcodeHeight: 80,
        barcodeDisplayValue: false,
        barcodeShorten: true,
      },
      {
        id: "el5",
        type: "text",
        x: 2,
        y: 26.5,
        width: 58,
        height: 2.5,
        content: "barcode_text",
        fontSize: 8,
        fontWeight: "400",
        align: "center",
      },
    ],
  },
  {
    id: "29mm-default",
    name: "29mm Standard (90 x 29mm)",
    width: 90,
    height: 29,
    padding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
    is_default: true,
    elements: [
      {
        id: "el1",
        type: "logo",
        x: 2,
        y: 1,
        width: 25,
        height: 25,
      },
      {
        id: "el2",
        type: "text",
        x: 30,
        y: 3,
        width: 25,
        height: 4,
        content: "product_id",
        fontSize: 9,
        fontWeight: "600",
        align: "left",
      },
      {
        id: "el3",
        type: "text",
        x: 30,
        y: 8,
        width: 25,
        height: 4,
        content: "product_name",
        fontSize: 10,
        fontWeight: "400",
        align: "left",
      },
      {
        id: "el4",
        type: "barcode",
        x: 58,
        y: 1.5,
        width: 28,
        height: 22,
        barcodeLineWidth: 3,
        barcodeHeight: 80,
        barcodeDisplayValue: false,
        barcodeShorten: true,
      },
      {
        id: "el5",
        type: "text",
        x: 58,
        y: 24,
        width: 28,
        height: 3,
        content: "barcode_text",
        fontSize: 7,
        fontWeight: "400",
        align: "center",
      },
    ],
  },
];

function dbRowToFormat(row: any): LabelFormat {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    padding: typeof row.padding === "string" ? JSON.parse(row.padding) : row.padding,
    elements: Array.isArray(row.elements) ? row.elements : JSON.parse(row.elements || "[]"),
    is_default: row.is_default,
  };
}

function formatToDbRow(format: LabelFormat): any {
  return {
    id: format.id,
    name: format.name,
    width: format.width,
    height: format.height,
    padding: format.padding,
    elements: format.elements,
    is_default: format.is_default ?? false,
  };
}

// Load from Supabase (primary) or fallback to localStorage cache
export async function loadLabelFormatsFromDb(): Promise<LabelFormat[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("label_formats")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error loading label formats from DB:", error);
    // Fallback to localStorage cache
    return loadLabelFormatsFromCache();
  }

  if (data && data.length > 0) {
    const formats = data.map(dbRowToFormat);
    // Update cache
    saveLabelFormatsToCache(formats);
    return formats;
  }

  // No data in DB yet — insert defaults
  for (const fmt of DEFAULT_FORMATS) {
    await supabase.from("label_formats").insert(formatToDbRow(fmt));
  }
  saveLabelFormatsToCache(DEFAULT_FORMATS);
  return DEFAULT_FORMATS;
}

// Synchronous version that reads from cache (for initial render)
export function loadLabelFormats(): LabelFormat[] {
  if (typeof window === "undefined") return DEFAULT_FORMATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FORMATS;
    const parsed = JSON.parse(raw) as LabelFormat[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FORMATS;
    return parsed;
  } catch {
    return DEFAULT_FORMATS;
  }
}

function loadLabelFormatsFromCache(): LabelFormat[] {
  return loadLabelFormats();
}

function saveLabelFormatsToCache(formats: LabelFormat[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
}

// Save to Supabase (admin and staff)
export async function saveLabelFormatToDb(format: LabelFormat): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("label_formats")
    .upsert(formatToDbRow(format), { onConflict: "id" });

  if (error) {
    console.error("Error saving label format to DB:", error);
    // Fallback: save to cache only
    saveLabelFormatToCache(format);
    return { success: false, error: error.message };
  }

  // Update cache
  const formats = loadLabelFormats();
  const idx = formats.findIndex((f) => f.id === format.id);
  if (idx >= 0) {
    formats[idx] = format;
  } else {
    formats.push(format);
  }
  saveLabelFormatsToCache(formats);
  return { success: true };
}

function saveLabelFormatToCache(format: LabelFormat): void {
  const formats = loadLabelFormats();
  const idx = formats.findIndex((f) => f.id === format.id);
  if (idx >= 0) {
    formats[idx] = format;
  } else {
    formats.push(format);
  }
  saveLabelFormatsToCache(formats);
}

export async function deleteLabelFormatFromDb(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("label_formats").delete().eq("id", id);

  if (error) {
    console.error("Error deleting label format from DB:", error);
    // Fallback: delete from cache only
    deleteLabelFormatFromCache(id);
    return false;
  }

  // Update cache
  const formats = loadLabelFormats().filter((f) => f.id !== id);
  saveLabelFormatsToCache(formats);
  return true;
}

function deleteLabelFormatFromCache(id: string): void {
  const formats = loadLabelFormats().filter((f) => f.id !== id);
  saveLabelFormatsToCache(formats);
}

export function getLabelFormat(id: string): LabelFormat | undefined {
  return loadLabelFormats().find((f) => f.id === id);
}

export async function getLabelFormatFromDb(id: string): Promise<LabelFormat | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("label_formats")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return getLabelFormat(id); // fallback to cache
  }

  return dbRowToFormat(data);
}

export function createNewLabelFormat(): LabelFormat {
  return {
    id: generateId(),
    name: "Neues Format",
    width: 62,
    height: 30,
    padding: { top: 2, right: 2, bottom: 2, left: 2 },
    elements: [],
  };
}

export function createLabelElement(type: LabelElementType, formatWidth: number, formatHeight: number): LabelElement {
  const id = generateId();
  const centerX = formatWidth / 2 - 10;
  const centerY = formatHeight / 2 - 5;
  switch (type) {
    case "logo":
      return { id, type, x: centerX, y: centerY, width: 15, height: 10 };
    case "barcode":
      return { id, type, x: centerX, y: centerY, width: 30, height: 10, barcodeLineWidth: 3, barcodeHeight: 80, barcodeDisplayValue: false, barcodeShorten: true };
    case "text":
      return {
        id,
        type,
        x: centerX,
        y: centerY,
        width: 30,
        height: 5,
        content: "product_name",
        fontSize: 12,
        fontWeight: "400",
        align: "left",
      };
  }
}

// 96 DPI: 1mm = 3.7795px
export const MM_TO_PX = 3.7795;

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}

export function isDefaultFormat(id: string): boolean {
  return DEFAULT_FORMATS.some((f) => f.id === id);
}
