-- Create avatars storage bucket
-- Run this in Supabase SQL Editor, but note that storage bucket creation
-- must be done through the Supabase dashboard or API for now

-- This file documents the setup. In Supabase Dashboard:
-- 1. Go to Storage → Buckets
-- 2. Create new bucket named 'avatars'
-- 3. Make it Private
-- 4. Set up RLS policies as below

-- RLS Policies for avatars bucket
-- Allow users to upload their family member avatars
CREATE POLICY "Users can upload avatars"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    owner = auth.uid()
  );

-- Allow users to read avatars (including other users' if made public)
CREATE POLICY "Users can read their avatars"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars' AND
    owner = auth.uid()
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update their avatars"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    owner = auth.uid()
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their avatars"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    owner = auth.uid()
  );
