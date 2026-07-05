-- Enable realtime for scam_reports so new inserts appear live on the map
ALTER TABLE public.scam_reports REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='scam_reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.scam_reports';
  END IF;
END $$;

-- API keys issued to buyers after payment
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

GRANT SELECT, INSERT ON public.api_keys TO authenticated;
GRANT SELECT, INSERT ON public.api_keys TO anon;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Anyone (buyer) can insert their own purchase request
CREATE POLICY "Anyone can request an API key"
ON public.api_keys FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all keys
CREATE POLICY "Admins can view all api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update (activate/revoke)
CREATE POLICY "Admins can update api keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));