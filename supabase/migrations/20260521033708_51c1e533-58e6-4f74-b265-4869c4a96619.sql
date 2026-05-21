
-- 1. Add 'driver' to app_role enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'driver' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'driver';
  END IF;
END $$;

-- 2. seat_bookings.checked_in_at
ALTER TABLE public.seat_bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- 3. schedules.status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schedules' AND column_name='status') THEN
    ALTER TABLE public.schedules ADD COLUMN status text NOT NULL DEFAULT 'scheduled';
  END IF;
END $$;

-- 4. Driver can update seat_bookings of own vehicle's schedule (for check-in)
DROP POLICY IF EXISTS "seatbk driver checkin" ON public.seat_bookings;
CREATE POLICY "seatbk driver checkin" ON public.seat_bookings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.schedules s ON s.id = b.schedule_id
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE b.id = seat_bookings.booking_id AND d.id = auth.uid()
  )
);

-- 4b. Driver can read seat_bookings of own vehicle's schedule
DROP POLICY IF EXISTS "seatbk driver read" ON public.seat_bookings;
CREATE POLICY "seatbk driver read" ON public.seat_bookings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.schedules s ON s.id = b.schedule_id
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE b.id = seat_bookings.booking_id AND d.id = auth.uid()
  )
);

-- 4c. Driver can read bookings of own vehicle's schedule
DROP POLICY IF EXISTS "bookings driver read" ON public.bookings;
CREATE POLICY "bookings driver read" ON public.bookings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.schedules s
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE s.id = bookings.schedule_id AND d.id = auth.uid()
  )
);

-- 5. Driver can update schedules of own vehicle (status)
DROP POLICY IF EXISTS "schedules driver update" ON public.schedules;
CREATE POLICY "schedules driver update" ON public.schedules
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.vehicle_id = schedules.vehicle_id)
);

-- 6. Ride orders: driver can read requested orders (for matching screen)
DROP POLICY IF EXISTS "ride driver read requested" ON public.ride_orders;
CREATE POLICY "ride driver read requested" ON public.ride_orders
FOR SELECT TO authenticated
USING (
  status = 'requested' AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.status = 'online')
);

-- 7. Realtime for schedules + seat_bookings
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.seat_bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_bookings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
