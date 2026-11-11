/**
 * Google Drive connection controls for the Settings card.
 *
 * A service-account key can be pasted here by an administrator. The server
 * verifies the key against the folder, keeps it in its own storage and never
 * sends it back to the browser — the response only carries the account address.
 */

import { useState } from "react";
import { CheckCircle2, Loader2, PlugZap, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { Btn } from "@/components/irerc/ui";
import type { DriveStatus, DriveTestResult } from "@/lib/integrations/types";

const inputCls =
  "w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs text-fg outline-none placeholder:text-muted focus:border-sky/60";

async function messageOf(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  } catch {
    // Non-JSON body.
  }
  return `The server returned ${response.status}.`;
}

export function DriveSetup({
  status,
  onChanged,
}: {
  status: DriveStatus | null;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [keyJson, setKeyJson] = useState("");
  const [folderId, setFolderId] = useState("");
  const [busy, setBusy] = useState<"connect" | "test" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [steps, setSteps] = useState<DriveTestResult["steps"] | null>(null);

  const connected = Boolean(status?.connected);
  const fromEnvironment = status?.source === "env";

  async function connect() {
    setBusy("connect");
    setError(null);
    setNote(null);
    setSteps(null);
    try {
      const response = await fetch("/api/drive/connect", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ serviceAccountJson: keyJson, folderId: folderId.trim() || undefined }),
      });
      if (!response.ok) {
        setError(await messageOf(response));
        return;
      }
      const saved = (await response.json()) as { folderName?: string; serviceAccountEmail?: string };
      setKeyJson("");
      setNote(
        `Connected to “${saved.folderName ?? "the folder"}”. Share it with ${saved.serviceAccountEmail ?? "the service account"} as Editor if you have not already.`,
      );
      await onChanged();
    } catch {
      setError("The setup request could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setError(null);
    setNote(null);
    setSteps(null);
    try {
      const response = await fetch("/api/drive/test", {
        method: "POST",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as DriveTestResult | { error?: string };
      if ("steps" in payload) {
        setSteps(payload.steps);
        if (!payload.ok) setError("The Drive check did not finish cleanly.");
      } else {
        setError(payload.error ?? `The Drive check returned ${response.status}.`);
      }
    } catch {
      setError("The Drive check could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setError(null);
    setNote(null);
    setSteps(null);
    try {
      const response = await fetch("/api/drive/connect", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        setError(await messageOf(response));
        return;
      }
      setNote("The saved Drive connection was removed from this server.");
      await onChanged();
    } catch {
      setError("The request could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  if (fromEnvironment && connected) {
    return (
      <p className="mt-2 text-xs text-muted">
        Connected with the service account supplied by the host environment.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {connected ? (
          <Btn className="px-3 py-1.5 text-xs" onClick={() => void test()} disabled={busy !== null}>
            {busy === "test" ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />}
            Test connection
          </Btn>
        ) : null}
        {connected && status?.managedHere ? (
          <Btn
            className="px-3 py-1.5 text-xs"
            onClick={() => void disconnect()}
            disabled={busy !== null}
          >
            {busy === "disconnect" ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
            Disconnect
          </Btn>
        ) : null}
        {!connected && !fromEnvironment ? (
          <Btn className="px-3 py-1.5 text-xs" onClick={() => setOpen((value) => !value)}>
            <ShieldCheck className="size-3.5" />
            {open ? "Hide setup" : "Connect Google Drive"}
          </Btn>
        ) : null}
      </div>

      {open && !connected && !fromEnvironment ? (
        <div className="space-y-2 rounded-xl border border-line bg-panel px-3 py-3">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
            <li>Create a service account in Google Cloud and download its JSON key.</li>
            <li>Paste the whole key file below; the server checks it against the folder.</li>
            <li>Share the folder with the account it reports back, as Editor.</li>
          </ol>
          <textarea
            className={`${inputCls} min-h-24 font-mono`}
            value={keyJson}
            onChange={(event) => setKeyJson(event.target.value)}
            placeholder='{ "type": "service_account", "client_email": "…", "private_key": "-----BEGIN PRIVATE KEY-----\n…" }'
            spellCheck={false}
            aria-label="Service account key JSON"
          />
          <label className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
            Drive folder ID (optional)
            <input
              className={`${inputCls} mt-1 font-mono`}
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
              placeholder={status?.folderId || "1IKIdODOiY_0hwanRQ4xk-MhzKVlXVprF"}
              spellCheck={false}
            />
          </label>
          <p className="text-[11px] text-muted">
            The key is stored on the server only. It is never sent back to a browser or shown in the
            page.
          </p>
          <Btn className="px-3 py-1.5 text-xs" onClick={() => void connect()} disabled={busy !== null || !keyJson.trim()}>
            {busy === "connect" ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />}
            Verify and connect
          </Btn>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p>
      ) : null}
      {note ? (
        <p className="rounded-xl border border-em/30 bg-em/10 px-3 py-2 text-xs text-em">{note}</p>
      ) : null}
      {steps ? (
        <ul className="space-y-1 text-xs">
          {steps.map((step) => (
            <li key={step.step} className="flex items-start gap-2">
              {step.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-em" />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose" />
              )}
              <span className="text-muted">
                <span className="font-semibold text-fg">{step.step}</span>
                {step.detail ? <span className="break-words"> — {step.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
