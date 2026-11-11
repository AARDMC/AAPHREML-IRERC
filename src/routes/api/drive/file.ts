import { createFileRoute } from "@tanstack/react-router";
import { handleDriveFile } from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/drive/file")({
  server: {
    handlers: {
      GET: ({ request }) => handleDriveFile(request),
    },
  },
});
