import { createServerFn } from "@tanstack/react-start";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

// العروس تطلب رمز تأكيد على بريدها لإجراء مالي (إلغاء بعد العربون / موافقة على ملحق بمبلغ).
export const requestBrideCode = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; purpose: "cancel" | "addendum" }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) throw new Error("invalid token");
    if (d.purpose !== "cancel" && d.purpose !== "addendum") throw new Error("invalid purpose");
    return d;
  })
  .handler(async ({ data }) => {
    const { issueStepUpCode } = await import("@/lib/stepup.server");
    return issueStepUpCode(data.token, data.purpose);
  });
