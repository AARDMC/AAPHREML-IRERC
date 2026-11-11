import { createFileRoute } from "@tanstack/react-router";
import {
  handleDriveDelete,
  handleDriveList,
  handleDriveUpload,
} from "@/lib/integrations/api.server";

export const Route = createFileRoute("/api/drive/documents")({
  server: {
    handlers: {
      GET: ({ request }) => handleDriveList(request),
      POST: ({ request }) => handleDriveUpload(request),
      DELETE: ({ request }) => handleDriveDelete(request),
    },
  },
});
