
-- bucket created via storage_create_bucket tool below; this migration just sets RLS
CREATE POLICY "Public read scam-screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'scam-screenshots');
CREATE POLICY "Public upload scam-screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'scam-screenshots');
