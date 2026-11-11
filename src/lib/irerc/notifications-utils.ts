import { useMemo } from "react";
import { useIrerc } from "@/lib/irerc/store";
import type { AppNotification } from "@/lib/irerc/model";

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function useVisibleNotifications(): AppNotification[] {
  const role = useIrerc((s) => s.role);
  const notifications = useIrerc((s) => s.notifications);
  return useMemo(
    () =>
      notifications.filter(
        (n) => n.recipientRole === "all" || n.recipientRole === role || role === "admin",
      ),
    [notifications, role],
  );
}
