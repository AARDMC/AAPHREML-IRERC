import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import {
  Bar,
  BarChart,
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
import {
  DECISIONS,
  PIPE,
  STATUS_LABEL,
  STATUS_TONE,
  isOverdue,
  type Status,
} from "@/lib/irerc/model";
import { useIrerc } from "@/lib/irerc/store";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/irerc/ui";

type TimeMode = "3m" | "6m" | "12m" | "all" | "custom";

export function AnalysisReport() {
  const role = useIrerc((s) => s.role)!;
  const protocols = useIrerc((s) => s.protocols);
  const openProtocol = useIrerc((s) => s.openProtocol);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [timeMode, setTimeMode] = useState<TimeMode>("12m");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canSeeReviewerPerf = role === "secretariat" || role === "chair";

  // ── Date range from the selected mode ──
  const dateRange = useMemo(() => {
    if (timeMode === "custom") {
      return {
        from: dateFrom ? new Date(dateFrom) : null,
        to: dateTo ? new Date(dateTo + "T23:59:59") : null,
      };
    }
    if (timeMode === "all") return { from: null as Date | null, to: null as Date | null };
    const months = parseInt(timeMode, 10);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    cutoff.setHours(0, 0, 0, 0);
    return { from: cutoff, to: null as Date | null };
  }, [timeMode, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    let list = protocols;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (dateRange.from) list = list.filter((p) => new Date(p.submitted) >= dateRange.from!);
    if (dateRange.to) list = list.filter((p) => new Date(p.submitted) <= dateRange.to!);
    return list;
  }, [protocols, statusFilter, dateRange]);

  // ── Institutional KPIs ──
  const kpis = useMemo(() => {
    const total = filtered.length;
    const underReview = filtered.filter((p) =>
      ["assigned", "reviewing", "reviews_complete"].includes(p.status),
    ).length;
    const approved = filtered.filter((p) =>
      p.decision?.startsWith("Approved"),
    ).length;
    const rejected = filtered.filter((p) =>
      p.decision === "Not Approved",
    ).length;
    const awaitingCorrection = filtered.filter((p) =>
      p.status === "correction",
    ).length;
    const pendingSecretariat = filtered.filter((p) =>
      ["submitted", "screening", "complete"].includes(p.status),
    ).length;
    const pendingReviewer = filtered.filter((p) =>
      ["assigned", "reviewing"].includes(p.status),
    ).length;
    const awaitingChair = filtered.filter((p) =>
      ["reviews_complete", "agenda"].includes(p.status),
    ).length;
    const completed = filtered.filter((p) =>
      ["active", "archived"].includes(p.status),
    ).length;
    return { total, underReview, approved, rejected, awaitingCorrection, pendingSecretariat, pendingReviewer, awaitingChair, completed };
  }, [filtered]);

  // ── Submission trend (monthly) ──
  const trend = useMemo(() => {
    let start: Date;
    let end: Date;
    if (timeMode === "custom" && (dateFrom || dateTo)) {
      start = dateFrom ? new Date(dateFrom) : new Date(filtered[0]?.submitted ?? new Date());
      start.setDate(1);
      end = dateTo ? new Date(dateTo) : new Date();
    } else if (timeMode === "all") {
      const dates = filtered.map((p) => new Date(p.submitted).getTime());
      start = dates.length ? new Date(Math.min(...dates)) : new Date();
      start.setDate(1);
      end = new Date();
    } else {
      const months = parseInt(timeMode, 10);
      end = new Date();
      start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
    }
    const buckets: { label: string; submitted: number; decided: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end && buckets.length < 36) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const label = cursor.toLocaleDateString("en", { month: "short", year: "2-digit" });
      buckets.push({
        label,
        submitted: filtered.filter((p) => p.submitted.startsWith(key)).length,
        decided: filtered.filter(
          (p) =>
            p.status === "decided" &&
            p.history.some((h) => h.action.includes("decision") && h.date.startsWith(key)),
        ).length,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }, [filtered, timeMode, dateFrom, dateTo]);

  // ── Decision distribution ──
  const decisionData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of DECISIONS) map[d] = 0;
    for (const p of filtered) {
      if (p.decision) map[p.decision] = (map[p.decision] ?? 0) + 1;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── Workflow stage distribution ──
  const stageData = useMemo(
    () =>
      PIPE.map((s) => ({
        label: s.label,
        n: filtered.filter((p) => s.match.includes(p.status)).length,
      })),
    [filtered],
  );

  const decisionColors = ["#10b981", "#22c55e", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <div className="rise print-report">
      <PageHead
        title="Analysis Report"
        lede="Institutional performance indicators and workflow analytics, generated live from protocol records."
        action={<span className="no-print"><Btn kind="primary" onClick={() => window.print()}><Printer className="size-4" /> Download PDF</Btn></span>}
      />

      {/* ── Filters ── */}
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold tracking-wide text-muted uppercase">
          Status filter
          <select
            className="mt-1 block min-h-11 rounded-xl border border-line bg-ink-2 px-3 text-sm font-semibold text-fg normal-case"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold tracking-wide text-muted uppercase">
          Time range
          <select
            className="mt-1 block min-h-11 rounded-xl border border-line bg-ink-2 px-3 text-sm font-semibold text-fg normal-case"
            value={timeMode}
            onChange={(e) => setTimeMode(e.target.value as TimeMode)}
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        {timeMode === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold tracking-wide text-muted uppercase">
              From
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-xl border border-line bg-ink-2 px-3 text-sm font-semibold text-fg normal-case"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold tracking-wide text-muted uppercase">
              To
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-xl border border-line bg-ink-2 px-3 text-sm font-semibold text-fg normal-case"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total protocols submitted" value={kpis.total} tone="sky" />
        <KpiCard label="Currently under review" value={kpis.underReview} tone="amber" />
        <KpiCard label="Approved" value={kpis.approved} tone="em" />
        <KpiCard label="Rejected" value={kpis.rejected} tone="rose" />
        <KpiCard label="Awaiting PI corrections" value={kpis.awaitingCorrection} tone="rose" />
        <KpiCard label="Pending secretariat assessment" value={kpis.pendingSecretariat} tone="sky" />
        <KpiCard label="Pending reviewer assessment" value={kpis.pendingReviewer} tone="amber" />
        <KpiCard label="Awaiting chairperson decision" value={kpis.awaitingChair} tone="amber" />
        <KpiCard label="Completed protocols" value={kpis.completed} tone="em" />
      </div>

      {/* ── Charts ── */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card className="p-4 md:p-5">
          <h2 className="text-lg font-semibold">Submission & decision trends</h2>
          <p className="text-sm text-muted">Protocols submitted and decisions recorded per month.</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 12, color: "var(--color-fg)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }} />
                <Bar dataKey="submitted" name="Submitted" fill="var(--color-sky)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="decided" name="Decided" fill="var(--color-em)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="text-lg font-semibold">Decision distribution</h2>
          <p className="text-sm text-muted">Outcomes recorded across all protocols.</p>
          {decisionData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Decisions appear after the committee records them.</p>
          ) : (
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={decisionData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="var(--color-panel)" strokeWidth={2}>
                    {decisionData.map((_, i) => (
                      <Cell key={i} fill={decisionColors[i % decisionColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 12, color: "var(--color-fg)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Workflow stage table ── */}
      <Card className="mt-4 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold">Workflow stage distribution</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Count</th>
                <th className="px-4 py-3 font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {stageData.map((s) => {
                const pct = kpis.total ? Math.round((s.n / kpis.total) * 100) : 0;
                return (
                  <tr key={s.label} className="border-b border-line/70 hover:bg-sky/5">
                    <td className="px-4 py-3 font-semibold">{s.label}</td>
                    <td className="px-4 py-3 tabular-nums">{s.n}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-panel-2">
                          <div className="h-full rounded-full bg-sky" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Detailed records table ── */}
      <Card className="mt-4 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold">
          Detailed records <span className="ml-1 text-sm font-normal text-muted">({filtered.length})</span>
        </h2>
        {filtered.length === 0 ? (
          <div className="p-4"><Empty title="No records" text="No protocols match the current filter." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Protocol</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Review type</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-line/70 hover:bg-sky/5"
                    onClick={() => openProtocol(p.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-sky">{p.id}</p>
                      <p className="mt-0.5 font-semibold">{p.title}</p>
                    </td>
                    <td className="px-4 py-3"><Chip tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip></td>
                    <td className="px-4 py-3 text-muted">{p.reviewType ?? "—"}</td>
                    <td className="px-4 py-3">{p.decision ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{p.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 50 ? (
              <p className="px-4 py-3 text-xs text-muted">Showing first 50 of {filtered.length} records.</p>
            ) : null}
          </div>
        )}
      </Card>

      {/* ── Reviewer Performance Analysis (Secretariat & Chair only) ── */}
      {canSeeReviewerPerf ? <ReviewerPerformance /> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Reviewer Performance Analysis (Section 5)
// ─────────────────────────────────────────────────────────────

function ReviewerPerformance() {
  const protocols = useIrerc((s) => s.protocols);
  const members = useIrerc((s) => s.members);

  const reviewers = members.filter((m) => m.active && (m.seat === "Member" || m.seat === "Lay member"));

  const stats = useMemo(() => {
    return reviewers.map((r) => {
      const assigned = protocols.filter((p) => p.reviewers.includes(r.name));
      const completed = protocols.filter((p) =>
        p.reviews.some((rev) => rev.reviewer === r.name),
      );
      const pending = assigned.filter(
        (p) => !p.reviews.some((rev) => rev.reviewer === r.name) &&
          ["assigned", "reviewing"].includes(p.status),
      );
      const overdue = assigned.filter((p) => isOverdue(p, r.name));

      // Average turnaround: days between assignedOn and review date
      const turnarounds = assigned
        .map((p) => {
          const review = p.reviews.find((rev) => rev.reviewer === r.name);
          if (!review || !p.assignedOn) return null;
          const assignedDate = new Date(p.assignedOn);
          const reviewDate = new Date(review.date);
          return Math.max(0, Math.round((reviewDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)));
        })
        .filter((d): d is number => d !== null);

      const avgTurnaround = turnarounds.length
        ? Math.round((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length) * 10) / 10
        : null;

      return {
        name: r.name,
        category: r.category,
        seat: r.seat,
        assigned: assigned.length,
        completed: completed.length,
        pending: pending.length,
        overdue: overdue.length,
        avgTurnaround,
      };
    });
  }, [reviewers, protocols]);

  const chartData = stats.map((s) => ({
    name: s.name.split(" ").map((w) => w[0]).join(""),
    fullName: s.name,
    Assigned: s.assigned,
    Completed: s.completed,
    Pending: s.pending,
  }));

  return (
    <div className="mt-6">
      <PageHead
        title="Reviewer Performance Analysis"
        lede="Per-reviewer statistics computed from assignment and assessment records. Accessible to Secretariat and Chairperson only."
      />

      {/* Summary cards */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active reviewers" value={reviewers.length} tone="sky" />
        <KpiCard
          label="Total assignments"
          value={stats.reduce((a, s) => a + s.assigned, 0)}
          tone="amber"
        />
        <KpiCard
          label="Assessments submitted"
          value={stats.reduce((a, s) => a + s.completed, 0)}
          tone="em"
        />
        <KpiCard
          label="Overdue reviews"
          value={stats.reduce((a, s) => a + s.overdue, 0)}
          tone="rose"
        />
      </div>

      {/* Comparative bar chart */}
      <Card className="p-4 md:p-5">
        <h2 className="text-lg font-semibold">Reviewer workload comparison</h2>
        <p className="text-sm text-muted">Assigned vs. completed vs. pending assessments per reviewer.</p>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No reviewers registered yet.</p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="4 6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "var(--color-panel)", border: "1px solid var(--color-line)", borderRadius: 12, color: "var(--color-fg)" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }} />
                <Bar dataKey="Assigned" fill="var(--color-sky)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Completed" fill="var(--color-em)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Pending" fill="var(--color-amber)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Detailed table */}
      <Card className="mt-4 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold">Reviewer-wise statistics</h2>
        {stats.length === 0 ? (
          <div className="p-4"><Empty title="No reviewers" text="Register committee members in the Roster to see reviewer performance." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Reviewer</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Pending</th>
                  <th className="px-4 py-3 font-semibold">Overdue</th>
                  <th className="px-4 py-3 font-semibold">Avg turnaround (days)</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.name} className="border-b border-line/70 hover:bg-sky/5">
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.category}</td>
                    <td className="px-4 py-3 tabular-nums">{s.assigned}</td>
                    <td className="px-4 py-3 tabular-nums text-em">{s.completed}</td>
                    <td className="px-4 py-3 tabular-nums text-amber">{s.pending}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {s.overdue ? <Chip tone="rose">{s.overdue}</Chip> : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">{s.avgTurnaround ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted">
        A review is counted as completed only after the reviewer submits their assessment. Turnaround
        time is calculated from the assignment date to the assessment submission date.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  KPI Card helper
// ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, tone }: { label: string; value: number; tone: "sky" | "em" | "amber" | "rose" }) {
  const bar = { sky: "bg-sky", em: "bg-em", amber: "bg-amber", rose: "bg-rose" }[tone];
  return (
    <Card className="relative overflow-hidden p-4">
      <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
