
-- Tighten bookings driver read: only show passenger data for schedules
-- departing within a reasonable operational window (yesterday → tomorrow),
-- so drivers can't enumerate every passenger on every past/future trip
-- of any vehicle they're assigned to.
DROP POLICY IF EXISTS "bookings driver read" ON public.bookings;

CREATE POLICY "bookings driver read"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE s.id = bookings.schedule_id
      AND d.id = auth.uid()
      AND s.departure_at >= (now() - interval '1 day')
      AND s.departure_at <= (now() + interval '1 day')
  )
);

-- Apply the same operational window to driver check-in of seat bookings
-- so drivers can only read/update seat bookings for trips happening near now.
DROP POLICY IF EXISTS "seatbk driver read" ON public.seat_bookings;
CREATE POLICY "seatbk driver read"
ON public.seat_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.schedules s ON s.id = b.schedule_id
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE b.id = seat_bookings.booking_id
      AND d.id = auth.uid()
      AND s.departure_at >= (now() - interval '1 day')
      AND s.departure_at <= (now() + interval '1 day')
  )
);

DROP POLICY IF EXISTS "seatbk driver checkin" ON public.seat_bookings;
CREATE POLICY "seatbk driver checkin"
ON public.seat_bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.schedules s ON s.id = b.schedule_id
    JOIN public.drivers d ON d.vehicle_id = s.vehicle_id
    WHERE b.id = seat_bookings.booking_id
      AND d.id = auth.uid()
      AND s.departure_at >= (now() - interval '1 day')
      AND s.departure_at <= (now() + interval '1 day')
  )
);
