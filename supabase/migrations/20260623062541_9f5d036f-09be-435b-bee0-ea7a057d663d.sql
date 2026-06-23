
-- 1) scam_reports: require auth for INSERT
DROP POLICY IF EXISTS "Anyone can insert scam_reports" ON public.scam_reports;
CREATE POLICY "Authenticated can insert scam_reports"
  ON public.scam_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2) phone_blacklist & upi_blacklist: require auth for INSERT
DROP POLICY IF EXISTS "Anyone can insert phone_blacklist" ON public.phone_blacklist;
CREATE POLICY "Authenticated can insert phone_blacklist"
  ON public.phone_blacklist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert upi_blacklist" ON public.upi_blacklist;
CREATE POLICY "Authenticated can insert upi_blacklist"
  ON public.upi_blacklist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3) user_scans: add user_id and restrict SELECT/INSERT to owner
ALTER TABLE public.user_scans
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Anyone can read user_scans" ON public.user_scans;
DROP POLICY IF EXISTS "Anyone can insert user_scans" ON public.user_scans;

CREATE POLICY "Users read their own scans"
  ON public.user_scans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own scans"
  ON public.user_scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

REVOKE SELECT, INSERT ON public.user_scans FROM anon;
GRANT SELECT, INSERT ON public.user_scans TO authenticated;

-- 4) Storage: scam-screenshots bucket. Require auth, enforce path ownership: <uid>/...
DROP POLICY IF EXISTS "Public upload scam-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public read scam-screenshots" ON storage.objects;

CREATE POLICY "Users upload to own folder in scam-screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scam-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own files in scam-screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'scam-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5) realtime.messages: enable RLS and scope by authenticated user's own topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive own topic" ON realtime.messages;
CREATE POLICY "Authenticated can receive own topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    (SELECT realtime.topic()) IS NOT NULL
    AND (
      (SELECT realtime.topic()) LIKE 'public:%'
      OR (SELECT realtime.topic()) = ('user:' || auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Authenticated can broadcast own topic" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast own topic"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT realtime.topic()) = ('user:' || auth.uid()::text)
  );
