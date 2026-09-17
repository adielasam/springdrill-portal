
INSERT INTO storage.buckets (id, name, public)
VALUES ('passports', 'passports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'passports');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'passports' AND auth.role() = 'authenticated');
