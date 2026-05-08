-- Product Sets
CREATE TABLE IF NOT EXISTS public.product_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  image_url text,
  rental_price_per_day numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Set items (link products to sets)
CREATE TABLE IF NOT EXISTS public.set_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id uuid REFERENCES public.product_sets(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.product_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated" ON public.product_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON public.product_sets FOR SELECT TO anon USING (true);

CREATE POLICY "Allow all access to authenticated" ON public.set_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON public.set_items FOR SELECT TO anon USING (true);

-- Storage for set images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('set-images', 'set-images', true)
  ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads on set-images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow authenticated uploads on set-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'set-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated updates on set-images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow authenticated updates on set-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'set-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on set-images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow public read on set-images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'set-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete on set-images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Allow authenticated delete on set-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'set-images');
  END IF;
END $$;
