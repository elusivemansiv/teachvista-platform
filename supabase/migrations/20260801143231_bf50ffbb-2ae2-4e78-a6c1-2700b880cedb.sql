CREATE TABLE public.security_scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'scheduled',
  status text NOT NULL DEFAULT 'running',
  findings_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_scan_runs TO authenticated;
GRANT ALL ON public.security_scan_runs TO service_role;
ALTER TABLE public.security_scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read scan runs" ON public.security_scan_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.security_scan_runs(id) ON DELETE CASCADE,
  code text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  detail text,
  resource text NOT NULL,
  remediation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX security_findings_run_idx ON public.security_findings(run_id);
GRANT SELECT ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read findings" ON public.security_findings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.run_security_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    result := result || jsonb_build_object(
      'code','rls_disabled','severity','critical',
      'title','Row level security disabled',
      'detail','This table is reachable through the data API without any access rules.',
      'resource','public.' || r.name,
      'remediation','Enable row level security and add policies for this table.');
  END LOOP;

  FOR r IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
  LOOP
    result := result || jsonb_build_object(
      'code','rls_no_policies','severity','warning',
      'title','No access policies defined',
      'detail','Access rules are enabled but no policy exists, so all app access is blocked.',
      'resource','public.' || r.name,
      'remediation','Add at least one policy or confirm the table is intentionally locked.');
  END LOOP;

  FOR r IN
    SELECT n.nspname || '.' || p.proname AS name
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  LOOP
    result := result || jsonb_build_object(
      'code','definer_function_exposed','severity','critical',
      'title','Elevated-privilege routine callable by users',
      'detail','This routine runs with owner privileges and can be called directly by visitors or signed-in users.',
      'resource', r.name,
      'remediation','Revoke execute from anon and authenticated, or convert the routine to run as the caller.');
  END LOOP;

  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (pg_get_expr(p.polqual, p.polrelid) = 'true' OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true')
  LOOP
    result := result || jsonb_build_object(
      'code','policy_always_true','severity','warning',
      'title','Unrestricted access policy',
      'detail','Policy "' || r.pol || '" always evaluates to true.',
      'resource','public.' || r.tbl,
      'remediation','Scope the policy to the signed-in user or a role check unless the data is intentionally public.');
  END LOOP;

  FOR r IN SELECT b.id AS name FROM storage.buckets b WHERE b.public
  LOOP
    result := result || jsonb_build_object(
      'code','public_storage_bucket','severity','warning',
      'title','Public storage bucket',
      'detail','Every file in this bucket is downloadable by anyone with the URL.',
      'resource','storage:' || r.name,
      'remediation','Make the bucket private and serve files through signed URLs if the content is not meant to be public.');
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.run_security_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_security_checks() TO service_role;