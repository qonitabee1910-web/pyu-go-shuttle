-- Add columns the admin UI already references but DB is missing.
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS tier public.vehicle_tier NOT NULL DEFAULT 'Reguler';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS note text;