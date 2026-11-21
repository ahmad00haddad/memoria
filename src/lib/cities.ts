// مدن الأردن كما تُكتب في Memoria، ومقارنة تتجاهل الشدّة والمسافات (عمّان = عمان).
export const JORDAN_CITIES = ["عمّان", "إربد", "الزرقاء", "السلط", "مادبا", "جرش", "عجلون", "المفرق", "الكرك", "الطفيلة", "معان", "العقبة"];

// نفس public.norm_city في قاعدة البيانات
export const normCity = (c: string | null | undefined) => (c ?? "").replace(/ّ/g, "").replace(/[أإآ]/g, "ا").trim();
export const sameCity = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && normCity(a) === normCity(b);

/** باقة بلا مدن = لكل المدن */
export const packageCities = (r: { cities?: string[] | null }) => (r.cities ?? []).map((c) => c.trim()).filter(Boolean);

/** هل الباقة متاحة في هذه المدينة؟ (بلا مدن = نعم دائماً) */
export const servesCity = (r: { cities?: string[] | null }, city: string | null | undefined) => {
  const cs = packageCities(r);
  return !city || cs.length === 0 || cs.some((c) => sameCity(c, city));
};

/** مدن فلتر صفحة المصوّرة: من الباقات المربوطة فقط (فارغة = لا فلتر) */
export const filterCities = (rules: { cities?: string[] | null; package?: string }[]) => {
  const out: string[] = [];
  for (const r of rules) {
    if (r.package === "addon") continue;
    for (const c of packageCities(r)) if (!out.some((x) => sameCity(x, c))) out.push(c);
  }
  return out;
};

export const VIDEO_TYPES = ["highlight", "full_film", "full_event", "reels"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];
