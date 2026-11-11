import { createFileRoute } from "@tanstack/react-router";
import { handleDriveStatus } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/drive/status")({
  server: {
    handlers: {
      GET: ({ request }) => handleDriveStatus(request),
    },
  },
});
