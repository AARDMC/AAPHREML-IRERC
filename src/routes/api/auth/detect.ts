import { createFileRoute } from "@tanstack/react-router";
import { handleDetect } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/auth/detect")({
  server: {
    handlers: {
      POST: ({ request }) => handleDetect(request),
    },
  },
});
