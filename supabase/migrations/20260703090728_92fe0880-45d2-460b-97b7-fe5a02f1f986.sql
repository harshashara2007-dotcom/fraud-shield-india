
-- 1. Remove open UPDATE policies on blacklists
DROP POLICY IF EXISTS "Anyone can update phone_blacklist" ON public.phone_blacklist;
DROP POLICY IF EXISTS "Anyone can update upi_blacklist" ON public.upi_blacklist;

-- Security-definer RPCs to safely increment / upsert blacklist entries
CREATE OR REPLACE FUNCTION public.increment_phone_report(_number text, _scam_type text DEFAULT NULL, _operator text DEFAULT NULL, _location text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_upi_report(_upi_id text, _scam_type text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_phone_report(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_upi_report(text, text) TO anon, authenticated;

-- 2. Remove open INSERT policies on trusted reference tables
DROP POLICY IF EXISTS "Anyone can insert safe_numbers" ON public.safe_numbers;
DROP POLICY IF EXISTS "Anyone can insert safe_sender_ids" ON public.safe_sender_ids;
-- (No replacement policy: inserts now only possible via service_role / migrations.)

-- 3. Hide PII columns on scam_reports from anon/authenticated reads
REVOKE SELECT ON public.scam_reports FROM anon, authenticated;
GRANT SELECT (id, type, city, state, description, lat, lng, amount_lost, votes, created_at)
  ON public.scam_reports TO anon, authenticated;
-- Preserve INSERT ability (INSERT policy already covers writes)
GRANT INSERT ON public.scam_reports TO anon, authenticated;

-- Safe lookup for phone-based queries (returns non-PII columns)
CREATE OR REPLACE FUNCTION public.get_reports_by_phone(_phone text, _limit int DEFAULT 5)
RETURNS TABLE(description text, created_at timestamptz, type text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT description, created_at, type
    FROM public.scam_reports
   WHERE phone = _phone
   ORDER BY created_at DESC
   LIMIT COALESCE(_limit, 5);
$$;
GRANT EXECUTE ON FUNCTION public.get_reports_by_phone(text, int) TO anon, authenticated;

-- 4. Remove user_scans from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_scans;
