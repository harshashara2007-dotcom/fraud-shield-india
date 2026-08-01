-- 1. Lock down add_credits
REVOKE EXECUTE ON FUNCTION public.add_credits(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(integer, text) TO service_role;

-- 2. Let API key owners read their own row
CREATE POLICY "Users can view their own api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Non-PII realtime feed table
CREATE TABLE public.scam_report_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid,
  type text NOT NULL,
  city text,
  state text,
  lat double precision,
  lng double precision,
  amount_lost integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.scam_report_events TO anon, authenticated;
GRANT ALL ON public.scam_report_events TO service_role;

ALTER TABLE public.scam_report_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scam report events"
  ON public.scam_report_events FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.emit_scam_report_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scam_report_events(report_id, type, city, state, lat, lng, amount_lost, created_at)
  VALUES (NEW.id, NEW.type, NEW.city, NEW.state, NEW.lat, NEW.lng, COALESCE(NEW.amount_lost, 0), COALESCE(NEW.created_at, now()));
  RETURN NEW;
END; $$;

CREATE TRIGGER scam_reports_emit_event
AFTER INSERT ON public.scam_reports
FOR EACH ROW EXECUTE FUNCTION public.emit_scam_report_event();

-- 4. Realtime: drop PII table, publish the safe events table
ALTER TABLE public.scam_reports REPLICA IDENTITY DEFAULT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scam_reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.scam_reports';
  END IF;
END $$;

ALTER TABLE public.scam_report_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scam_report_events;

-- backfill so the feed has history
INSERT INTO public.scam_report_events(report_id, type, city, state, lat, lng, amount_lost, created_at)
SELECT id, type, city, state, lat, lng, COALESCE(amount_lost, 0), COALESCE(created_at, now())
FROM public.scam_reports;