-- ============================================================
-- Migration 004: Email images support
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add header_image_url column to campaign_steps
ALTER TABLE public.campaign_steps
  ADD COLUMN IF NOT EXISTS header_image_url text;

-- ============================================================
-- 2. Create the email-images storage bucket (public reads)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-images',
  'email-images',
  true,           -- public: images must be reachable by email clients
  5242880,        -- 5 MB per file
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. RLS policies for the email-images bucket
-- ============================================================

-- Anyone can read (email clients fetch images without auth)
CREATE POLICY "email-images: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'email-images');

-- Authenticated users can upload
CREATE POLICY "email-images: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-images');

-- Authenticated users can replace their own uploads
CREATE POLICY "email-images: authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'email-images');

-- Authenticated users can delete
CREATE POLICY "email-images: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'email-images');
