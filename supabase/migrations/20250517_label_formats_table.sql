-- Create label_formats table for shared barcode label formats
-- Stores label formats in the database so all users see the same formats

CREATE TABLE IF NOT EXISTS public.label_formats (
  id text PRIMARY KEY,
  name text NOT NULL,
  width integer NOT NULL, -- mm
  height integer NOT NULL, -- mm
  padding jsonb NOT NULL DEFAULT '{"top": 2, "right": 2, "bottom": 2, "left": 2}',
  elements jsonb NOT NULL DEFAULT '[]',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.label_formats ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read label formats
CREATE POLICY "Label formats are readable by all authenticated users"
  ON public.label_formats
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin and staff to modify label formats
CREATE POLICY "Label formats are editable by admin and staff"
  ON public.label_formats
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Insert default formats
INSERT INTO public.label_formats (id, name, width, height, padding, elements, is_default)
VALUES (
  '62mm-default',
  '62mm Endlos (62 x 30mm)',
  62,
  30,
  '{"top": 1.5, "right": 2, "bottom": 1.5, "left": 2}',
  '[
    {"id": "el1", "type": "logo", "x": 2, "y": 3, "width": 18, "height": 10},
    {"id": "el2", "type": "text", "x": 24, "y": 4, "width": 35, "height": 5, "content": "product_id", "fontSize": 11, "fontWeight": "600", "align": "left"},
    {"id": "el3", "type": "text", "x": 24, "y": 10, "width": 35, "height": 5, "content": "product_name", "fontSize": 13, "fontWeight": "400", "align": "left"},
    {"id": "el4", "type": "barcode", "x": 2, "y": 16, "width": 58, "height": 10, "barcodeLineWidth": 3, "barcodeHeight": 80, "barcodeDisplayValue": false, "barcodeShorten": true},
    {"id": "el5", "type": "text", "x": 2, "y": 26.5, "width": 58, "height": 2.5, "content": "barcode_text", "fontSize": 8, "fontWeight": "400", "align": "center"}
  ]',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  padding = EXCLUDED.padding,
  elements = EXCLUDED.elements,
  is_default = EXCLUDED.is_default,
  updated_at = now();

INSERT INTO public.label_formats (id, name, width, height, padding, elements, is_default)
VALUES (
  '29mm-default',
  '29mm Standard (90 x 29mm)',
  90,
  29,
  '{"top": 1.5, "right": 2, "bottom": 1.5, "left": 2}',
  '[
    {"id": "el1", "type": "logo", "x": 2, "y": 1, "width": 25, "height": 25},
    {"id": "el2", "type": "text", "x": 30, "y": 3, "width": 25, "height": 4, "content": "product_id", "fontSize": 9, "fontWeight": "600", "align": "left"},
    {"id": "el3", "type": "text", "x": 30, "y": 8, "width": 25, "height": 4, "content": "product_name", "fontSize": 10, "fontWeight": "400", "align": "left"},
    {"id": "el4", "type": "barcode", "x": 58, "y": 1.5, "width": 28, "height": 22, "barcodeLineWidth": 3, "barcodeHeight": 80, "barcodeDisplayValue": false, "barcodeShorten": true},
    {"id": "el5", "type": "text", "x": 58, "y": 24, "width": 28, "height": 3, "content": "barcode_text", "fontSize": 7, "fontWeight": "400", "align": "center"}
  ]',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  padding = EXCLUDED.padding,
  elements = EXCLUDED.elements,
  is_default = EXCLUDED.is_default,
  updated_at = now();
