import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FooterSettings = {
  show_developed_by: boolean;
  show_developer1: boolean;
  developer1_name: string;
  developer1_url: string;
  show_developer2: boolean;
  developer2_name: string;
  developer2_url: string;
};

const COLS = "show_developed_by, show_developer1, developer1_name, developer1_url, show_developer2, developer2_name, developer2_url";

const FALLBACK: FooterSettings = {
  show_developed_by: true,
  show_developer1: true,
  developer1_name: "Stradigtech",
  developer1_url: "https://stradigtech.com/",
  show_developer2: false,
  developer2_name: "",
  developer2_url: "",
};

function publicSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getFooterSettings = createServerFn({ method: "GET" }).handler(async (): Promise<FooterSettings> => {
  const { data } = await publicSupabase().from("site_settings").select(COLS).eq("id", 1).maybeSingle();
  return (data as FooterSettings | null) ?? FALLBACK;
});

export const updateFooterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FooterSettings) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { error } = await context.supabase
      .from("site_settings")
      .update({
        show_developed_by: data.show_developed_by,
        show_developer1: data.show_developer1,
        developer1_name: data.developer1_name.trim(),
        developer1_url: data.developer1_url.trim(),
        show_developer2: data.show_developer2,
        developer2_name: data.developer2_name.trim(),
        developer2_url: data.developer2_url.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
