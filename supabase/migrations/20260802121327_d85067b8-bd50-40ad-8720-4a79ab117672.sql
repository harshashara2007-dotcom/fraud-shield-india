-- 1. Remove always-true write policies -------------------------------------
DROP POLICY IF EXISTS "Anyone can insert phone_blacklist" ON public.phone_blacklist;
DROP POLICY IF EXISTS "Anyone can insert upi_blacklist" ON public.upi_blacklist;
DROP POLICY IF EXISTS "Anyone can insert deepfakes" ON public.deepfakes;
DROP POLICY IF EXISTS "Anyone can request an API key" ON public.api_keys;

REVOKE INSERT ON public.phone_blacklist FROM anon, authenticated;
REVOKE INSERT ON public.upi_blacklist FROM anon, authenticated;
REVOKE INSERT ON public.api_keys FROM anon, authenticated;

CREATE POLICY "Signed-in users log deepfake scans"
ON public.deepfakes FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. API keys: server-side generation, key hidden until activated ----------
REVOKE SELECT ON public.api_keys FROM anon, authenticated;
GRANT SELECT (id, user_id, email, plan, status, created_at, activated_at)
  ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

CREATE OR REPLACE FUNCTION public.request_api_key(_plan text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _email text; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _plan IS NULL OR length(btrim(_plan)) = 0 OR length(_plan) > 60 THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;
  IF EXISTS (SELECT 1 FROM public.banned_users b WHERE b.user_id = _uid) THEN
    RAISE EXCEPTION 'account_blocked';
  END IF;
  IF (SELECT count(*) FROM public.api_keys k
        WHERE k.user_id = _uid AND k.created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  INSERT INTO public.api_keys(user_id, email, api_key, plan, status)
  VALUES (_uid, _email, 'ss_live_' || encode(gen_random_bytes(24), 'hex'),
          btrim(_plan), 'pending_verification')
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Owner may read their key only after an admin activates it
CREATE OR REPLACE FUNCTION public.my_api_keys()
RETURNS TABLE(id uuid, plan text, status text, api_key text,
              created_at timestamptz, activated_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT k.id, k.plan, k.status,
         CASE WHEN k.status = 'active' THEN k.api_key ELSE NULL END,
         k.created_at, k.activated_at
  FROM public.api_keys k
  WHERE auth.uid() IS NOT NULL AND k.user_id = auth.uid()
  ORDER BY k.created_at DESC;
$$;

-- 3. Guard privileged helpers against anonymous callers --------------------
CREATE OR REPLACE FUNCTION public.increment_phone_report(_number text, _scam_type text DEFAULT NULL::text, _operator text DEFAULT NULL::text, _location text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _number IS NULL OR length(_number) < 5 THEN RETURN; END IF;
  UPDATE public.phone_blacklist
     SET reports = COALESCE(reports, 0) + 1,
         last_reported = now(),
         scam_type = COALESCE(scam_type, _scam_type),
         operator = COALESCE(operator, _operator),
         location = COALESCE(location, _location)
   WHERE number = _number;
  IF NOT FOUND THEN
    INSERT INTO public.phone_blacklist(number, scam_type, operator, location)
    VALUES (_number, _scam_type, _operator, _location);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_upi_report(_upi_id text, _scam_type text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _upi_id IS NULL OR length(_upi_id) < 3 THEN RETURN; END IF;
  UPDATE public.upi_blacklist
     SET reports = COALESCE(reports, 0) + 1,
         last_reported = now(),
         scam_type = COALESCE(scam_type, _scam_type)
   WHERE upi_id = _upi_id;
  IF NOT FOUND THEN
    INSERT INTO public.upi_blacklist(upi_id, scam_type)
    VALUES (_upi_id, _scam_type);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_reports_by_phone(_phone text, _limit integer DEFAULT 5)
RETURNS TABLE(description text, created_at timestamptz, type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.description, r.created_at, r.type
    FROM public.scam_reports r
   WHERE auth.uid() IS NOT NULL
     AND r.phone = _phone
     AND r.status = 'approved'
   ORDER BY r.created_at DESC
   LIMIT COALESCE(_limit, 5);
$$;

-- 4. Lock down EXECUTE on every SECURITY DEFINER function ------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, app_role),
  public.is_banned(uuid),
  public.use_credits(integer, text),
  public.get_or_init_credits(),
  public.get_reports_by_phone(text, integer),
  public.increment_phone_report(text, text, text, text),
  public.increment_upi_report(text, text),
  public.submit_scam_report(text, text, text, text, double precision, double precision, text, text, text, text, integer, text, text, text),
  public.request_api_key(text),
  public.my_api_keys(),
  public.get_admin_stats(),
  public.admin_list_reports(integer, text),
  public.admin_list_api_keys(integer),
  public.admin_list_users(integer),
  public.admin_list_audit(integer),
  public.admin_moderate_report(uuid, text, text),
  public.admin_delete_report(uuid),
  public.admin_promote_by_email(text),
  public.admin_demote(uuid),
  public.admin_ban_by_email(text, text),
  public.admin_unban(uuid)
TO authenticated;