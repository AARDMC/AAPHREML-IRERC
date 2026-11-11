import { createFileRoute } from "@tanstack/react-router";
import { handleLogout } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: ({ request }) => handleLogout(request),
    },
  },
});
