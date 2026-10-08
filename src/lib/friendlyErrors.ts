import { toast } from "sonner";

// Server functions and Supabase throw English/technical messages. Users must never
// see those, so every toast.error passes through here once at app start.
const KNOWN: [RegExp, string][] = [
  [
    /failed to fetch|networkerror|load failed|network request failed/i,
    "تعذّر الاتصال بالإنترنت. تأكدي من الشبكة وحاولي مرة أخرى.",
  ],
  [/invalid login credentials/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة."],
  [/email not confirmed/i, "لم يتم تأكيد بريدكِ بعد. افتحي رسالة التفعيل في بريدكِ."],
  [
    /user already registered|already been registered/i,
    "هذا البريد مسجّل مسبقاً. سجّلي الدخول أو استعيدي كلمة المرور.",
  ],
  [/password should be at least|weak password/i, "كلمة المرور ضعيفة. استخدمي 8 أحرف على الأقل."],
  [/rate limit|too many requests|429/i, "محاولات كثيرة. انتظري دقيقة ثم حاولي مجدداً."],
  [
    /jwt expired|invalid jwt|not authenticated|unauthorized|session/i,
    "انتهت الجلسة. سجّلي الدخول مرة أخرى.",
  ],
  [/forbidden|permission denied|row-level security/i, "ليس لديكِ صلاحية لهذا الإجراء."],
  [/payload too large|file size|exceeded the maximum/i, "الملف كبير جداً."],
  [/invalid token|not found/i, "الرابط غير صالح أو انتهت صلاحيته."],
  [/duplicate key|already exists/i, "هذا موجود مسبقاً."],
  [/timeout|timed out/i, "استغرق الطلب وقتاً طويلاً. حاولي مرة أخرى."],
];

export function friendlyError(msg: unknown): string {
  const text = typeof msg === "string" ? msg : msg instanceof Error ? msg.message : "";
  if (!text) return "حدث خطأ غير متوقع. حاولي مرة أخرى.";
  if (/[؀-ۿ]/.test(text)) return text;
  for (const [re, ar] of KNOWN) if (re.test(text)) return ar;
  return "حدث خطأ غير متوقع. حاولي مرة أخرى.";
}

let installed = false;
export function installFriendlyToasts() {
  if (installed) return;
  installed = true;
  const original = toast.error;
  toast.error = ((message: Parameters<typeof original>[0], opts?: Parameters<typeof original>[1]) =>
    original(
      typeof message === "string" || message instanceof Error ? friendlyError(message) : message,
      opts,
    )) as typeof toast.error;
}
