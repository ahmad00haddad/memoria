import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { awaitingDeposit, needsAction } from "./bookings-filters";

const NOW = new Date("2026-11-13T09:00:00+03:00");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86400000).toISOString().slice(0, 10);

const base = {
  id: "b1", status: "confirmed", event_date: day(30), delivery_due_at: null as string | null,
  production_stage: null as string | null, deposit_proof_url: null, deposit_sent_at: null,
  needs_approval: false, approved_at: null,
};

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterAll(() => { vi.useRealTimers(); });

describe("فلاتر قائمة الحجوزات", () => {
  it("طلب بانتظار الموافقة = يحتاج إجراء وليس بانتظار العربون", () => {
    const b = { ...base, status: "pending_deposit", needs_approval: true };
    expect(needsAction(b)).toBe(true);
    expect(awaitingDeposit(b)).toBe(false);
  });
  it("إثبات عربون = يحتاج إجراء", () => {
    expect(needsAction({ ...base, status: "pending_deposit", deposit_proof_url: "x" })).toBe(true);
  });
  it("تسليم متأخر = يحتاج إجراء", () => {
    expect(needsAction({ ...base, delivery_due_at: day(-3), production_stage: "editing" })).toBe(true);
  });
  it("حجز مؤكّد قادم عادي = لا", () => {
    expect(needsAction(base)).toBe(false);
  });
  it("ملغى متأخر = لا", () => {
    expect(needsAction({ ...base, status: "cancelled", delivery_due_at: day(-3) })).toBe(false);
  });
});
