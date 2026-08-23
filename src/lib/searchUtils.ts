const typoDictionary: Record<string, string> = {
  // Cities
  "عماان": "عمان",
  "عمن": "عمان",
  "اربد": "إربد",
  "يربد": "إربد",
  "الزرقا": "الزرقاء",
  "زرقاء": "الزرقاء",
  "المفرق": "مفرق",
  "عقلة": "العقبة",
  "عقبه": "العقبة",
  
  // Photography terms
  "تصوير": "تصوير",
  "فوتوغرافي": "فوتوغرافي",
  "عرس": "عرس",
  "حفله": "حفلة",
  "فديو": "فيديو",
  "استديو": "استوديو",
  "استيديو": "استوديو",
  "عرائس": "عرايس",
  "خطوبه": "خطوبة",
};

export function typoCorrect(query: string): string {
  if (!query) return query;
  
  const words = query.split(/\s+/);
  const fixedWords = words.map(w => {
    // Basic normalization for checking
    const normW = w.replace(/أ|إ|آ/g, "ا").replace(/ة/g, "ه");
    for (const [wrong, right] of Object.entries(typoDictionary)) {
      const normWrong = wrong.replace(/أ|إ|آ/g, "ا").replace(/ة/g, "ه");
      if (normW === normWrong) return right;
    }
    return w;
  });
  
  return fixedWords.join(" ");
}
