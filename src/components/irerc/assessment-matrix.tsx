/**
 * AssessmentMatrix
 *
 * Rich view of submitted reviewer assessments for the Chairperson and
 * Secretariat. Shows a 20-criterion scoring grid side-by-side with
 * narrative summary cards, so decision-makers can compare reviewers at a glance.
 *
 * The PI sees a stripped-down view (no reviewer names, no raw scores).
 */

import { CheckCircle2, XCircle, MinusCircle, Clock, AlertTriangle } from "lucide-react";
import {
  CRITERIA,
  SECTIONS,
  isOverdue,
  type Protocol,
  type Review,
  type RoleKey,
} from "@/lib/irerc/model";
import { Card, Chip } from "@/components/irerc/ui";

const SCORE_META = {
  Appropriate:     { icon: CheckCircle2, color: "text-em",    bg: "bg-em/10",    label: "A",  full: "Appropriate"     },
  "Not appropriate": { icon: XCircle,   color: "text-rose",  bg: "bg-rose/10",  label: "✕",  full: "Not appropriate" },
  "N/A":           { icon: MinusCircle, color: "text-muted", bg: "bg-panel-2",  label: "—",  full: "N/A"             },
} as const;

type ScoreKey = keyof typeof SCORE_META;

function scoreKey(v: string | undefined): ScoreKey {
  if (v === "Not appropriate" || v === "N/A") return v;
  return "Appropriate";
}

// ─── Recommendation chip tone ──────────────────────────────────
function recTone(rec: string) {
  if (rec.includes("Not")) return "rose" as const;
  if (rec.includes("major")) return "amber" as const;
  return "em" as const;
}

// ─── Section summary score ─────────────────────────────────────
function SectionSummary({ review, section }: { review: Review; section: string }) {
  const criteria = CRITERIA.filter((c) => c.section === section);
  const notOk = criteria.filter((c) => scoreKey(review.scores?.[c.code]) === "Not appropriate").length;
  if (!review.scores) return <Chip tone="muted">No data</Chip>;
  if (notOk === 0) return <Chip tone="em">All appropriate</Chip>;
  return <Chip tone="rose">{notOk} issue{notOk > 1 ? "s" : ""}</Chip>;
}

