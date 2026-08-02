ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS show_developed_by boolean NOT NULL DEFAULT true;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;