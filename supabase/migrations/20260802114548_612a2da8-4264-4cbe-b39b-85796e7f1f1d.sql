CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  show_developer1 boolean NOT NULL DEFAULT true,
  developer1_name text NOT NULL DEFAULT 'Stradigtech',
  developer1_url text NOT NULL DEFAULT 'https://stradigtech.com/',
  show_developer2 boolean NOT NULL DEFAULT false,
  developer2_name text NOT NULL DEFAULT '',
  developer2_url text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (id) VALUES (1);