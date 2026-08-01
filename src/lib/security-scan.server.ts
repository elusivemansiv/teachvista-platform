import { createClient } from "@supabase/supabase-js";

export type ScanFinding = {
  code: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string | null;
  resource: string;
  remediation: string | null;
};

export type ScanResult = { runId: string; findings: number; critical: number };

function adminClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Runs the database security checks and persists a scan run + its findings. */
export async function runSecurityScan(trigger: "scheduled" | "manual"): Promise<ScanResult> {
  const sb = adminClient();

  const { data: run, error: runErr } = await sb
    .from("security_scan_runs")
    .insert({ trigger, status: "running" })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = run!.id as string;

  try {
    const { data, error } = await sb.rpc("run_security_checks");
    if (error) throw error;
    const findings = ((data ?? []) as ScanFinding[]).map((f) => ({ ...f, run_id: runId }));

    if (findings.length) {
      const { error: insErr } = await sb.from("security_findings").insert(findings);
      if (insErr) throw insErr;
    }

    const critical = findings.filter((f) => f.severity === "critical").length;
    await sb
      .from("security_scan_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        findings_count: findings.length,
        critical_count: critical,
      })
      .eq("id", runId);

    if (findings.length) await notifyAdmins(sb, findings.length, critical);

    return { runId, findings: findings.length, critical };
  } catch (e) {
    await sb
      .from("security_scan_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: (e as Error).message })
      .eq("id", runId);
    throw e;
  }
}

async function notifyAdmins(sb: ReturnType<typeof adminClient>, total: number, critical: number) {
  const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins?.length) return;
  await sb.from("notifications").insert(
    admins.map((a: { user_id: string }) => ({
      user_id: a.user_id,
      type: "security_scan",
      title: critical ? `Security scan: ${critical} critical issue${critical === 1 ? "" : "s"}` : "Security scan completed",
      body: `${total} finding${total === 1 ? "" : "s"} detected in the latest automated scan.`,
      link: "/admin-security",
    })),
  );
}
