import { createFileRoute } from "@tanstack/react-router";
import { handleAuthConfig } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/config")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthConfig(request),
    },
  },
});
