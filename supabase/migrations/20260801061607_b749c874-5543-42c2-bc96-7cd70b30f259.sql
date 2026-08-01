-- 1. Columns
ALTER TABLE public.scam_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reporter_id uuid,
  ADD COLUMN IF NOT EXISTS reporter_contact text,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.scam_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

ALTER TABLE public.scam_reports
  ADD CONSTRAINT scam_reports_status_check CHECK (status IN ('pending','approved','rejected'));

ALTER TABLE public.scam_reports
  ADD CONSTRAINT scam_reports_amount_check CHECK (amount_lost IS NULL OR amount_lost >= 0);

-- Existing (seed) reports stay visible
UPDATE public.scam_reports SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS scam_reports_status_idx ON public.scam_reports(status);
CREATE INDEX IF NOT EXISTS scam_reports_reporter_idx ON public.scam_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scam_reports_dedupe_idx ON public.scam_reports(dedupe_key, created_at DESC);

-- 2. Grants: expose only safe columns publicly, and stop direct inserts
GRANT SELECT (status, report_count) ON public.scam_reports TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.scam_reports FROM anon;
REVOKE INSERT, UPDATE ON public.scam_reports FROM authenticated;
GRANT ALL ON public.scam_reports TO service_role;

-- 3. RLS policies
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.scam_reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON public.scam_reports;
DROP POLICY IF EXISTS "Admins read all scam_reports" ON public.scam_reports;

CREATE POLICY "Public reads approved reports"
  ON public.scam_reports FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND duplicate_of IS NULL);

CREATE POLICY "Reporters read own reports"
  ON public.scam_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins read all scam_reports"
  ON public.scam_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update scam_reports"
  ON public.scam_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Live alerts only for approved reports
DROP TRIGGER IF EXISTS scam_report_event_trigger ON public.scam_reports;

CREATE OR REPLACE FUNCTION public.emit_scam_report_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'approved' OR NEW.duplicate_of IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.scam_report_events(report_id, type, city, state, lat, lng, amount_lost, created_at)
  VALUES (NEW.id, NEW.type, NEW.city, NEW.state, NEW.lat, NEW.lng, COALESCE(NEW.amount_lost, 0), now());
  RETURN NEW;
END; $$;

CREATE TRIGGER scam_report_event_trigger
AFTER INSERT OR UPDATE OF status ON public.scam_reports
FOR EACH ROW EXECUTE FUNCTION public.emit_scam_report_event();

