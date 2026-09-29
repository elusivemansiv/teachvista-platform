import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouterState } from "@tanstack/react-router";
import { getRouteApi } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, Compass, PlayCircle, Upload, LogOut, ShieldCheck, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";

const learnerItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My courses", url: "/my-courses", icon: PlayCircle },
  { title: "Browse courses", url: "/browse", icon: Compass },
];

const teacherItems = [
  { title: "Teacher portal", url: "/teacher", icon: LayoutDashboard },
  { title: "Upload course", url: "/teacher/upload", icon: Upload },
  { title: "Bulk lessons", url: "/teacher/bulk", icon: FileSpreadsheet },
  { title: "Browse courses", url: "/browse", icon: Compass },
];


const adminItems = [
  { title: "Moderation queue", url: "/admin", icon: ShieldCheck },
  { title: "Security findings", url: "/admin-security", icon: ShieldAlert },
  { title: "Browse courses", url: "/browse", icon: Compass },
];

const roleLabels: Record<string, string> = {
  learner: "Learner portal",
  teacher: "Teacher portal",
  admin: "Admin portal",
};

const authRouteApi = getRouteApi("/_authenticated");

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { role } = authRouteApi.useRouteContext();
  const items = role === "admin" ? adminItems : role === "teacher" ? teacherItems : learnerItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && <span className="font-display text-lg font-bold tracking-tight">BandPath</span>}
        </div>
        {!collapsed && (
          <div className="px-4 pb-1 pt-3">
            <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {roleLabels[role ?? "learner"] ?? "Portal"}
            </span>
          </div>
        )}
        <SidebarGroup>
          {!collapsed && (
            <p className="px-4 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((it) => (
                <SidebarMenuItem key={it.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === it.url}
                    className="rounded-xl transition-colors data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:shadow-primary/25 hover:bg-sidebar-accent"
                  >
                    <Link to={it.url} className="flex items-center gap-3">
                      <it.icon className="h-4 w-4" />
                      {!collapsed && <span>{it.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}


function TopBar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role } = authRouteApi.useRouteContext();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <SidebarTrigger className="rounded-lg" />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />

        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="font-medium capitalize text-muted-foreground">{role ?? "learner"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
