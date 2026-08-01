import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ScanRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger: string;
  status: string;
  findings_count: number;
  critical_count: number;
  error: string | null;
};

export type Finding = {
  id: string;
  run_id: string;
  code: string;
  severity: string;
  title: string;
  detail: string | null;
  resource: string;
  remediation: string | null;
  created_at: string;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const listScanRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScanRun[]> => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("security_scan_runs")
      .select("id, started_at, finished_at, trigger, status, findings_count, critical_count, error")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as ScanRun[];
  });

export const listRunFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => d)
  .handler(async ({ data, context }): Promise<Finding[]> => {
    await assertAdmin(context as never);
    const { data: rows, error } = await context.supabase
      .from("security_findings")
      .select("id, run_id, code, severity, title, detail, resource, remediation, created_at")
      .eq("run_id", data.runId)
      .order("severity")
      .order("resource");
    if (error) throw error;
    return (rows ?? []) as Finding[];
  });

export const runScanNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ runId: string; findings: number; critical: number }> => {
    await assertAdmin(context as never);
    const { runSecurityScan } = await import("@/lib/security-scan.server");
    return runSecurityScan("manual");
  });
