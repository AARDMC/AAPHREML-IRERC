import {
  TODAY,
  ROLES,
  addDays,
  myReviewPending,
  isRevisionOpen,
  isSubmissionUpdateOpen,
  visibleTo,
  type Protocol,
  type RoleKey,
} from "@/lib/irerc/model";

export function workItems(role: RoleKey, acting: string, list: Protocol[]) {
  const items: { id: string; label: string; hint: string }[] = [];
  for (const p of list) {
    if (!visibleTo(role, p)) continue;
    if ((role === "secretariat" || role === "admin") && p.status === "submitted")
      items.push({ id: p.id, label: `Screen ${p.id}`, hint: p.title });
    else if ((role === "secretariat" || role === "admin") && p.status === "screening")
      items.push({ id: p.id, label: `Finish screening ${p.id}`, hint: p.title });
    else if ((role === "secretariat" || role === "admin") && p.status === "complete")
      items.push({ id: p.id, label: `Classify review type ${p.id}`, hint: p.title });
    else if ((role === "secretariat" || role === "chair" || role === "admin") && p.status === "classified")
      items.push({ id: p.id, label: `Assign reviewers ${p.id}`, hint: p.reviewType || p.title });
    else if ((role === "secretariat" || role === "admin") && p.status === "reviews_complete")
      items.push({ id: p.id, label: `Place on agenda ${p.id}`, hint: p.title });
    else if (role === "chair" && (p.status === "agenda" || p.status === "reviews_complete"))
      items.push({ id: p.id, label: `Record decision ${p.id}`, hint: p.title });
    else if (
      role === "chair" &&
      (p.reviewType === "Expedited Review" || p.reviewType === "Exemption Review") &&
      ["classified", "assigned", "reviewing"].includes(p.status)
    )
      items.push({ id: p.id, label: `Expedited decision ${p.id}`, hint: p.title });
    else if ((role === "secretariat" || role === "admin") && p.status === "decided")
      items.push({ id: p.id, label: `Send action letter ${p.id}`, hint: p.decision || p.title });
    else if (role === "reviewer" && myReviewPending(p, acting))
      items.push({ id: p.id, label: `Assess ${p.id}`, hint: p.title });
    else if (role === "investigator" && p.pi === ROLES.investigator.name && p.status === "correction")
      items.push({ id: p.id, label: `Resubmit ${p.id}`, hint: p.title });
    else if (role === "investigator" && isSubmissionUpdateOpen(p))
      items.push({
        id: p.id,
        label: `Update submission ${p.id}`,
        hint: `48-hour correction window · ${p.submissionUpdateUntil ? new Date(p.submissionUpdateUntil).toLocaleString() : ""}`,
      });
    else if (role === "investigator" && p.status === "revision" && isRevisionOpen(p))
      items.push({
        id: p.id,
        label: `Revise documents ${p.id}`,
        hint: `Revision requested on ${p.revision?.requestedAt ? new Date(p.revision.requestedAt).toLocaleDateString() : ""}`,
      });
    else if (role === "chair" && p.amendment?.status === "Pending review")
      items.push({ id: p.id, label: `Amendment ${p.id}`, hint: p.amendment.summary });
    else if (
      (role === "investigator" || role === "secretariat") &&
      p.status === "active" &&
      p.continuingDue &&
      p.continuingDue <= addDays(TODAY, 45) &&
      (role !== "investigator" || p.pi === ROLES.investigator.name)
    )
      items.push({ id: p.id, label: `Continuing review ${p.id}`, hint: `Due ${p.continuingDue}` });
  }
  return items.slice(0, 6);
}
