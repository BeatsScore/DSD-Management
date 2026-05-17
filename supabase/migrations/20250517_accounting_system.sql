-- ============================================
-- Buchhaltungssystem: Vollständige Migration
-- IDEMPOTENT — kann mehrfach ausgeführt werden
-- ============================================

-- 1. Kategorien (frei definierbar)
CREATE TABLE IF NOT EXISTS public.accounting_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('einnahme', 'ausgabe')),
  color text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Default-Kategorien (idempotent)
INSERT INTO public.accounting_categories (name, type, color) VALUES
  ('Mieteinnahmen', 'einnahme', '#22c55e'),
  ('Transportkosten', 'ausgabe', '#f97316'),
  ('Technikankauf', 'ausgabe', '#3b82f6'),
  ('Reparaturen', 'ausgabe', '#ef4444'),
  ('Löhne', 'ausgabe', '#8b5cf6'),
  ('Versicherung', 'ausgabe', '#06b6d4'),
  ('Steuern', 'ausgabe', '#f59e0b'),
  ('Sonstiges', 'ausgabe', '#6b7280')
ON CONFLICT DO NOTHING;

-- 2. Lieferanten
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  address text,
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Buchungseinträge (zentrales Register)
-- WICHTIG: entry_number wird automatisch per Trigger generiert
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('einnahme', 'ausgabe')),
  tax_rate numeric(5,2) DEFAULT 0,
  payment_method text CHECK (payment_method IN ('bar', 'ueberweisung', 'karte', 'paypal', 'andere')),
  description text,
  category_id uuid REFERENCES public.accounting_categories(id),
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  order_id uuid REFERENCES public.orders(id),
  document_id uuid REFERENCES public.documents(id),
  status text DEFAULT 'gebucht' CHECK (status IN ('gebucht', 'storniert', 'archiviert')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Verknüpfung Buchung ↔ Rechnung
CREATE TABLE IF NOT EXISTS public.accounting_entry_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  allocated_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Dateianhänge pro Buchung
CREATE TABLE IF NOT EXISTS public.accounting_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- 6. Monatsabschlüsse
CREATE TABLE IF NOT EXISTS public.accounting_monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  total_income numeric(12,2) DEFAULT 0,
  total_expenses numeric(12,2) DEFAULT 0,
  profit numeric(12,2) DEFAULT 0,
  open_receivables numeric(12,2) DEFAULT 0,
  open_payables numeric(12,2) DEFAULT 0,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, month)
);

-- 7. Änderungsprotokoll
CREATE TABLE IF NOT EXISTS public.accounting_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES (idempotent)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON public.accounting_entries(date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_category ON public.accounting_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_status ON public.accounting_entries(status);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_type ON public.accounting_entries(type);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_order ON public.accounting_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_invoices_entry ON public.accounting_entry_invoices(entry_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_invoices_order ON public.accounting_entry_invoices(order_id);

-- ============================================
-- RLS (idempotent mit DROP POLICY IF EXISTS)
-- ============================================
ALTER TABLE public.accounting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entry_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and staff full access on accounting_categories" ON public.accounting_categories;
CREATE POLICY "Admin and staff full access on accounting_categories" ON public.accounting_categories FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on accounting_entries" ON public.accounting_entries;
CREATE POLICY "Admin and staff full access on accounting_entries" ON public.accounting_entries FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on suppliers" ON public.suppliers;
CREATE POLICY "Admin and staff full access on suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on accounting_entry_invoices" ON public.accounting_entry_invoices;
CREATE POLICY "Admin and staff full access on accounting_entry_invoices" ON public.accounting_entry_invoices FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on accounting_attachments" ON public.accounting_attachments;
CREATE POLICY "Admin and staff full access on accounting_attachments" ON public.accounting_attachments FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on accounting_monthly_closings" ON public.accounting_monthly_closings;
CREATE POLICY "Admin and staff full access on accounting_monthly_closings" ON public.accounting_monthly_closings FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin and staff full access on accounting_activity_logs" ON public.accounting_activity_logs;
CREATE POLICY "Admin and staff full access on accounting_activity_logs" ON public.accounting_activity_logs FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

-- ============================================
-- AUTO-GENERIERUNG: Buchungsnummer
-- Format: E-YYYY-NNNNN (Einnahme) / A-YYYY-NNNNN (Ausgabe)
-- ============================================

-- Funktion zur Nummerngenerierung
CREATE OR REPLACE FUNCTION public.generate_entry_number(p_type text)
RETURNS text AS $$
DECLARE
  prefix text;
  year_str text;
  next_num integer;
  result text;
BEGIN
  prefix := CASE WHEN p_type = 'einnahme' THEN 'E' ELSE 'A' END;
  year_str := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(entry_number, '.*-', ''), '')), '0')::integer
  INTO next_num
  FROM public.accounting_entries
  WHERE entry_number LIKE prefix || '-' || year_str || '-%';
  
  next_num := next_num + 1;
  result := prefix || '-' || year_str || '-' || LPAD(next_num::text, 5, '0');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Setzt entry_number automatisch vor dem INSERT
CREATE OR REPLACE FUNCTION public.set_entry_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := public.generate_entry_number(NEW.type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_entry_number ON public.accounting_entries;
CREATE TRIGGER trigger_auto_entry_number
  BEFORE INSERT ON public.accounting_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_entry_number();

-- ============================================
-- AUTO-UPDATE: updated_at Spalten
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_accounting_entries_updated_at ON public.accounting_entries;
CREATE TRIGGER update_accounting_entries_updated_at
  BEFORE UPDATE ON public.accounting_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