// ─── Full matrix for one reviewer ─────────────────────────────
function ReviewerMatrix({ review, index, showName }: { review: Review; index: number; showName: boolean }) {
  const hasScores = Boolean(review.scores && Object.keys(review.scores).length > 0);

  return (
    <div className="rounded-2xl border border-line bg-panel">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {showName ? review.reviewer : `Reviewer ${String(index + 1).padStart(2, "0")}`}
          </p>
          <p className="text-xs text-muted">Submitted {review.date}</p>
        </div>
        <Chip tone={recTone(review.recommendation)}>{review.recommendation}</Chip>
        {review.conflict ? null : <Chip tone="muted">Conflict declared</Chip>}
      </div>

      {/* Section summary bar */}
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5">
        {SECTIONS.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted">{s}</span>
            {hasScores ? (
              <SectionSummary review={review} section={s} />
            ) : (
              <Chip tone="muted">—</Chip>
            )}
          </div>
        ))}
      </div>

      {/* 20-criterion grid */}
      {hasScores ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-panel-2/40 text-[10px] tracking-wide text-muted uppercase">
                <th className="px-4 py-2 font-semibold">#</th>
                <th className="px-4 py-2 font-semibold">Criterion</th>
                <th className="px-4 py-2 font-semibold">Section</th>
                <th className="px-4 py-2 font-semibold text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {CRITERIA.map((c, i) => {
                const key = scoreKey(review.scores?.[c.code]);
                const meta = SCORE_META[key];
                const Icon = meta.icon;
                const isIssue = key === "Not appropriate";
                return (
                  <tr
                    key={c.code}
                    className={`border-b border-line/60 ${isIssue ? "bg-rose/5" : ""}`}
                  >
                    <td className="px-4 py-2 font-mono text-[10px] text-muted">{i + 1}</td>
                    <td className="px-4 py-2 leading-relaxed">{c.question}</td>
                    <td className="px-4 py-2 text-muted">{c.section}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-3 text-xs text-muted italic">
          Criterion-level scores were not recorded for this assessment (submitted before score tracking was introduced).
        </p>
      )}

      {/* Comments */}
      {review.comments ? (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[10px] font-bold tracking-wide text-muted uppercase">Comments to the committee</p>
          <p className="mt-1 text-sm leading-relaxed">{review.comments}</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Comparative side-by-side matrix (2+ reviewers) ───────────
function ComparativeMatrix({ reviews, showNames }: { reviews: Review[]; showNames: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-line bg-panel-2/60 text-[10px] tracking-wide text-muted uppercase">
            <th className="min-w-[16rem] px-4 py-2.5 font-semibold">Criterion</th>
            {reviews.map((r, i) => (
              <th key={r.reviewer} className="px-4 py-2.5 font-semibold text-center whitespace-nowrap">
                {showNames ? r.reviewer : `Rev. ${String(i + 1).padStart(2, "0")}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((section) => (
            <>
              <tr key={`section-${section}`} className="border-b border-line bg-gradient-to-r from-sky/10 to-transparent">
                <td colSpan={reviews.length + 1} className="px-4 py-1.5 text-[10px] font-bold tracking-[0.15em] text-sky uppercase">
                  {section}
                </td>
              </tr>
              {CRITERIA.filter((c) => c.section === section).map((c, i) => {
                const globalIdx = CRITERIA.findIndex((x) => x.code === c.code) + 1;
                const hasAnyIssue = reviews.some((r) => scoreKey(r.scores?.[c.code]) === "Not appropriate");
                return (
                  <tr
                    key={c.code}
                    className={`border-b border-line/60 ${hasAnyIssue ? "bg-rose/5" : i % 2 === 0 ? "" : "bg-panel-2/20"}`}
                  >
                    <td className="px-4 py-2 leading-relaxed">
                      <span className="mr-1.5 font-mono text-[10px] text-muted">{globalIdx}.</span>
                      {c.question}
                      {hasAnyIssue ? <AlertTriangle className="ml-1.5 inline size-3 text-rose" /> : null}
                    </td>
                    {reviews.map((r) => {
                      const key = scoreKey(r.scores?.[c.code]);
                      const meta = SCORE_META[key];
                      const Icon = meta.icon;
                      return (
                        <td key={r.reviewer} className="px-4 py-2 text-center">
                          {r.scores ? (
                            <span
                              title={meta.full}
                              className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}
                            >
                              <Icon className="size-3" />
                              {meta.label}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
          {/* Recommendation row */}
          <tr className="border-t-2 border-line bg-panel-2/50 font-semibold">
            <td className="px-4 py-2.5 text-[10px] font-bold tracking-wide text-muted uppercase">Recommendation</td>
            {reviews.map((r) => (
              <td key={r.reviewer} className="px-4 py-2.5 text-center">
                <Chip tone={recTone(r.recommendation)}>{r.recommendation}</Chip>
              </td>
            ))}
          </tr>
          {/* Issues row */}
          <tr className="border-b border-line bg-panel-2/30">
            <td className="px-4 py-2.5 text-[10px] font-bold tracking-wide text-muted uppercase">Issues flagged</td>
            {reviews.map((r) => {
              const issues = r.scores
                ? CRITERIA.filter((c) => scoreKey(r.scores![c.code]) === "Not appropriate").length
                : null;
              return (
                <td key={r.reviewer} className="px-4 py-2.5 text-center tabular-nums">
                  {issues === null ? (
                    <span className="text-muted">—</span>
                  ) : issues > 0 ? (
                    <Chip tone="rose">{issues}</Chip>
                  ) : (
                    <Chip tone="em">None</Chip>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────
export function AssessmentMatrix({ protocol, role }: { protocol: Protocol; role: RoleKey }) {
  const reviews = protocol.reviews;
  const reviewers = protocol.reviewers;
  const pct = reviewers.length ? Math.round((reviews.length / reviewers.length) * 100) : 0;

  const showFullMatrix = role === "chair" || role === "secretariat" || role === "admin";
  const showNames = role !== "investigator";

  return (
    <Card className="p-4 md:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Assessments</h2>
          <p className="text-sm text-muted">
            {reviews.length} of {reviewers.length || 0} submitted
            {pct > 0 && pct < 100 ? ` (${pct}%)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reviews.map((r, i) => (
            <Chip key={r.reviewer} tone={recTone(r.recommendation)}>
              {showNames ? r.reviewer : `Rev. ${String(i + 1).padStart(2, "0")}`}: {r.recommendation}
            </Chip>
          ))}
          {reviewers
            .filter((name) => !reviews.some((r) => r.reviewer === name))
            .map((name, i) => (
              <Chip key={name} tone={isOverdue(protocol, name) ? "rose" : "amber"}>
                {showNames ? name : `Rev. ${String(reviews.length + i + 1).padStart(2, "0")}`}: {isOverdue(protocol, name) ? "Overdue" : "Pending"}
              </Chip>
            ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full rounded-full bg-sky transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* No reviews yet */}
      {reviews.length === 0 && reviewers.length > 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber/30 bg-amber/5 p-3">
          <Clock className="size-5 shrink-0 text-amber" />
          <p className="text-sm text-muted">
            {reviewers.length} reviewer{reviewers.length > 1 ? "s" : ""} assigned — assessments pending.
          </p>
        </div>
      ) : null}

      {reviewers.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No reviewers assigned yet.</p>
      ) : null}

      {/* Rich view for Chair / Secretariat / Admin */}
      {showFullMatrix && reviews.length > 0 ? (
        <div className="mt-4 space-y-4">
          {/* Comparative matrix when multiple reviewers */}
          {reviews.length >= 2 ? (
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.15em] text-muted uppercase">
                Side-by-side comparison
              </p>
              <ComparativeMatrix reviews={reviews} showNames={showNames} />
            </div>
          ) : null}

          {/* Individual detailed matrices */}
          <p className="text-xs font-bold tracking-[0.15em] text-muted uppercase">
            {reviews.length >= 2 ? "Individual assessments" : "Assessment detail"}
          </p>
          {reviews.map((r, i) => (
            <ReviewerMatrix key={r.reviewer} review={r} index={i} showName={showNames} />
          ))}
        </div>
      ) : null}

      {/* Simplified view for Reviewer / PI */}
      {!showFullMatrix && reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {reviewers.map((name, index) => {
            const review = reviews.find((r) => r.reviewer === name);
            const label = showNames ? name : `Reviewer ${String(index + 1).padStart(2, "0")}`;
            return (
              <li key={name} className="rounded-xl border border-line bg-ink-2/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{label}</p>
                  {review ? (
                    <Chip tone={recTone(review.recommendation)}>{review.recommendation}</Chip>
                  ) : (
                    <Chip tone={isOverdue(protocol, name) ? "rose" : "amber"}>
                      {isOverdue(protocol, name) ? "Overdue" : "Pending"}
                    </Chip>
                  )}
                  {review ? <span className="ml-auto text-xs text-muted">{review.date}</span> : null}
                </div>
                {role !== "investigator" && review?.comments ? (
                  <p className="mt-2 text-sm text-muted">{review.comments}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
