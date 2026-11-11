import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Cloud,
  ExternalLink,
  GitBranch,
  ImagePlus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useIrerc } from "@/lib/irerc/store";
import { ROLES } from "@/lib/irerc/model";
import { ROLE_GUIDES } from "@/lib/irerc/role-guides";
import { useVisibleNotifications } from "@/lib/irerc/notifications-utils";
import { Btn, Card, Chip, PageHead } from "@/components/irerc/ui";
import { ThemePicker } from "@/components/irerc/theme-picker";
import type { DriveStatus, GithubStatus } from "@/lib/integrations/types";

export function SettingsDesk() {
  const role = useIrerc((s) => s.role)!;
  const user = useIrerc((s) => s.user);
  const logout = useIrerc((s) => s.logout);
  const profilePhotos = useIrerc((s) => s.profilePhotos);
  const setProfilePhoto = useIrerc((s) => s.setProfilePhoto);
  const guide = ROLE_GUIDES[role];
  const notifications = useVisibleNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const photo = profilePhotos[role];
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file from your gallery.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Choose an image smaller than 10 MB.");
      return;
    }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setProfilePhoto(role, await resizeProfilePhoto(file));
    } catch {
      setPhotoError("The image could not be read. Try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="rise">
      <PageHead
        title="Settings & role guide"
        lede="Important: your role settings, operating instructions and boundaries. Read these before using the portal."
        action={
          <Btn onClick={() => window.print()}>
            <Printer className="size-4" /> Print guide
          </Btn>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-sky/25 bg-gradient-to-br from-sky/20 via-panel to-em/10 p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-sky uppercase">
              <Sparkles className="size-4" /> Important role settings
            </p>
            <h2 className="mt-1 text-2xl font-bold">{guide.headline}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{guide.summary}</p>
          </div>
          <Chip tone="amber">{ROLES[role].title}</Chip>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="min-w-0 p-4 md:p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-em" />
            <h2 className="text-lg font-semibold">Operating instructions</h2>
          </div>
          <p className="mt-1 text-sm text-muted">Follow these steps every time you use this role.</p>
          <ol className="mt-4 space-y-3">
            {guide.bullets.map((bullet, index) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky to-em text-xs font-bold text-white shadow-sm">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed">{bullet}</p>
              </li>
            ))}
          </ol>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold">Profile photo</h2>
            <p className="mt-1 text-xs text-muted">Choose a photo from your device gallery. It is shown in the header for this role.</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky to-em text-lg font-bold text-white">
                {photo ? <img src={photo} alt="Profile" className="size-full object-cover" /> : ROLES[role].initials}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-panel px-3 text-xs font-semibold hover:border-sky/50">
                  <ImagePlus className="size-4" />
                  {photoBusy ? "Processing…" : "Upload from gallery"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={photoBusy}
                    onChange={(event) => {
                      void changePhoto(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {photo ? (
                  <Btn className="px-3 py-1.5 text-xs" kind="danger" onClick={() => { setProfilePhoto(role, null); setPhotoError(null); }}>
                    <Trash2 className="size-3.5" /> Remove
                  </Btn>
                ) : null}
              </div>
            </div>
            {photoError ? <p className="mt-2 text-xs text-rose">{photoError}</p> : null}
            <p className="mt-2 text-[11px] text-muted">JPG, PNG or another image type up to 10 MB. Stored in this browser.</p>
          </Card>

          <Card className="border-amber/30 bg-amber/10 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber" />
              <h2 className="text-lg font-semibold text-amber">Role boundaries</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {guide.boundaries.map((boundary) => (
                <li key={boundary} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" />
                  <span>{boundary}</span>
                </li>
              ))}
            </ul>
          </Card>

          <IntegrationsCard />

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Preferences</h2>
            <p className="mt-1 text-xs text-muted">Display and notification settings for this browser.</p>
            <div className="mt-3 rounded-xl border border-line bg-panel-2/40 p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Theme</p>
              <ThemePicker />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-panel-2/40 p-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold"><Bell className="size-4 text-sky" /> Notifications</p>
                <p className="mt-0.5 text-xs text-muted">{unread} unread for this role</p>
              </div>
              <Chip tone={unread ? "rose" : "muted"}>{unread ? "Action needed" : "Clear"}</Chip>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-panel-2/40 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Signed-in account</p>
                <p className="mt-0.5 truncate text-xs text-muted">{user?.email ?? ROLES[role].title}</p>
                <p className="text-[11px] text-muted">{ROLES[role].title}</p>
              </div>
              <Btn className="shrink-0 px-3 py-1.5 text-xs" onClick={logout}>Sign out</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IntegrationsCard() {
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [github, setGithub] = useState<GithubStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [driveResponse, githubResponse] = await Promise.all([
        fetch("/api/drive/status", { credentials: "same-origin", headers: { accept: "application/json" } }),
        fetch("/api/github/status", { credentials: "same-origin", headers: { accept: "application/json" } }),
      ]);
      if (driveResponse.status === 401 || githubResponse.status === 401) {
        setError("Your session has expired. Sign out and sign in again to check the connections.");
        return;
      }
      setDrive(
        driveResponse.ok
          ? ((await driveResponse.json()) as DriveStatus)
          : { connected: false, folderId: "", accountsPersisted: false, error: await messageOf(driveResponse) },
      );
      setGithub(
        githubResponse.ok
          ? ((await githubResponse.json()) as GithubStatus)
          : { repo: "", url: "", connected: false, error: await messageOf(githubResponse) },
      );
    } catch {
      setError("The connection check could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // Only the first render should trigger the status check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Connected services</h2>
          <p className="mt-1 text-xs text-muted">
            Document storage and source control. Checked on demand, not at start-up.
          </p>
        </div>
        <Btn className="px-3 py-1.5 text-xs" onClick={() => void load()} disabled={busy}>
          <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Checking…" : "Refresh"}
        </Btn>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p>
      ) : null}

      <div className="mt-3 space-y-2">
        <div className="rounded-xl border border-line bg-panel-2/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Cloud className="size-4 text-sky" /> Google Drive
            </p>
            <Chip tone={busy ? "muted" : drive?.connected ? "em" : "rose"}>
              {busy ? "Checking" : drive?.connected ? "Connected" : "Not connected"}
            </Chip>
          </div>
          {drive?.connected ? (
            <div className="mt-1 space-y-0.5 text-xs text-muted">
              <p>Folder: <span className="font-semibold text-fg">{drive.name ?? drive.folderId}</span></p>
              <p>PI accounts: {drive.accountsPersisted ? "stored in Drive _system" : "in memory only"}</p>
              {drive.serviceAccountEmail ? (
                <p className="break-words">Access via: <span className="font-semibold text-fg">{drive.serviceAccountEmail}</span></p>
              ) : null}
              <a
                href={drive.webViewLink ?? `https://drive.google.com/drive/folders/${drive.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-sky hover:underline"
              >
                Open folder <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <div className="mt-1 space-y-1 text-xs text-muted">
              <p>{drive?.error ?? "Add the Google service-account key to enable document uploads and previews."}</p>
              {drive?.serviceAccountEmail ? (
                <p className="break-words">Shared folder access must be granted to <span className="font-semibold text-fg">{drive.serviceAccountEmail}</span>.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-panel-2/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="size-4 text-em" /> GitHub repository
            </p>
            <Chip tone={busy ? "muted" : github?.connected ? "em" : "amber"}>
              {busy ? "Checking" : github?.connected ? "Reachable" : "Private / offline"}
            </Chip>
          </div>
          {github?.url ? (
            <div className="mt-1 space-y-0.5 text-xs text-muted">
              <a
                href={github.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-sky hover:underline"
              >
                {github.repo} <ExternalLink className="size-3" />
              </a>
              {github.description ? <p>{github.description}</p> : null}
              {github.latestCommit ? (
                <p className="truncate">
                  Latest: <span className="font-mono text-[11px]">{github.latestCommit.shortSha}</span>{" "}
                  {github.latestCommit.message}
                </p>
              ) : null}
              {typeof github.openIssues === "number" ? <p>Open issues: {github.openIssues}</p> : null}
              {!github.connected && github.error ? <p className="text-amber">{github.error}</p> : null}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">{github?.error ?? "No repository configured."}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

async function messageOf(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string") return payload.error;
  } catch {
    // Ignore non-JSON bodies.
  }
  return `Request failed (${response.status}).`;
}

function resizeProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    image.src = url;
  });
}
