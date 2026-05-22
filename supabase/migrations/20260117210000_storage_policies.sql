-- Storage Bucket Policies
-- Sets up Row Level Security (RLS) policies for all storage buckets

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AVATARS BUCKET (Public Read, Authenticated Write)
-- ============================================

-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
CREATE POLICY "Authenticated upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- SPECIES-IMAGES BUCKET (Public Read, Authenticated Write)
-- ============================================

-- Allow public read access to species images
DROP POLICY IF EXISTS "Public read access for species-images" ON storage.objects;
CREATE POLICY "Public read access for species-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'species-images');

-- Allow authenticated users to upload species images
DROP POLICY IF EXISTS "Authenticated upload species-images" ON storage.objects;
CREATE POLICY "Authenticated upload species-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'species-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update species images
DROP POLICY IF EXISTS "Authenticated update species-images" ON storage.objects;
CREATE POLICY "Authenticated update species-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'species-images'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete species images
DROP POLICY IF EXISTS "Authenticated delete species-images" ON storage.objects;
CREATE POLICY "Authenticated delete species-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'species-images'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- FIRMWARE BUCKET (Authenticated Read/Write)
-- ============================================

-- Allow authenticated users to read firmware
DROP POLICY IF EXISTS "Authenticated read firmware" ON storage.objects;
CREATE POLICY "Authenticated read firmware"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'firmware'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload firmware
DROP POLICY IF EXISTS "Authenticated upload firmware" ON storage.objects;
CREATE POLICY "Authenticated upload firmware"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'firmware'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update firmware
DROP POLICY IF EXISTS "Authenticated update firmware" ON storage.objects;
CREATE POLICY "Authenticated update firmware"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'firmware'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete firmware
DROP POLICY IF EXISTS "Authenticated delete firmware" ON storage.objects;
CREATE POLICY "Authenticated delete firmware"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'firmware'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- DOCUMENTS BUCKET (Authenticated Read/Write)
-- ============================================

-- Allow authenticated users to read documents
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;
CREATE POLICY "Authenticated read documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;
CREATE POLICY "Authenticated upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own documents
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- TELEMETRY-EXPORTS BUCKET (Authenticated Read/Write)
-- ============================================

-- Allow authenticated users to read telemetry exports
DROP POLICY IF EXISTS "Authenticated read telemetry-exports" ON storage.objects;
CREATE POLICY "Authenticated read telemetry-exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'telemetry-exports'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload telemetry exports
DROP POLICY IF EXISTS "Authenticated upload telemetry-exports" ON storage.objects;
CREATE POLICY "Authenticated upload telemetry-exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'telemetry-exports'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update telemetry exports
DROP POLICY IF EXISTS "Authenticated update telemetry-exports" ON storage.objects;
CREATE POLICY "Authenticated update telemetry-exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'telemetry-exports'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete telemetry exports
DROP POLICY IF EXISTS "Authenticated delete telemetry-exports" ON storage.objects;
CREATE POLICY "Authenticated delete telemetry-exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'telemetry-exports'
  AND auth.role() = 'authenticated'
);
