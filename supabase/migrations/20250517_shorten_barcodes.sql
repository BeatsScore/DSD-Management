-- Shorten all existing barcodes to 8 characters (A-Z, 0-9)
-- This updates both products and product_items tables

-- Helper function to generate a short barcode
CREATE OR REPLACE FUNCTION generate_short_barcode()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 36)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update products: generate new short barcodes
DO $$
DECLARE
  r record;
  new_barcode text;
BEGIN
  FOR r IN SELECT id, barcode FROM public.products WHERE length(barcode) > 8 LOOP
    LOOP
      new_barcode := generate_short_barcode();
      -- Ensure uniqueness
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = new_barcode AND id != r.id)
         AND NOT EXISTS (SELECT 1 FROM public.product_items WHERE barcode = new_barcode) THEN
        EXIT;
      END IF;
    END LOOP;
    UPDATE public.products SET barcode = new_barcode WHERE id = r.id;
  END LOOP;
END $$;

-- Update product_items: generate new short barcodes
DO $$
DECLARE
  r record;
  new_barcode text;
BEGIN
  FOR r IN SELECT id, barcode FROM public.product_items WHERE length(barcode) > 8 LOOP
    LOOP
      new_barcode := generate_short_barcode();
      -- Ensure uniqueness
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE barcode = new_barcode)
         AND NOT EXISTS (SELECT 1 FROM public.product_items WHERE barcode = new_barcode AND id != r.id) THEN
        EXIT;
      END IF;
    END LOOP;
    UPDATE public.product_items SET barcode = new_barcode WHERE id = r.id;
  END LOOP;
END $$;

-- Drop helper function
DROP FUNCTION IF EXISTS generate_short_barcode();
