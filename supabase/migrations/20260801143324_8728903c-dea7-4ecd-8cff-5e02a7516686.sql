CREATE POLICY "teachers read own course media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "teachers upload own course media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "teachers update own course media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (bucket_id = 'course-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "teachers delete own course media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "admins read course media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'::app_role));