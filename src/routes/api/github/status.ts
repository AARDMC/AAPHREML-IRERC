import { createFileRoute } from "@tanstack/react-router";
import { handleGithubStatus } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/github/status")({
  server: {
    handlers: {
      GET: ({ request }) => handleGithubStatus(request),
    },
  },
});
