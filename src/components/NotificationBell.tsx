import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readOne = useMutation({ mutationFn: (id: string) => markRead({ data: { id } }), onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: () => markAll(), onSuccess: invalidate });

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              onClick={() => readAll.mutate()}
              className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>
          )}
          {items.map((n) => (
            <li key={n.id} className={n.read_at ? "px-4 py-3" : "bg-accent/40 px-4 py-3"}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {n.link ? (
                    <Link to={n.link as never} className="text-sm font-semibold hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold">{n.title}</p>
                  )}
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read_at && (
                  <button
                    aria-label={`Mark "${n.title}" as read`}
                    onClick={() => readOne.mutate(n.id)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
