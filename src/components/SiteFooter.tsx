import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFooterSettings } from "@/lib/site-settings.functions";

function DevelopedBy() {
  const fetchSettings = useServerFn(getFooterSettings);
  const { data } = useQuery({ queryKey: ["footer-settings"], queryFn: () => fetchSettings() });
  if (!data) return null;

  const credits = [
    { show: data.show_developer1, name: data.developer1_name, url: data.developer1_url },
    { show: data.show_developer2, name: data.developer2_name, url: data.developer2_url },
  ].filter((c) => c.show && c.name);

  if (!credits.length) return null;

  return (
    <p className="mt-4 text-sm font-medium text-destructive">
      Developed By{" "}
      {credits.map((c, i) => (
        <span key={c.name}>
          {i > 0 && " & "}
          {c.url ? (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {c.name}
            </a>
          ) : (
            c.name
          )}
        </span>
      ))}
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-extrabold">
              Band<span className="text-primary">Path</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Learn IELTS from experienced teachers. Structured video courses, mock tests, and daily practice for every band.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Learn</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse" className="hover:text-foreground">Browse all courses</Link></li>
            <li><Link to="/browse" className="hover:text-foreground">Mock tests</Link></li>
            <li><Link to="/browse" className="hover:text-foreground">Speaking practice</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Teach</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">Become a teacher</Link></li>
            <li><Link to="/teacher" className="hover:text-foreground">Teacher portal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Blog</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BandPath. Built for IELTS learners worldwide.
      </div>
    </footer>
  );
}
