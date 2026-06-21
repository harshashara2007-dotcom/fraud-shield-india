
CREATE TABLE public.scam_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  phone text,
  upi_id text,
  link text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  description text,
  screenshot_url text,
  amount_lost integer DEFAULT 0,
  votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.scam_reports TO anon, authenticated;
GRANT ALL ON public.scam_reports TO service_role;
ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scam_reports" ON public.scam_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scam_reports" ON public.scam_reports FOR INSERT WITH CHECK (true);

CREATE TABLE public.upi_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text UNIQUE NOT NULL,
  reports integer DEFAULT 1,
  scam_type text,
  last_reported timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.upi_blacklist TO anon, authenticated;
GRANT ALL ON public.upi_blacklist TO service_role;
ALTER TABLE public.upi_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read upi_blacklist" ON public.upi_blacklist FOR SELECT USING (true);
CREATE POLICY "Anyone can insert upi_blacklist" ON public.upi_blacklist FOR INSERT WITH CHECK (true);

CREATE TABLE public.phone_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  scam_type text,
  reports integer DEFAULT 1,
  operator text,
  location text,
  last_reported timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.phone_blacklist TO anon, authenticated;
GRANT ALL ON public.phone_blacklist TO service_role;
ALTER TABLE public.phone_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read phone_blacklist" ON public.phone_blacklist FOR SELECT USING (true);
CREATE POLICY "Anyone can insert phone_blacklist" ON public.phone_blacklist FOR INSERT WITH CHECK (true);

CREATE TABLE public.user_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text,
  input_data text,
  verdict text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_scans TO anon, authenticated;
GRANT ALL ON public.user_scans TO service_role;
ALTER TABLE public.user_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read user_scans" ON public.user_scans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_scans" ON public.user_scans FOR INSERT WITH CHECK (true);

ALTER TABLE public.scam_reports REPLICA IDENTITY FULL;
ALTER TABLE public.upi_blacklist REPLICA IDENTITY FULL;
ALTER TABLE public.phone_blacklist REPLICA IDENTITY FULL;
ALTER TABLE public.user_scans REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.scam_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_blacklist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_blacklist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_scans;
