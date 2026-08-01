import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { listRunFindings, listScanRuns, runScanNow } from "@/lib/security.functions";
import { toast } from "sonner";
import { ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-security")({
  beforeLoad: ({ context }) => {
    if ((context as { role?: string }).role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Security findings — BandPath admin" },
      {
        name: "description",
        content: "Review automated security scan runs, timestamps and affected resources across the BandPath platform.",
      },
      { property: "og:title", content: "Security findings — BandPath admin" },
      { property: "og:description", content: "Scheduled security scans, findings and affected resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <SecurityDashboard />
    </AppShell>
  ),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-destructive">{error.message}</div>,
});

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "critical"
      ? "bg-destructive/10 text-destructive"
      : severity === "warning"
        ? "bg-accent/20 text-accent-foreground"
        : "bg-secondary text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>{severity}</span>;
}

function SecurityDashboard() {
  const queryClient = useQueryClient();
  const fetchRuns = useServerFn(listScanRuns);
  const fetchFindings = useServerFn(listRunFindings);
  const scanNow = useServerFn(runScanNow);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({ queryKey: ["security", "runs"], queryFn: () => fetchRuns() });
  const activeRun = selected ?? runs[0]?.id ?? null;

  const { data: findings = [] } = useQuery({
    queryKey: ["security", "findings", activeRun],
    queryFn: () => fetchFindings({ data: { runId: activeRun! } }),
    enabled: !!activeRun,
  });

  const scan = useMutation({
    mutationFn: () => scanNow(),
    onSuccess: (r) => {
      toast.success(`Scan complete — ${r.findings} finding${r.findings === 1 ? "" : "s"}, ${r.critical} critical.`);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["security"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Admin
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Security findings</h1>
          <p className="mt-1 text-muted-foreground">
            Scans run automatically every night and log every issue with a timestamp and the affected resource.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => scan.mutate()} disabled={scan.isPending}>
          <RefreshCw className={`h-4 w-4 ${scan.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {scan.isPending ? "Scanning…" : "Run scan now"}
        </Button>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Scan runs</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading scan history…</p>
        ) : runs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No scans yet — run one now to create the first record.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r.id)}
                  aria-current={activeRun === r.id}
                  className={`flex w-full flex-wrap items-center gap-3 p-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeRun === r.id ? "bg-accent/20" : "hover:bg-secondary/60"
                  }`}
                >
                  {r.critical_count > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                  ) : r.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {new Date(r.started_at).toLocaleString()}{" "}
                      <span className="font-normal capitalize text-muted-foreground">· {r.trigger}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "failed"
                        ? `Failed: ${r.error ?? "unknown error"}`
                        : `${r.findings_count} finding${r.findings_count === 1 ? "" : "s"} · ${r.critical_count} critical${
                            r.finished_at ? ` · finished ${new Date(r.finished_at).toLocaleTimeString()}` : ""
                          }`}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeRun && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Findings in this run</h2>
          {findings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No findings recorded for this scan — everything passed.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {findings.map((f) => (
                <li key={f.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-semibold">{f.title}</span>
                    <code className="rounded-full bg-secondary px-2 py-0.5 text-xs">{f.resource}</code>
                  </div>
                  {f.detail && <p className="mt-2 text-sm text-muted-foreground">{f.detail}</p>}
                  {f.remediation && <p className="mt-1 text-sm">Fix: {f.remediation}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {f.code} · detected {new Date(f.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
