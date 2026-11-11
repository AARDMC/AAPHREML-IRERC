import { createFileRoute } from "@tanstack/react-router";
import { handleDriveTest } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/drive/test")({
  server: {
    handlers: {
      POST: ({ request }) => handleDriveTest(request),
    },
  },
});
