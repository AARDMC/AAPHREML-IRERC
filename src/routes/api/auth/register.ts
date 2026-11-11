import { createFileRoute } from "@tanstack/react-router";
import { handleRegister } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: ({ request }) => handleRegister(request),
    },
  },
});
