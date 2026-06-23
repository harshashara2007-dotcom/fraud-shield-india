
-- scam_reports
DROP POLICY IF EXISTS "Authenticated can insert scam_reports" ON public.scam_reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.scam_reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON public.scam_reports;
DROP POLICY IF EXISTS "Anyone can read scam_reports" ON public.scam_reports;
CREATE POLICY "Anyone can read reports" ON public.scam_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert reports" ON public.scam_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT SELECT, INSERT ON public.scam_reports TO anon;
GRANT SELECT, INSERT ON public.scam_reports TO authenticated;

-- phone_blacklist
DROP POLICY IF EXISTS "Authenticated can insert phone_blacklist" ON public.phone_blacklist;
DROP POLICY IF EXISTS "Anyone can insert phone_blacklist" ON public.phone_blacklist;
DROP POLICY IF EXISTS "Anyone can read phone_blacklist" ON public.phone_blacklist;
CREATE POLICY "Anyone can read phone_blacklist" ON public.phone_blacklist FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert phone_blacklist" ON public.phone_blacklist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update phone_blacklist" ON public.phone_blacklist FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON public.phone_blacklist TO anon;
GRANT SELECT, INSERT, UPDATE ON public.phone_blacklist TO authenticated;

-- upi_blacklist
DROP POLICY IF EXISTS "Authenticated can insert upi_blacklist" ON public.upi_blacklist;
DROP POLICY IF EXISTS "Anyone can insert upi_blacklist" ON public.upi_blacklist;
DROP POLICY IF EXISTS "Anyone can read upi_blacklist" ON public.upi_blacklist;
CREATE POLICY "Anyone can read upi_blacklist" ON public.upi_blacklist FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert upi_blacklist" ON public.upi_blacklist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update upi_blacklist" ON public.upi_blacklist FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON public.upi_blacklist TO anon;
GRANT SELECT, INSERT, UPDATE ON public.upi_blacklist TO authenticated;

-- Realtime
ALTER TABLE public.scam_reports REPLICA IDENTITY FULL;
ALTER TABLE public.phone_blacklist REPLICA IDENTITY FULL;
ALTER TABLE public.upi_blacklist REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scam_reports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_blacklist; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_blacklist; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
