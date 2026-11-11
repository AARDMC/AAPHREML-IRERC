import { createFileRoute } from "@tanstack/react-router";
import { handleLogin } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: ({ request }) => handleLogin(request),
    },
  },
});
