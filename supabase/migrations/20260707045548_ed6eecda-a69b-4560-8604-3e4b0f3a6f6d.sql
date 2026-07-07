
-- Banned users list
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text,
  banned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_users TO authenticated;
GRANT ALL ON public.banned_users TO service_role;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage banned_users" ON public.banned_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can see own ban" ON public.banned_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update/delete blacklist entries
CREATE POLICY "Admins update phone_blacklist" ON public.phone_blacklist
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update upi_blacklist" ON public.upi_blacklist
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Promote a user to admin by email
CREATE OR REPLACE FUNCTION public.admin_promote_by_email(_email text)
RETURNS TABLE(user_id uuid, email text, role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(auth.users.email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT _uid, _email, 'admin'::app_role;
END;
$$;

-- Demote admin
CREATE OR REPLACE FUNCTION public.admin_demote(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot demote yourself';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
END;
$$;

-- Ban / unban
CREATE OR REPLACE FUNCTION public.admin_ban_by_email(_email text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(auth.users.email) = lower(_email) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  INSERT INTO public.banned_users(user_id, email, reason, banned_by)
  VALUES (_uid, _email, _reason, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.banned_users WHERE user_id = _user_id;
END;
$$;

-- Admin listings
CREATE OR REPLACE FUNCTION public.admin_list_users(_limit int DEFAULT 200)
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, is_banned boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at,
         EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
         EXISTS(SELECT 1 FROM public.banned_users b WHERE b.user_id = u.id)
  FROM auth.users u
  ORDER BY u.created_at DESC
  LIMIT COALESCE(_limit, 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_api_keys(_limit int DEFAULT 200)
RETURNS TABLE(id uuid, email text, plan text, status text, api_key text, created_at timestamptz, activated_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT k.id, k.email, k.plan, k.status, k.api_key, k.created_at, k.activated_at
  FROM public.api_keys k
  ORDER BY k.created_at DESC
  LIMIT COALESCE(_limit, 200);
END;
$$;

-- Check if the current user is banned (used at sign-in)
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.banned_users WHERE user_id = _user_id)
$$;
