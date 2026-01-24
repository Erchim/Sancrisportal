-- Storage policies for bucket "media" (create this bucket in Supabase UI)
-- Make the bucket PUBLIC so images can be loaded by the site.
--
-- This file adds RLS policies on storage.objects:
-- - anyone can read from bucket media
-- - only active authenticated users can upload into media/{user_id}/...
-- - users can update/delete only their own files (same folder)

alter table storage.objects enable row level security;

-- Anyone can read public media
DROP POLICY IF EXISTS "media_read_all" ON storage.objects;
CREATE POLICY "media_read_all"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');

-- Only active authenticated users can upload into their own folder
-- Path rule: first folder name MUST be the user's UUID.
DROP POLICY IF EXISTS "media_insert_own_folder" ON storage.objects;
CREATE POLICY "media_insert_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_active_user(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "media_update_own_folder" ON storage.objects;
CREATE POLICY "media_update_own_folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "media_delete_own_folder" ON storage.objects;
CREATE POLICY "media_delete_own_folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
