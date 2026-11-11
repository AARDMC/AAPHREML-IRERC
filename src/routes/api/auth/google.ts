import { createFileRoute } from "@tanstack/react-router";
import { handleGoogleSignIn } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      POST: ({ request }) => handleGoogleSignIn(request),
    },
  },
});
