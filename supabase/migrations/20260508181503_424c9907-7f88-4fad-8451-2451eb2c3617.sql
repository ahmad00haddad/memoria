
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'photographer', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Photographer profiles (public)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text,
  city text,
  base_location text,
  phone text,
  cliq_alias text,
  instagram text,
  whatsapp text,
  avatar_url text,
  cover_url text,
  equipment text,
  deposit_percent numeric NOT NULL DEFAULT 25,
  travel_fee_per_km numeric NOT NULL DEFAULT 0.5,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (is_published = true OR auth.uid() = id);
CREATE POLICY "owner update profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "owner insert profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Pricing rules per photographer
CREATE TYPE public.service_type AS ENUM ('photography', 'cinematic_video');
CREATE TYPE public.package_type AS ENUM ('hourly', 'full_day', 'addon');

CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service public.service_type NOT NULL,
  package public.package_type NOT NULL,
  label text NOT NULL,
  price numeric NOT NULL,
  per_photo_price numeric DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing public read" ON public.pricing_rules FOR SELECT USING (true);
CREATE POLICY "owner manage pricing" ON public.pricing_rules FOR ALL USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- Bookings
CREATE TYPE public.booking_status AS ENUM ('quote', 'pending_deposit', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  service public.service_type NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue_name text,
  venue_address text,
  venue_lat numeric,
  venue_lng numeric,
  edited_photos_count int DEFAULT 0,
  addons jsonb DEFAULT '[]'::jsonb,
  base_price numeric NOT NULL DEFAULT 0,
  travel_fee numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  deposit_proof_url text,
  status public.booking_status NOT NULL DEFAULT 'quote',
  client_notes text,
  photographer_notes text,
  contract_agreed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone insert booking quote" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "photographer or client read" ON public.bookings FOR SELECT USING (
  auth.uid() = photographer_id OR auth.uid() = client_user_id
);
CREATE POLICY "photographer update booking" ON public.bookings FOR UPDATE USING (auth.uid() = photographer_id);

-- Messages per booking
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages read by booking parties" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id))
);
CREATE POLICY "messages insert by parties" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id))
  OR sender_id IS NULL
);

-- Auto-create empty profile + photographer role on signup if metadata says photographer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'photographer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'photographer') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
