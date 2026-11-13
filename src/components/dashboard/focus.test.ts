// اختبارات «مهمة اليوم» — محاكاة مصوّرة 2026-11-13.
// الاختبارات المعلّمة [BUG] تصف السلوك المطلوب وتفشل على الكود الحالي (دليل على المشكلة).
// التشغيل: npx vitest run --config vitest.config.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { computeFocusItems, type FocusBooking } from "./focus";

const NOW = new Date("2026-11-13T09:00:00+03:00");
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
const day = (offset: number) => new Date(NOW.getTime() + offset * 86400000).toISOString().slice(0, 10);

const base: FocusBooking = {
  id: "b1", client_name: "سارة", status: "confirmed", created_at: iso(30),
  event_date: null, delivery_due_at: null, production_stage: null,
  deposit_proof_url: null, deposit_sent_at: null, final_paid_at: null, deposit_amount: 50,
  needs_approval: false, approved_at: null, phone_verified_at: iso(30),
};

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterAll(() => { vi.useRealTimers(); });

describe("السلوك الحالي السليم", () => {
  it("إثبات عربون وصل = أعلى مهمة", () => {
    const items = computeFocusItems([{ ...base, status: "pending_deposit", deposit_sent_at: iso(0.1) }], null);
    expect(items[0]?.id).toBe("proof-b1");
  });
  it("تصوير غداً يظهر عاجلاً", () => {
    const items = computeFocusItems([{ ...base, event_date: day(1) }], null);
    expect(items[0]?.id).toBe("event-b1");
    expect(items[0]?.tone).toBe("urgent");
  });
});

describe("دفعات متأخرة", () => {
  it("[BUG] العرس انتهى قبل 5 أيام، الصور لم تُسلَّم، المتبقي لم يُدفع → يجب أن تظهر مهمة", () => {
    const items = computeFocusItems([{ ...base, event_date: day(-5), production_stage: "editing", delivery_due_at: day(20) }], null);
    expect(items.some((i) => i.id === "final-b1")).toBe(true);
  });
  it("[BUG] وافقت قبل 6 أيام والعربون لم يصل → يجب أن تبقى مهمة (لا تختفي بصمت)", () => {
    const items = computeFocusItems([{ ...base, status: "pending_deposit", created_at: iso(6), approved_at: iso(6), needs_approval: true, event_date: day(40) }], null);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("طلب بانتظار الموافقة", () => {
  it("[BUG] لا يعرض «باقي 0 ساعة» عند انتهاء المهلة", () => {
    const items = computeFocusItems([{ ...base, status: "pending_deposit", needs_approval: true, approved_at: null, phone_verified_at: iso(1.1) }], null);
    expect(items[0]?.detail ?? "").not.toMatch(/باقي 0 ساعة/);
  });
});
