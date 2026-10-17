/**
 * Portal-style review decision: status plus Approved amount (required when
 * approving), Rejection reason (required when rejecting) and Internal remarks.
 * Every status change is appended to review.history.
 */
import { unverifiedRequired } from "./documents";
import { isWorkflowStatus, normalizeStored } from "./portal";
import type { StoredApplication, WorkflowStatus } from "./types";

export type DecisionInput = {
  workflow: string;
  approved_amount?: number | null;
  rejection_reason?: string;
  remarks?: string;
  author: string;
  at?: string;
};

export function applyDecision(input: StoredApplication, decision: DecisionInput): StoredApplication {
  const application = normalizeStored(input);
  if (!isWorkflowStatus(decision.workflow)) throw new Error("Choose a status.");
  const next = decision.workflow as WorkflowStatus;
  const at = decision.at ?? new Date().toISOString();
  const remarks = (decision.remarks ?? "").trim();
  const reason = (decision.rejection_reason ?? "").trim();
  if (remarks.length > 1000 || reason.length > 1000) throw new Error("Use 1000 characters or fewer.");
  if (next === "approved") {
    const amount = decision.approved_amount;
    if (amount === null || amount === undefined || !Number.isInteger(amount) || amount < 1) {
      throw new Error("Enter the approved scholarship amount (PKR) to approve this application.");
    }
    const missing = unverifiedRequired(application);
    if (missing.length > 0) throw new Error(`Verify every required document first: ${missing.join(", ")}.`);
    const half = application.fee.amount === null ? 0 : Math.round(application.fee.amount / 2);
    application.review.award_amount = amount;
    application.review.award_override = amount !== half;
  }
  if (next === "rejected") {
    if (reason.length < 2) throw new Error("Enter a rejection reason to reject this application.");
    application.review.rejection_reason = reason;
  }
  const previous = application.review.workflow;
  if (previous !== next) {
    application.review.history = [
      ...(application.review.history ?? []),
      { at, from: previous, to: next, by: decision.author, note: next === "rejected" ? reason : "" },
    ];
    application.review.workflow = next;
  }
  if (remarks) application.review.remarks = [...application.review.remarks, { at, author: decision.author, text: remarks }];
  return application;
}
