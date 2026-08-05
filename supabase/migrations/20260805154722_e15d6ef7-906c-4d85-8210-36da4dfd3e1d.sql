select cron.alter_job(
  1,
  command := $cmd$
  select extensions.http_post(
    url:='https://project--ae88b130-bacf-4bff-881a-4c030342f0b9-dev.lovable.app/api/public/hooks/security-scan',
    headers:='{"Content-Type": "application/json", "x-cron-secret": "a62ca198b22912c3b659322f3f098551d9b73b83d49a31ab"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $cmd$
);