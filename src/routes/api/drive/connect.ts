import { createFileRoute } from "@tanstack/react-router";
import { handleDriveConnect, handleDriveDisconnect } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/drive/connect")({
  server: {
    handlers: {
      POST: ({ request }) => handleDriveConnect(request),
      DELETE: ({ request }) => handleDriveDisconnect(request),
    },
  },
});
