import { daysFromToday } from "./focus";

// طلب بانتظار موافقة المصوّرة (لم تردّ بعد)
export const awaitingApproval = (b: any): boolean =>
  !!b.needs_approval && !b.approved_at && (b.status === "pending_deposit" || b.status === "quote");

// الطلب اللي لسا بانتظار موافقة المصوّرة مش "بانتظار العربون" (بيظهر تحت "تحتاج إجراء")
export const awaitingDeposit = (b: any): boolean =>
  (b.status === "pending_deposit" || b.status === "quote") && !awaitingApproval(b);

export const hasProof = (b: any) => b.status === "pending_deposit" && (b.deposit_proof_url || b.deposit_sent_at);

export const isOverdue = (b: any) =>
  b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled" && daysFromToday(b.delivery_due_at) < 0;

export const needsAction = (b: any): boolean => !!(hasProof(b) || isOverdue(b) || awaitingApproval(b));
