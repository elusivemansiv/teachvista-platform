import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled security scan endpoint. Called by the database cron job.
 * Requires the project's publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/security-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("apikey") ?? "";
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const { runSecurityScan } = await import("@/lib/security-scan.server");
          const result = await runSecurityScan("scheduled");
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("security scan failed", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
