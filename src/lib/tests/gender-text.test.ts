import { describe, it, expect } from "vitest";
import { secondToMale, thirdToMale, thirdToMaleEn } from "../gender-text";

describe("secondToMale (مخاطبة المصوّر)", () => {
  it("imperatives and kasra suffixes", () => {
    expect(secondToMale("اضغطي هنا وأكملي صفحتكِ")).toBe("اضغط هنا وأكمل صفحتك");
    expect(secondToMale("بما أن الإلغاء منكِ، عليكِ إرجاع العربون")).toBe("بما أن الإلغاء منك، عليك إرجاع العربون");
    expect(secondToMale("وافقتِ على الطلب")).toBe("وافقت على الطلب");
    expect(secondToMale("آخر ما فتحتِه:")).toBe("آخر ما فتحته:");
    expect(secondToMale("أنتِ جاهزة")).toBe("أنت جاهز");
  });
  it("leaves the bride (third person) and plain words alone", () => {
    expect(secondToMale("العروس لم تحوّل باقي المبلغ بعد")).toBe("العروس لم تحوّل باقي المبلغ بعد");
    expect(secondToMale("التي في الصفحة الأساسي")).toBe("التي في الصفحة الأساسي");
  });
});

describe("thirdToMale (الحديث عن المصوّر للعروس)", () => {
  it("photographer words", () => {
    expect(thirdToMale("المصوّرة وافقت ✓ حوّلي العربون لها مباشرة")).toBe("المصوّر وافق ✓ حوّلي العربون له مباشرة");
    expect(thirdToMale("يظهر رقمها بعد موافقتها")).toBe("يظهر رقمه بعد موافقته");
    // الفاصلة العربية بعد الكلمة
    expect(thirdToMale("بما أن الإلغاء من المصوّرة، عليها إرجاع العربون")).toBe("بما أن الإلغاء من المصوّر، عليه إرجاع العربون");
    // لا يمسّ مخاطبة العروس
    expect(thirdToMale("لا تلغي الحجز قبل أن تقرئي الشروط")).toBe("لا تلغي الحجز قبل أن تقرئي الشروط");
  });
  it("keeps the bride's second person and unrelated feminine words", () => {
    expect(thirdToMale("ارفعي صورة الإيصال وتابعي حجزكِ")).toBe("ارفعي صورة الإيصال وتابعي حجزكِ");
    expect(thirdToMale("ستصلك رسالة عند جاهزيتها")).toBe("ستصلك رسالة عند جاهزيتها");
    expect(thirdToMale("صورك جاهزة للتحميل")).toBe("صورك جاهزة للتحميل");
    expect(thirdToMale("اسم المصوّرة البديلة")).toBe("اسم المصوّرة البديلة");
    expect(thirdToMale("يسعدنا أن تكون تجربتك رائعة.")).toBe("يسعدنا أن تكون تجربتك رائعة.");
    expect(thirdToMale("المصوّرة قد تكون نائمة الآن")).toBe("المصوّر قد يكون نائماً الآن");
  });
});

describe("thirdToMaleEn", () => {
  it("pronouns", () => {
    expect(thirdToMaleEn("After she accepts, send her the deposit; it is hers.")).toBe("After he accepts, send him the deposit; it is his.");
  });
});
