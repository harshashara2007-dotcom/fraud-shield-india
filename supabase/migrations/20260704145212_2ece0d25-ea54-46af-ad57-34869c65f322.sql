
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own roles" ON public.user_roles;
CREATE POLICY "Users read their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Security definer role checker (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can read all roles
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can grant/revoke roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ BOOTSTRAP ADMIN TRIGGER ============
-- First user to sign up becomes admin; every user gets 'user' role.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============ ADMIN VIEWS ============
-- Admin can now see all scam_reports (including PII) via RLS
DROP POLICY IF EXISTS "Admins read all scam_reports" ON public.scam_reports;
CREATE POLICY "Admins read all scam_reports"
ON public.scam_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete bogus reports
DROP POLICY IF EXISTS "Admins delete scam_reports" ON public.scam_reports;
CREATE POLICY "Admins delete scam_reports"
ON public.scam_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete blacklist rows
DROP POLICY IF EXISTS "Admins delete phone_blacklist" ON public.phone_blacklist;
CREATE POLICY "Admins delete phone_blacklist"
ON public.phone_blacklist FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete upi_blacklist" ON public.upi_blacklist;
CREATE POLICY "Admins delete upi_blacklist"
ON public.upi_blacklist FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin stats RPC (returns row counts across all key tables)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_reports bigint,
  total_deepfakes bigint,
  total_phone_blacklist bigint,
  total_upi_blacklist bigint,
  total_users bigint,
  reports_24h bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.scam_reports),
    (SELECT count(*) FROM public.deepfakes),
    (SELECT count(*) FROM public.phone_blacklist),
    (SELECT count(*) FROM public.upi_blacklist),
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM public.scam_reports WHERE created_at > now() - interval '24 hours');
END;
$$;

-- Admin-only full report reader with PII (bypasses column-level SELECT restrictions)
CREATE OR REPLACE FUNCTION public.admin_list_reports(_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, type text, phone text, upi_id text, link text,
  city text, state text, description text, amount_lost int,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT r.id, r.type, r.phone, r.upi_id, r.link, r.city, r.state,
         r.description, r.amount_lost, r.created_at
  FROM public.scam_reports r
  ORDER BY r.created_at DESC
  LIMIT COALESCE(_limit, 100);
END;
$$;
