const fs = require('fs');

// --- 1. search.tsx ---
let searchCode = fs.readFileSync('src/routes/search.tsx', 'utf8');
searchCode = searchCode.replace('const [showAdvanced, setShowAdvanced] = useState(false);', 
const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAvailableThisWeek, setIsAvailableThisWeek] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    if (minPrice || maxPrice) {
      localStorage.setItem("memoria_price_pref", JSON.stringify({ min: minPrice, max: maxPrice }));
    }
  }, [minPrice, maxPrice]);

  useEffect(() => {
    try {
      const pref = JSON.parse(localStorage.getItem("memoria_price_pref") || "{}");
      if (!minPrice && pref.min) setMinPrice(pref.min);
      if (!maxPrice && pref.max) setMaxPrice(pref.max);
    } catch {}
  }, []);

  useEffect(() => {
    const handleScroll = () => setSticky(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const resolveCity = (c: string) => {
    const mapping: Record<string, string> = { "عماان": "عمان", "عمن": "عمان", "اربت": "إربد", "إربت": "إربد", "الزركا": "الزرقاء" };
    return mapping[c] || c;
  };);
searchCode = searchCode.replace('queryKey: ["search", debouncedQ, city, minPrice, maxPrice, date, sort],', 'queryKey: ["search", debouncedQ, resolveCity(city), minPrice, maxPrice, isAvailableThisWeek ? "this_week" : date, sort],');
searchCode = searchCode.replace('city: city || undefined,', 'city: resolveCity(city) || undefined,');
searchCode = searchCode.replace('available_date: date || null,', 'available_date: (isAvailableThisWeek ? new Date().toISOString() : date) || null,');
searchCode = searchCode.replace('className="container-editorial py-6 border-b border-border bg-card/50"', 'className={\container-editorial py-6 border-b border-border bg-card/50 transition-all z-40 \\}');
searchCode = searchCode.replace('{/* SORT */}', {/* AVAILABLE THIS WEEK */}
              <button
                type="button"
                onClick={() => setIsAvailableThisWeek(!isAvailableThisWeek)}
                className={\w-full text-center px-4 py-2.5 rounded-sm text-sm border transition-colors \\}
              >
                {isAvailableThisWeek ? "✅ متاحة هذا الأسبوع" : "متاحة هذا الأسبوع؟"}
              </button>

              {/* SORT */});
fs.writeFileSync('src/routes/search.tsx', searchCode, 'utf8');

// --- 2. dashboard.profile.tsx ---
let profileCode = fs.readFileSync('src/routes/_authenticated/dashboard.profile.tsx', 'utf8');
profileCode = profileCode.replace('function ProfilePage() {', 
const extractIban = (text: string) => {
  const match = text.match(/[a-zA-Z]{2}\\d{2}\\s*([a-zA-Z0-9]\\s*){11,30}/);
  return match ? match[0].replace(/\\s/g, "") : text;
};

function ProfilePage() {);
profileCode = profileCode.replace('on={(v) => setP({ ...p, bank_info: v })} />', 'on={(v) => setP({ ...p, bank_info: extractIban(v) })} />');
fs.writeFileSync('src/routes/_authenticated/dashboard.profile.tsx', profileCode, 'utf8');

// --- 3. track..tsx ---
let trackCode = fs.readFileSync('src/routes/track.$token.tsx', 'utf8');
const timelineStepper = {/* VISUAL TIMELINE STEPPER */}
        <div className="mb-10 px-2 mt-6">
          <div className="relative flex justify-between items-center w-full">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-secondary -z-10 -translate-y-1/2 rounded-full overflow-hidden">
              <div className="h-full bg-gold transition-all duration-1000" style={{ width: b.delivered_at ? "100%" : b.editing_started_at ? "75%" : b.deposit_sent_at ? "50%" : "25%" }} />
            </div>
            
            {[
              { id: "booked", label: "تم الحجز", active: true, pulse: !b.deposit_sent_at },
              { id: "deposit", label: "دفع العربون", active: !!b.deposit_sent_at, pulse: b.deposit_sent_at && !b.editing_started_at },
              { id: "editing", label: "جاري التعديل", active: !!b.editing_started_at, pulse: b.editing_started_at && !b.delivered_at },
              { id: "delivered", label: "تم التسليم", active: !!b.delivered_at, pulse: false },
            ].map((step, i) => (
              <div key={step.id} className="flex flex-col items-center gap-2 relative">
                <div className={\w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500 shadow-sm \ \\}>
                  <span className="text-[10px] font-bold">{i + 1}</span>
                </div>
                <span className={\	ext-[10px] sm:text-xs font-medium whitespace-nowrap absolute -bottom-6 \\}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STATUS BADGE */};
trackCode = trackCode.replace('{/* STATUS BADGE */}', timelineStepper);
fs.writeFileSync('src/routes/track.$token.tsx', trackCode, 'utf8');

// --- 4. photographers/.tsx ---
let photogCode = fs.readFileSync('src/routes/photographers/$username.tsx', 'utf8');
photogCode = photogCode.replace('import { hapticVibrate } from "@/lib/utils";', import { hapticVibrate } from "@/lib/utils";\nimport { playSound } from "@/lib/sounds";);

const helpers = 
const formatPhone = (v: string) => {
  const clean = v.replace(/\\D/g, '').slice(0, 10);
  if (clean.length > 7) return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
  if (clean.length > 3) return clean.slice(0, 3) + ' ' + clean.slice(3);
  return clean;
};

const getAddonEmoji = (name: string) => {
  if (name.includes('ألبوم') || name.includes('البوم')) return '📖';
  if (name.includes('درون') || name.includes('طيارة')) return '🚁';
  if (name.includes('مطبوع') || name.includes('طباعة')) return '🖼️';
  if (name.includes('فيديو') || name.includes('تصوير')) return '🎥';
  if (name.includes('ساعة') || name.includes('اضافي')) return '⏱️';
  return '✨';
};

function SimpleBookingForm;
photogCode = photogCode.replace('function SimpleBookingForm', helpers);

// Mad libs
const oldStep3 =       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="الاسم" v={f.client_name} on={(v) => setF({ ...f, client_name: v })} />
        <Field label="الهاتف" v={f.client_phone} on={(v) => setF({ ...f, client_phone: v })} />
        <div className="sm:col-span-2">
          <Field label="الإيميل" type="email" v={f.client_email} on={(v) => setF({ ...f, client_email: v })} />
        </div>;

const newStep3 =       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 p-5 bg-secondary/30 rounded-sm border border-border text-lg leading-loose text-center sm:text-right font-serif">
          أنا <input placeholder="الاسم" value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-gold mx-1 font-sans text-sm" />،
          للتواصل معي يمكنكم الاتصال على <input placeholder="الموبايل" value={f.client_phone} onChange={(e) => setF({ ...f, client_phone: formatPhone(e.target.value) })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-36 sm:w-40 focus:outline-none focus:ring-2 focus:ring-gold mx-1 font-sans text-sm" dir="ltr" />
          أو مراسلتي على <input type="email" placeholder="البريد الإلكتروني" value={f.client_email} onChange={(e) => setF({ ...f, client_email: e.target.value })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-gold mx-1 mt-2 sm:mt-0 font-sans text-sm" dir="ltr" />.
        </div>;
photogCode = photogCode.replace(oldStep3, newStep3);

// Emojis
photogCode = photogCode.replace('<div className="font-medium text-sm">{addon.name}</div>', '<div className="font-medium text-sm flex items-center gap-1.5">{getAddonEmoji(addon.name)} {addon.name}</div>');

// Sticky CTA
const stickyCTA =       <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
        <button onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })} className="w-full bg-charcoal text-gold py-3.5 rounded-full font-bold shadow-2xl flex items-center justify-center gap-2 border border-gold/30 backdrop-blur-md hover:bg-charcoal/90 transition-all active:scale-95">
          احجزي هذه المصورة 📸
        </button>
      </div>
      <Header />;
photogCode = photogCode.replace('<Header />', stickyCTA);

// Error Shake & Sounds
photogCode = photogCode.replace('const [formError, setFormError] = useState<string | null>(null);', 'const [formError, setFormError] = useState<string | null>(null);\n  const [shake, setShake] = useState(false);');

photogCode = photogCode.replace(
  'if (!f.client_name || !f.client_phone || !f.client_email || !f.event_date || !selected) {\n      return toast.error("يرجى تعبئة جميع البيانات الأساسية المطلوبة لاختيار باقتك");\n    }',
  if (!f.client_name || !f.client_phone || !f.client_email || !f.event_date || !selected) {\n      playSound('error');\n      setShake(true); setTimeout(() => setShake(false), 300);\n      return toast.error("يرجى تعبئة جميع البيانات الأساسية المطلوبة لاختيار باقتك");\n    }
);

photogCode = photogCode.replace('className="w-full bg-charcoal text-gold py-4', 'className={\w-full bg-charcoal text-gold py-4 \\ + " ');

photogCode = photogCode.replace('const handlePick = (pkgId: string) => {', 'const handlePick = (pkgId: string) => {\n    playSound("tick");');
photogCode = photogCode.replace('setSuccess({ token: res.token });', 'setSuccess({ token: res.token });\n      playSound("success");');

fs.writeFileSync('src/routes/photographers/$username.tsx', photogCode, 'utf8');

// --- 5. src/styles.css ---
let cssCode = fs.readFileSync('src/styles.css', 'utf8');
if (!cssCode.includes("animate-shake")) {
  cssCode += 
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
}
;
  fs.writeFileSync('src/styles.css', cssCode, 'utf8');
}