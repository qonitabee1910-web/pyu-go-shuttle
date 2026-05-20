
-- 1. vehicle_locations table
CREATE TABLE IF NOT EXISTS public.vehicle_locations (
  vehicle_id uuid PRIMARY KEY,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  speed numeric,
  heading numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_loc read auth" ON public.vehicle_locations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vehicle_loc admin write" ON public.vehicle_locations
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "vehicle_loc driver upsert" ON public.vehicle_locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.vehicle_id = vehicle_locations.vehicle_id)
  );
CREATE POLICY "vehicle_loc driver update" ON public.vehicle_locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.vehicle_id = vehicle_locations.vehicle_id)
  );

-- 2. Add columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS external_id text;
CREATE INDEX IF NOT EXISTS payments_external_id_idx ON public.payments(external_id);

ALTER TABLE public.ride_orders ADD COLUMN IF NOT EXISTS eta_min integer;
ALTER TABLE public.ride_orders ADD COLUMN IF NOT EXISTS vehicle_meta jsonb;

-- 3. Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-images', 'vehicle-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars user write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-images');
CREATE POLICY "vehicle-images admin write" ON storage.objects
  FOR ALL USING (bucket_id = 'vehicle-images' AND has_role(auth.uid(), 'admin'));

-- 4. Housekeeping functions
CREATE OR REPLACE FUNCTION public.release_expired_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH upd AS (
    UPDATE public.seats
    SET status = 'available', hold_until = NULL, updated_at = now()
    WHERE status = 'held' AND hold_until IS NOT NULL AND hold_until < now()
    RETURNING 1
  )
  SELECT count(*) INTO n FROM upd;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_match_ride_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  drv uuid;
  matched integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.ride_orders WHERE status = 'requested' AND driver_id IS NULL LIMIT 20 LOOP
    SELECT id INTO drv FROM public.drivers WHERE status = 'online' ORDER BY rating DESC NULLS LAST LIMIT 1;
    IF drv IS NOT NULL THEN
      UPDATE public.ride_orders SET driver_id = drv, status = 'accepted', updated_at = now() WHERE id = r.id;
      matched := matched + 1;
    END IF;
  END LOOP;
  RETURN matched;
END;
$$;

-- 5. Enable realtime
ALTER TABLE public.vehicle_locations REPLICA IDENTITY FULL;
ALTER TABLE public.ride_orders REPLICA IDENTITY FULL;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. pg_cron job: every minute, release expired seats and match rides
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('housekeeping-every-minute');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'housekeeping-every-minute',
  '* * * * *',
  $cron$
    SELECT public.release_expired_holds();
    SELECT public.auto_match_ride_orders();
  $cron$
);
