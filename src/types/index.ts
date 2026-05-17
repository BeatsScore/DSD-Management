export type UserRole = "admin" | "staff" | "customer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

export type ProductStatus = "verfuegbar" | "vermietet" | "reserviert" | "defekt" | "inaktiv";

export type ProductCondition = "neu" | "gut" | "gebraucht" | "defekt";

export interface Product {
  id: string;
  product_id: string;
  name: string;
  manufacturer: string;
  manufacture_date: string | null;
  dimensions: string | null;
  description: string | null;
  category_id: string | null;
  category?: ProductCategory;
  status: ProductStatus;
  barcode: string;
  barcode_data_url: string | null;
  image_urls: string[] | null;
  technical_specs: string | null;
  rental_price_per_day: number | null;
  quantity: number;
  manual_url: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  weight: number | null;
  condition: ProductCondition | null;
  owner_id: string | null;
  owner?: Profile;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "offen" | "verhandlungsphase" | "vertragsphase" | "bestaetigt" | "abgeholt" | "zurueckgebracht" | "abgeschlossen" | "storniert";

export type TrustStatus = "gruen" | "gelb" | "rot";

export interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  rating_payment: number | null;
  rating_behavior: number | null;
  rating_equipment_care: number | null;
  trust_status: TrustStatus;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  assigned_to: string | null;
  assigned_profile?: Profile;
  status: OrderStatus;
  start_date: string;
  end_date: string;
  total_amount: number | null;
  notes: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_staff_id: string | null;
  pickup_staff?: Profile | null;
  return_date: string | null;
  return_time: string | null;
  return_staff_id: string | null;
  return_staff?: Profile | null;
  payment_status: "offen" | "anzahlung" | "vollstaendig" | null;
  payment_method: "bar" | "ueberweisung" | "karte" | "paypal" | null;
  paid_amount: number | null;
  discount_type: "prozentual" | "absolut" | null;
  discount_amount: number | null;
  discount_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_item_id?: string | null;
  product?: Product;
  quantity: number;
  price_per_day: number | null;
  created_at: string;
}

export type RequestStatus = "offen" | "bearbeitung" | "abgelehnt" | "angebot_erstellt";

export interface Request {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  event_description: string | null;
  start_date: string | null;
  end_date: string | null;
  product_ids: string[] | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  order_id: string;
  type: "angebot" | "rechnung" | "mietvertrag" | "auftragsbestaetigung" | "ablehnung";
  file_url: string | null;
  file_name: string;
  created_at: string;
}

export interface InventoryStatusLog {
  id: string;
  product_id: string;
  old_status: ProductStatus;
  new_status: ProductStatus;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface PickupSession {
  id: string;
  order_id: string;
  started_at: string;
  completed_at: string | null;
  scanned_items: string[];
  started_by: string;
}

export interface DamageLog {
  id: string;
  order_id: string;
  product_ids: string[] | null;
  product_item_ids: string[] | null;
  description: string;
  photo_path: string | null;
  severity: "leicht" | "mittel" | "schwer";
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  product_id: string;
  product?: Product;
  maintenance_date: string;
  description: string;
  cost: number | null;
  next_service_date: string | null;
  performed_by: string | null;
  performed_by_profile?: Profile | null;
  created_at: string;
}

export interface ProductSet {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rental_price_per_day: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetItem {
  id: string;
  set_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  created_at: string;
}

export interface OrderItemAssignment {
  id: string;
  order_id: string;
  product_item_id: string;
  product_item?: {
    id: string;
    barcode: string;
    serial_number: string | null;
    product?: Product;
  };
  action_type: "pickup" | "return";
  created_at: string;
  created_by: string | null;
}

export interface ProductOwner {
  id: string;
  product_id: string;
  owner_id: string;
  owner?: Profile;
  quantity: number;
  created_at: string;
}
