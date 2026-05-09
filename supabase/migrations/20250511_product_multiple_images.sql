-- Products: support multiple images

-- 1. Add image_urls array column
alter table public.products
  add column if not exists image_urls text[];

-- 2. Migrate existing data: copy image_url into image_urls array
update public.products
  set image_urls = array[image_url]
  where image_url is not null and image_urls is null;

-- 3. Drop old single-image column
alter table public.products
  drop column if exists image_url;
