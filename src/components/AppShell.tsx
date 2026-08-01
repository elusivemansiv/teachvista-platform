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
import { GraduationCap, LayoutDashboard, Compass, PlayCircle, Upload, LogOut, User, ShieldCheck, ShieldAlert, FileSpreadsheet } from "lucide-react";
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

const authRouteApi = getRouteApi("/_authenticated");

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
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
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <div className="flex items-center gap-2 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && <span className="font-display text-lg font-extrabold">BandPath</span>}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.title}>
                  <SidebarMenuButton asChild isActive={path === it.url}>
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
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <SidebarTrigger />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />

        <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm md:flex">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Signed in</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
