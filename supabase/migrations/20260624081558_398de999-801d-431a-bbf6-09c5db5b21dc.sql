CREATE TABLE public.deepfakes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_type text NOT NULL,
  verdict text NOT NULL,
  confidence integer NOT NULL DEFAULT 0,
  city text,
  report_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.deepfakes TO anon, authenticated;
GRANT ALL ON public.deepfakes TO service_role;

ALTER TABLE public.deepfakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read deepfakes" ON public.deepfakes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert deepfakes" ON public.deepfakes FOR INSERT TO anon, authenticated WITH CHECK (true);