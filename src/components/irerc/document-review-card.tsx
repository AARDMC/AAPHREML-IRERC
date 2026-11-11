import { MessageSquare, ShieldCheck, AlertCircle } from "lucide-react";
import { useIrerc } from "@/lib/irerc/store";
import { FINAL_PROTOCOL_CODE, type Protocol } from "@/lib/irerc/model";
import { Btn, Card, Chip } from "@/components/irerc/ui";

export function DocumentReviewCard({ protocol }: { protocol: Protocol }) {
  const openModal = useIrerc((s) => s.openModal);
  const role = useIrerc((s) => s.role);
  const comments = protocol.documentComments ?? [];
  const unresolved = comments.filter((comment) => !comment.resolved).length;
  const finalVersions = protocol.finalProtocol?.versions ?? [];
  const hasPendingRevision =
    role !== "investigator" &&
    finalVersions.length > 0 &&
    (protocol.finalProtocol?.status === "submitted" || protocol.finalProtocol?.status === "under_review");

  return (
    <Card className="border-sky/30 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="size-4 text-sky" /> Document review &amp; comments
          </h2>
          <p className="mt-1 text-sm text-muted">
            Open the submitted Word or PDF document, select text, and add review comments without
            changing the PI's file.
          </p>
        </div>
        <Chip tone={unresolved ? "amber" : "muted"}>
          {unresolved ? `${unresolved} open` : `${comments.length} comments`}
        </Chip>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn kind="primary" onClick={() => openModal({ type: "review", id: protocol.id })}>
          <MessageSquare className="size-4" />
          {role === "investigator" ? "Read reviewer comments" : "Open document review"}
        </Btn>
        {hasPendingRevision ? (
          <Btn
            kind="primary"
            onClick={() => openModal({ type: "review", id: protocol.id, code: FINAL_PROTOCOL_CODE })}
          >
            <AlertCircle className="size-4" /> View revised protocol
          </Btn>
        ) : null}
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <ShieldCheck className="size-3.5 text-em" /> Original protected and read-only
        </span>
      </div>
      {hasPendingRevision ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber" />
          <p className="text-sm text-amber">
            A revised protocol PDF has been submitted by the PI. Open it to verify that all requested corrections have been addressed before proceeding.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
