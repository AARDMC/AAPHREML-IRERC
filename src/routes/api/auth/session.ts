import { createFileRoute } from "@tanstack/react-router";
import { handleSession } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: ({ request }) => handleSession(request),
    },
  },
});