-- 5. Validated, rate-limited, de-duplicating submission
CREATE OR REPLACE FUNCTION public.submit_scam_report(
  _type text,
  _description text,
  _city text,
  _state text,
  _lat double precision,
  _lng double precision,
  _link text DEFAULT NULL,
  _bank text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _upi_id text DEFAULT NULL,
  _amount_lost integer DEFAULT 0,
  _screenshot_url text DEFAULT NULL,
  _fingerprint_hash text DEFAULT NULL,
  _ip_hash text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, flagged boolean, duplicate boolean, report_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _u record;
  _contact text;
  _recent integer;
  _key text;
  _dup public.scam_reports;
  _flag boolean := false;
  _reason text := NULL;
  _amount integer := COALESCE(_amount_lost, 0);
  _row public.scam_reports;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT email, phone, email_confirmed_at, phone_confirmed_at
    INTO _u FROM auth.users WHERE auth.users.id = _uid;
  IF _u.email_confirmed_at IS NULL AND _u.phone_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'verification_required';
  END IF;
  _contact := COALESCE(_u.phone, _u.email);

  IF EXISTS (SELECT 1 FROM public.banned_users b WHERE b.user_id = _uid) THEN
    RAISE EXCEPTION 'account_blocked';
  END IF;

  -- validation
  IF _type IS NULL OR length(btrim(_type)) = 0 THEN RAISE EXCEPTION 'type_required'; END IF;
  IF _description IS NULL OR length(btrim(_description)) < 20 THEN RAISE EXCEPTION 'description_too_short'; END IF;
  IF (_link IS NULL OR length(btrim(_link)) = 0) AND (_bank IS NULL OR length(btrim(_bank)) = 0) THEN
    RAISE EXCEPTION 'link_or_bank_required';
  END IF;
  IF _link IS NOT NULL AND length(btrim(_link)) > 0
     AND btrim(_link) !~* '^https?://[a-z0-9][a-z0-9._-]*\.[a-z]{2,}(:[0-9]+)?(/[^\s]*)?$' THEN
    RAISE EXCEPTION 'invalid_link';
  END IF;
  IF _amount < 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _amount > 1000000000 THEN RAISE EXCEPTION 'amount_too_large'; END IF;
  IF _amount > 10000000 THEN
    _flag := true;
    _reason := 'amount over Rs 1 crore — needs manual verification';
  END IF;

  -- rate limit: 5 per 24h per user (or per device fingerprint)
  SELECT count(*) INTO _recent FROM public.scam_reports r
   WHERE r.created_at > now() - interval '24 hours'
     AND (r.reporter_id = _uid
          OR (_fingerprint_hash IS NOT NULL AND r.fingerprint_hash = _fingerprint_hash));
  IF _recent >= 5 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  -- duplicate grouping
  _key := md5(lower(btrim(coalesce(_link,'') || '|' || coalesce(_bank,'') || '|' || coalesce(_description,''))));
  SELECT * INTO _dup FROM public.scam_reports r
   WHERE r.dedupe_key = _key
     AND r.duplicate_of IS NULL
     AND r.created_at > now() - interval '24 hours'
   ORDER BY r.created_at DESC LIMIT 1;

  IF _dup.id IS NOT NULL THEN
    UPDATE public.scam_reports
       SET report_count = report_count + 1
     WHERE public.scam_reports.id = _dup.id
     RETURNING * INTO _row;
    RETURN QUERY SELECT _row.id, _row.status, _row.flagged, true, _row.report_count;
    RETURN;
  END IF;

  INSERT INTO public.scam_reports(
    type, phone, upi_id, link, bank, city, state, lat, lng, description,
    screenshot_url, amount_lost, status, flagged, review_reason,
    reporter_id, reporter_contact, fingerprint_hash, ip_hash, dedupe_key)
  VALUES (
    _type, _phone, _upi_id, nullif(btrim(coalesce(_link,'')),''), nullif(btrim(coalesce(_bank,'')),''),
    _city, _state, _lat, _lng, btrim(_description),
    _screenshot_url, _amount, 'pending', _flag, _reason,
    _uid, _contact, _fingerprint_hash, _ip_hash, _key)
  RETURNING * INTO _row;

  RETURN QUERY SELECT _row.id, _row.status, _row.flagged, false, _row.report_count;
END; $$;

REVOKE ALL ON FUNCTION public.submit_scam_report(text,text,text,text,double precision,double precision,text,text,text,text,integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_scam_report(text,text,text,text,double precision,double precision,text,text,text,text,integer,text,text,text) TO authenticated, service_role;

-- 6. Admin moderation
DROP FUNCTION IF EXISTS public.admin_list_reports(integer);
CREATE OR REPLACE FUNCTION public.admin_list_reports(_limit integer DEFAULT 100, _status text DEFAULT NULL)
RETURNS TABLE(id uuid, type text, phone text, upi_id text, link text, bank text, city text, state text,
  description text, amount_lost integer, status text, flagged boolean, report_count integer,
  review_reason text, reporter_contact text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT r.id, r.type, r.phone, r.upi_id, r.link, r.bank, r.city, r.state,
         r.description, r.amount_lost, r.status, r.flagged, r.report_count,
         r.review_reason, r.reporter_contact, r.created_at
  FROM public.scam_reports r
  WHERE _status IS NULL OR r.status = _status
  ORDER BY (r.status = 'pending') DESC, r.flagged DESC, r.created_at DESC
  LIMIT COALESCE(_limit, 100);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_moderate_report(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE public.scam_reports
     SET status = _status,
         flagged = CASE WHEN _status = 'approved' THEN false ELSE flagged END,
         review_reason = COALESCE(_note, review_reason),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = _id;
  PERFORM public.log_admin_action('moderate_report', _id::text, jsonb_build_object('status', _status, 'note', _note));
END; $$;

DROP FUNCTION IF EXISTS public.get_admin_stats();
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(total_reports bigint, total_deepfakes bigint, total_phone_blacklist bigint,
  total_upi_blacklist bigint, total_users bigint, reports_24h bigint,
  pending_reports bigint, flagged_reports bigint, approved_reports bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.scam_reports),
    (SELECT count(*) FROM public.deepfakes),
    (SELECT count(*) FROM public.phone_blacklist),
    (SELECT count(*) FROM public.upi_blacklist),
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM public.scam_reports WHERE created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM public.scam_reports WHERE status = 'pending'),
    (SELECT count(*) FROM public.scam_reports WHERE flagged),
    (SELECT count(*) FROM public.scam_reports WHERE status = 'approved');
END; $$;
