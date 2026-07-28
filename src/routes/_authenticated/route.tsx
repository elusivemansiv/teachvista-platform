import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const role: "teacher" | "learner" | "admin" = roles?.some((r) => r.role === "admin")
      ? "admin"
      : roles?.some((r) => r.role === "teacher")
        ? "teacher"
        : "learner";
    return { user: data.user, role };
  },
  component: () => <Outlet />,
});
