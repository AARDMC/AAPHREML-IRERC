import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import {
  PIPE,
  ROLES,
  STATUS_LABEL,
  STATUS_TONE,
  TODAY,
  maskActor,
  maskNote,
  type Protocol,
  visibleTo,
} from "@/lib/irerc/model";
import { useIrerc } from "@/lib/irerc/store";
import { Card, Chip, PageHead } from "@/components/irerc/ui";
import { NotificationList } from "@/components/irerc/notifications";
import { relativeTime, useVisibleNotifications } from "@/lib/irerc/notifications-utils";
import { workItems } from "@/lib/irerc/work-items";

const PIE_COLORS: Record<string, string> = {
  in: "#64748b",
  screen: "#0ea5e9",
  class: "#6366f1",
  assign: "#8b5cf6",
  review: "#f59e0b",
  agenda: "#f97316",
  decide: "#10b981",
  live: "#22c55e",
};

function useCount(n: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setV(Math.round(n * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return v;
}

export function Dashboard() {
  const role = useIrerc((s) => s.role)!;
  const acting = useIrerc((s) => s.actingReviewer);
  const protocols = useIrerc((s) => s.protocols);
  const safety = useIrerc((s) => s.safety);
  const notifications = useVisibleNotifications();
  const openProtocol = useIrerc((s) => s.openProtocol);
  const openModal = useIrerc((s) => s.openModal);
  const go = useIrerc((s) => s.go);
  const setFilter = useIrerc((s) => s.setFilter);
  const list = protocols.filter((p) => visibleTo(role, p));
  const queue = workItems(role, acting, protocols);
  const approved = list.filter((p) => p.decision?.startsWith("Approved")).length;
  const openSafety = safety.filter((s) => s.status === "Pending review" && list.some((p) => p.id === s.protocolId)).length;
  const counts = PIPE.map((stage) => ({
    ...stage,
    n: list.filter((p) => stage.match.includes(p.status)).length,
  }));
  const activity = list
    .flatMap((p) => p.history.map((x) => ({ ...x, pid: p.id })))
    .sort((a, b) => (b.at ?? `${b.date}T00:00:00Z`).localeCompare(a.at ?? `${a.date}T00:00:00Z`))
    .slice(0, 6);
  const monthly = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: formatter.format(date),
        n: list.filter((p) => p.submitted.startsWith(key)).length,
      };
    });
  }, [list]);
  const statusData = counts
    .filter((stage) => stage.n > 0)
    .map((stage) => ({ name: stage.label, value: stage.n, color: PIE_COLORS[stage.key] ?? "var(--color-sky)" }));
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="rise">
      <PageHead
        title="Dashboard"
        lede={`${ROLES[role].name} · ${ROLES[role].title}. Committee date ${TODAY}. The committee decides; the secretariat administers; the system only records.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tone="sky" label="Protocols in view" value={list.length} hint={role === "investigator" ? "Submitted by you" : "Committee file"} />
        <Kpi tone="amber" label="Awaiting you" value={queue.length} hint="Assigned to your role" />
        <Kpi tone="em" label="Approved" value={approved} hint="Including approval with conditions" />
        <Kpi tone="rose" label="Open safety reports" value={openSafety} hint="AE, SAE, and unanticipated events" />
      </div>

      {role === "investigator" ? <PIStats list={list} go={go} setFilter={setFilter} /> : null}

      <Card className="mt-4 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Workflow</h2>
          <p className="text-xs text-muted">Screening → classification → review → agenda → decision → letter</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-8">
          {counts.map((s) => (
            <div key={s.key} className="text-center">
              <div className={`mx-auto grid size-12 place-items-center rounded-2xl border text-lg font-bold tabular-nums ${s.n ? "pulse-ring border-sky/50 bg-sky/15 text-fg" : "border-line bg-ink-2 text-muted"}`}>
                {s.n}
              </div>
              <p className="mt-2 truncate text-xs font-semibold tracking-wide text-muted uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card className="mt-4 p-8 text-center">
          <p className="font-display text-xl font-semibold">No protocols in the file yet</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            The workspace starts empty. Submit a complete research protocol to open the first file,
            run the 28-section scanner, and begin the IRERC screening workflow.
          </p>
          <div className="mt-4 flex justify-center">
            {role === "investigator" || role === "secretariat" || role === "admin" ? (
              <button className="min-h-11 rounded-xl bg-sky px-4 text-sm font-semibold text-on-accent" onClick={() => openModal({ type: "submit" })}>
                Submit the first protocol
              </button>
            ) : (
              <p className="text-xs text-muted">Switch to the investigator role to submit a protocol.</p>
            )}
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card className="p-4 md:p-5">
          <h2 className="text-lg font-semibold">Your next actions</h2>
          <p className="text-sm text-muted">Only the steps this role is allowed to take.</p>
          <div className="mt-3 divide-y divide-line">
            {queue.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Nothing is waiting on you.</p>
            ) : (
              queue.map((q) => (
                <div key={q.label} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{q.label}</p>
                    <p className="truncate text-xs text-muted">{q.hint}</p>
                  </div>
                  <button className="min-h-11 shrink-0 rounded-xl bg-sky px-3 text-sm font-semibold text-on-accent" onClick={() => openProtocol(q.id)}>
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Submission trend</h2>
            <Chip tone="sky">Last 6 months</Chip>
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="submissionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-sky)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-sky)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 12, color: "var(--color-fg)" }}
                />
                <Area type="monotone" dataKey="n" name="Submissions" stroke="var(--color-sky)" strokeWidth={2.5} fill="url(#submissionsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <h2 className="mt-3 text-lg font-semibold">Workflow mix</h2>
          {statusData.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Charts appear when protocols enter the file.</p>
          ) : (
            <div className="mt-1 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={3} stroke="var(--color-panel)" strokeWidth={2}>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 12, color: "var(--color-fg)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <h2 className="mt-2 text-lg font-semibold">Recent activity</h2>
          <ol className="mt-3 space-y-3 border-l border-line pl-4">
            {activity.length === 0 ? (
              <li className="text-sm text-muted">Activity appears here when the first protocol is submitted.</li>
            ) : null}
            {activity.map((a, i) => (
              <li key={`${a.pid}-${a.date}-${i}`} className={`relative ${i === 0 ? "rounded-lg bg-sky/5 p-2" : ""}`}>
                <span className={`absolute -left-[1.2rem] top-1 size-2.5 rounded-full border-2 ${i === 0 ? "border-em bg-em" : "border-sky bg-ink"}`} />
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                  {a.date === TODAY ? "Today" : a.date} · {a.pid}
                  {i === 0 ? <Chip tone="em">New</Chip> : null}
                  {i === 0 ? <span className="font-normal text-muted">{relativeTime(a.at ?? `${a.date}T12:00:00Z`)}</span> : null}
                </p>
                <p className="text-sm">{a.action}</p>
                <p className="text-xs text-muted">{maskActor(a.actor, role)}{maskNote(a.note, a.action, role)}</p>              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-xs text-muted">Unread updates, document revisions and decisions.</p>
          </div>
          <Chip tone={unread ? "rose" : "muted"}>{unread} unread</Chip>
        </div>
        <NotificationList items={notifications.slice(0, 5)} compact />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Status key: {Object.entries(STATUS_LABEL).slice(0, 4).map(([k, label]) => (
          <span key={k} className="mr-2 inline-flex items-center gap-1">
            <Chip tone={STATUS_TONE[k as Protocol["status"]]}>{label}</Chip>
          </span>
        ))}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: "sky" | "amber" | "em" | "rose" }) {
  const n = useCount(value);
  const bar = { sky: "bg-sky", amber: "bg-amber", em: "bg-em", rose: "bg-rose" }[tone];
  return (
    <Card className="relative overflow-hidden p-4">
      <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 text-4xl font-bold tabular-nums">{n}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
//  PI Protocol Tracking (Section 4)
//  Eight clickable statistics for the Principal Investigator.
// ─────────────────────────────────────────────────────────────

function PIStats({ list, go, setFilter }: { list: Protocol[]; go: (v: "protocols") => void; setFilter: (f: string) => void }) {
  const stats = [
    { label: "Total submitted", value: list.length, filter: "all", tone: "sky" as const },
    { label: "Pending review", value: list.filter((p) => ["submitted", "screening", "complete"].includes(p.status)).length, filter: "in", tone: "sky" as const },
    { label: "Under review", value: list.filter((p) => ["assigned", "reviewing", "reviews_complete"].includes(p.status)).length, filter: "review", tone: "amber" as const },
    { label: "Awaiting corrections", value: list.filter((p) => p.status === "correction").length, filter: "screen", tone: "rose" as const },
    { label: "Resubmitted", value: list.filter((p) => p.status === "screening" && p.history.some((h) => h.action.includes("resubmit"))).length, filter: "screen", tone: "amber" as const },
    { label: "Approved", value: list.filter((p) => p.decision?.startsWith("Approved")).length, filter: "live", tone: "em" as const },
    { label: "Rejected", value: list.filter((p) => p.decision === "Not Approved").length, filter: "all", tone: "rose" as const },
    { label: "Completed", value: list.filter((p) => ["active", "archived"].includes(p.status)).length, filter: "live", tone: "em" as const },
  ];
  return (
    <Card className="mt-4 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">My protocol tracking</h2>
        <p className="text-xs text-muted">Click a number to view the corresponding protocols.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {stats.map((s) => (
          <button
            key={s.label}
            className="group rounded-xl border border-line bg-panel-2/40 p-3 text-left transition hover:border-sky/50 hover:bg-sky/5"
            onClick={() => { setFilter(s.filter); go("protocols"); }}
          >
            <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-fg group-hover:text-sky">{s.value}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
