import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getFooterSettings, updateFooterSettings, type FooterSettings } from "@/lib/site-settings.functions";

export function FooterCreditsSettings() {
  const fetchSettings = useServerFn(getFooterSettings);
  const saveSettings = useServerFn(updateFooterSettings);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FooterSettings | null>(null);

  const { data } = useQuery({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      const s = await fetchSettings();
      setForm((f) => f ?? s);
      return s;
    },
  });

  const mut = useMutation({
    mutationFn: (v: FooterSettings) => saveSettings({ data: v }),
    onSuccess: () => {
      toast.success("Footer credits saved");
      queryClient.invalidateQueries({ queryKey: ["footer-settings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const value = form ?? data;
  if (!value) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  const set = (patch: Partial<FooterSettings>) => setForm({ ...value, ...patch });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate(value);
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3.5">
        <Switch id="show-developed-by" checked={value.show_developed_by} onCheckedChange={(v) => set({ show_developed_by: v })} />
        <Label htmlFor="show-developed-by" className="text-sm">
          Show the entire “Developed By” line in the footer
        </Label>
      </div>

      <Block
        title="First Developer / Company"
        show={value.show_developer1}
        onShow={(v) => set({ show_developer1: v })}
        showHint="Show the first developer in the footer"
        name={value.developer1_name}
        onName={(v) => set({ developer1_name: v })}
        url={value.developer1_url}
        onUrl={(v) => set({ developer1_url: v })}
        idPrefix="dev1"
        nameHint="First developer/company name"
        urlHint="First developer URL"
        required
      />
      <Block
        title="Second Developer"
        show={value.show_developer2}
        onShow={(v) => set({ show_developer2: v })}
        showHint="Show the second developer in the footer"
        name={value.developer2_name}
        onName={(v) => set({ developer2_name: v })}
        url={value.developer2_url}
        onUrl={(v) => set({ developer2_url: v })}
        idPrefix="dev2"
        nameHint="Second developer name"
        urlHint="Second developer URL"
      />
      <Button type="submit" disabled={mut.isPending} className="rounded-full">
        {mut.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function Block(props: {
  title: string;
  show: boolean;
  onShow: (v: boolean) => void;
  showHint: string;
  name: string;
  onName: (v: string) => void;
  url: string;
  onUrl: (v: string) => void;
  idPrefix: string;
  nameHint: string;
  urlHint: string;
  required?: boolean;
}) {
  return (
    <fieldset className="overflow-hidden rounded-2xl border border-border">
      <legend className="sr-only">{props.title}</legend>
      <div className="border-b border-border bg-secondary/50 px-4 py-3 font-semibold">{props.title}</div>
      <div className="space-y-5 p-4">
        <div className="flex items-center gap-3">
          <Switch id={`${props.idPrefix}-show`} checked={props.show} onCheckedChange={props.onShow} />
          <Label htmlFor={`${props.idPrefix}-show`} className="text-sm text-muted-foreground">
            {props.showHint}
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${props.idPrefix}-name`}>
            Name {props.required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`${props.idPrefix}-name`}
            value={props.name}
            required={props.required && props.show}
            onChange={(e) => props.onName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{props.nameHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${props.idPrefix}-url`}>URL</Label>
          <Input
            id={`${props.idPrefix}-url`}
            type="url"
            placeholder="https://example.com/"
            value={props.url}
            onChange={(e) => props.onUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{props.urlHint}</p>
        </div>
      </div>
    </fieldset>
  );
}
