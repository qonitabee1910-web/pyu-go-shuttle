
-- Restrict public listing on storage buckets
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-images public read" ON storage.objects;

-- Files still publicly accessible by direct URL via Supabase Storage public endpoint;
-- but we disallow listing via the API by not granting an authenticated SELECT policy here.
-- For direct image access this is enough since buckets are flagged public.

-- Lock down SECURITY DEFINER housekeeping functions to service role only
REVOKE EXECUTE ON FUNCTION public.release_expired_holds() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_match_ride_orders() FROM PUBLIC, anon, authenticated;
