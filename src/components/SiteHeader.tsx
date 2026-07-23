import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Search, User } from "lucide-react";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Band<span className="text-primary">Path</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/browse"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            Browse courses
          </Link>
          {signedIn && (
            <>
              <Link
                to="/dashboard"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                Dashboard
              </Link>
              <Link
                to="/teacher"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                Teach
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto hidden max-w-sm flex-1 items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search IELTS courses, teachers, topics…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {signedIn ? (
          <Link to="/dashboard">
            <Button size="sm" variant="secondary" className="rounded-full">
              <User className="mr-1 h-4 w-4" /> Account
            </Button>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth" search={{ mode: "signin" }}>
              <Button size="sm" variant="ghost" className="rounded-full">
                Sign in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="rounded-full">
                Get started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
