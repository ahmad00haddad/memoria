// ============================================================================
// طرق استلام العربون — قائمة تضيفها المصوّرة (photographer_private.payment_methods)
// ----------------------------------------------------------------------------
// cliq:   الـ alias + البنك أو المحفظة المربوط عليها + الاسم كما يظهر عند التحويل
// wallet: اسم المحفظة (زين كاش، أورانج موني…) + رقمها + الاسم
// bank:   البنك + اسم صاحب الحساب + IBAN
// note:   ملاحظة اختيارية لأي طريقة (والبيانات القديمة الحرة من bank_info)
// cliq_alias و bank_info يُشتقّان من القائمة عند الحفظ حتى تعمل الأجزاء الأقدم.
// ============================================================================

export type PaymentKind = "cliq" | "wallet" | "bank";

export type PaymentMethod = {
  kind: PaymentKind;
  alias?: string;    // cliq
  provider?: string; // cliq: البنك/المحفظة المربوط عليها · wallet: اسم المحفظة
  number?: string;   // wallet
  bank?: string;     // bank
  iban?: string;     // bank
  holder?: string;   // الاسم كما يظهر عند التحويل
  note?: string;
};

export const WALLETS = ["زين كاش", "أورانج موني", "محفظة أمنية", "دينارك"];

export const JO_BANKS = [
  "البنك العربي", "بنك الإسكان", "البنك الأهلي الأردني", "بنك القاهرة عمّان", "بنك الاتحاد",
  "البنك الإسلامي الأردني", "بنك صفوة الإسلامي", "بنك الأردن", "كابيتال بنك", "البنك الأردني الكويتي",
  "البنك التجاري الأردني", "بنك ABC", "بنك الاستثمار العربي الأردني", "البنك العقاري المصري العربي",
  "بنك المؤسسة العربية المصرفية", "البنك الاستثماري", "بنك سوسيته جنرال", "بنك لبنان والمهجر",
];

const clean = (v?: string) => (v ?? "").trim();

export function emptyMethod(kind: PaymentKind): PaymentMethod {
  return kind === "cliq" ? { kind, alias: "", provider: "", holder: "" }
    : kind === "wallet" ? { kind, provider: "", number: "", holder: "" }
    : { kind, bank: "", holder: "", iban: "" };
}

/** طريقة صالحة للاستخدام: فيها ما تحتاجه العروس لتحوّل فعلاً. */
export function isUsable(m: PaymentMethod): boolean {
  if (m.kind === "cliq") return !!clean(m.alias);
  if (m.kind === "wallet") return !!clean(m.number) && !!clean(m.provider);
  return !!clean(m.iban) || !!clean(m.note);
}

export function parseMethods(raw: unknown): PaymentMethod[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is PaymentMethod => !!m && typeof m === "object" && ["cliq", "wallet", "bank"].includes((m as any).kind))
    .map((m) => ({ ...m }));
}

/** ينظّف القائمة قبل الحفظ: يحذف الفارغ ويقصّ المسافات. */
export function normalizeMethods(list: PaymentMethod[]): PaymentMethod[] {
  return list
    .map((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === "string" ? v.trim().slice(0, 300) : v])) as PaymentMethod)
    .map((m) => (m.iban ? { ...m, iban: m.iban.replace(/\s+/g, "").toUpperCase() } : m))
    .filter(isUsable);
}

/** الأعمدة القديمة: أول CliQ alias، وباقي الطرق كنص للقرّاء الأقدم. */
export function legacyColumns(list: PaymentMethod[]): { cliq_alias: string | null; bank_info: string | null } {
  const cliq = list.find((m) => m.kind === "cliq");
  const rest = list.filter((m) => m !== cliq).map((m) => {
    if (m.kind === "wallet") return [m.provider, m.number, m.holder, m.note].filter(Boolean).join(" · ");
    if (m.kind === "bank") return [m.bank, m.holder, m.iban, m.note].filter(Boolean).join(" · ");
    return [`CliQ: ${m.alias}`, m.provider, m.holder].filter(Boolean).join(" · ");
  });
  return { cliq_alias: cliq?.alias || null, bank_info: rest.length ? rest.join("\n") : null };
}
