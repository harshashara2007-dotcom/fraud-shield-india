CREATE TABLE public.safe_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  category text NOT NULL,
  helpline_number text NOT NULL,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_numbers TO authenticated;
GRANT SELECT ON public.safe_numbers TO anon;
GRANT ALL ON public.safe_numbers TO service_role;
ALTER TABLE public.safe_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read safe_numbers" ON public.safe_numbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert safe_numbers" ON public.safe_numbers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.safe_sender_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL UNIQUE,
  company_name text NOT NULL,
  is_official boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_sender_ids TO authenticated;
GRANT SELECT ON public.safe_sender_ids TO anon;
GRANT ALL ON public.safe_sender_ids TO service_role;
ALTER TABLE public.safe_sender_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read safe_sender_ids" ON public.safe_sender_ids FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert safe_sender_ids" ON public.safe_sender_ids FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO public.safe_numbers (company_name, category, helpline_number) VALUES
('SBI','Banks','18001122211'),('HDFC Bank','Banks','18002026161'),('ICICI Bank','Banks','18002003344'),
('Axis Bank','Banks','18002095577'),('Kotak Bank','Banks','18002266022'),('PNB','Banks','18001802222'),
('Bank of India','Banks','1800220229'),('Canara Bank','Banks','18004250018'),
('Paytm','Shopping','01204456456'),('PhonePe','Shopping','08068727374'),('Google Pay','Shopping','18004190157'),
('Amazon','Shopping','18003009009'),('Flipkart','Shopping','18002029898'),
('IRCTC','Transport','14646'),('Indian Railway','Transport','139'),
('Police','Emergency','100'),('Ambulance','Emergency','108'),('Fire','Emergency','101'),('Cyber Crime','Emergency','1930'),
('Jio','Telecom','1991'),('Airtel','Telecom','121'),('Vi','Telecom','199'),('BSNL','Telecom','1503'),
('UIDAI (Aadhaar)','Government','1947'),('Income Tax','Government','18001030025'),('EPFO','Government','18001181995'),
('Zomato','Food','08047181818'),('Swiggy','Food','08067466729'),
('Apollo','Health','18605000101'),('Practo','Health','08049266666'),('1mg','Health','09999090020');

INSERT INTO public.safe_sender_ids (sender_id, company_name) VALUES
('VM-SBIBNK','SBI Bank'),('VM-HDFCBK','HDFC Bank'),('VM-ICICIB','ICICI Bank'),('VM-PAYTMB','Paytm'),
('DM-AMAZON','Amazon'),('VM-ZOMATO','Zomato'),('VM-SWIGGY','Swiggy'),('VK-IRCTCB','IRCTC'),
('VM-JIOIND','Jio'),('DM-AIRTEL','Airtel'),('AM-BSNL','BSNL'),('JD-NSDL','NSDL'),
('VM-UIDAI','UIDAI/Aadhaar'),('DM-EPFINR','EPFO'),('VM-INCOTX','Income Tax');