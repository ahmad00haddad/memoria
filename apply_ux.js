const fs = require('fs');

// 1. Create sounds.ts
const soundsCode = export const playSound = (type: 'tick' | 'swoosh' | 'success' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
};;
fs.writeFileSync('src/lib/sounds.ts', soundsCode, 'utf8');

// 2. Add Shake CSS
let css = fs.readFileSync('src/styles.css', 'utf8');
if (!css.includes('animate-shake')) {
  css += \n@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
}\n;
  fs.writeFileSync('src/styles.css', css, 'utf8');
}

// 3. Search Page (Phase 3)
let search = fs.readFileSync('src/routes/search.tsx', 'utf8');
search = search.replace('const [showAdvanced, setShowAdvanced] = useState(false);', 
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

  const resolveCity = (c) => {
    const mapping = { "عماان": "عمان", "عمن": "عمان", "اربت": "إربد", "إربت": "إربد", "الزركا": "الزرقاء" };
    return mapping[c] || c;
  };);
search = search.replace('queryKey: ["search", debouncedQ, city, minPrice, maxPrice, date, sort]', 'queryKey: ["search", debouncedQ, resolveCity(city), minPrice, maxPrice, isAvailableThisWeek ? "this_week" : date, sort]');
search = search.replace('city: city || undefined,', 'city: resolveCity(city) || undefined,');
search = search.replace('available_date: date || null,', 'available_date: (isAvailableThisWeek ? new Date().toISOString() : date) || null,');
search = search.replace('className="container-editorial py-6 border-b border-border bg-card/50"', 'className={\container-editorial py-6 border-b border-border bg-card/50 transition-all z-40 \\}');
search = search.replace('{/* SORT */}', {/* AVAILABLE THIS WEEK */}
              <button
                type="button"
                onClick={() => setIsAvailableThisWeek(!isAvailableThisWeek)}
                className={\w-full text-center px-4 py-2.5 rounded-sm text-sm border transition-colors \\}
              >
                {isAvailableThisWeek ? "✅ متاحة هذا الأسبوع" : "متاحة هذا الأسبوع؟"}
              </button>

              {/* SORT */});
fs.writeFileSync('src/routes/search.tsx', search, 'utf8');

// 4. Booking Flow (Phase 2 & 6)
let photog = fs.readFileSync('src/routes/photographers/.tsx', 'utf8');
if (!photog.includes('import { playSound }')) {
  photog = photog.replace('import { hapticVibrate } from "@/lib/utils";', 'import { hapticVibrate } from "@/lib/utils";\nimport { playSound } from "@/lib/sounds";');
}

const helpers = 
const formatPhone = (v) => {
  const clean = v.replace(/\\D/g, '').slice(0, 10);
  if (clean.length > 7) return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
  if (clean.length > 3) return clean.slice(0, 3) + ' ' + clean.slice(3);
  return clean;
};

const getAddonEmoji = (name) => {
  if (name.includes('ألبوم') || name.includes('البوم')) return '📖';
  if (name.includes('درون') || name.includes('طيارة')) return '🚁';
  if (name.includes('مطبوع') || name.includes('طباعة')) return '🖼️';
  if (name.includes('فيديو') || name.includes('تصوير')) return '🎥';
  if (name.includes('ساعة') || name.includes('اضافي') || name.includes('وقت')) return '⏱️';
  return '✨';
};

function SimpleBookingForm;
photog = photog.replace('function SimpleBookingForm', helpers);

// Mad Libs
photog = photog.replace(
  /<Field label="الاسم" v=\{f\.client_name\} on=\{\(v\) => setF\(\{ \.\.\.f, client_name: v \}\)\} \/>\s*<Field label="الهاتف" v=\{f\.client_phone\} on=\{\(v\) => setF\(\{ \.\.\.f, client_phone: v \}\)\} \/>\s*<div className="sm:col-span-2">\s*<Field label="الإيميل" type="email" v=\{f\.client_email\} on=\{\(v\) => setF\(\{ \.\.\.f, client_email: v \}\)\} \/>\s*<\/div>/,
  <div className="sm:col-span-2 p-5 bg-secondary/30 rounded-sm border border-border text-lg leading-loose text-center sm:text-right font-serif">
          أنا <input placeholder="الاسم" value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-gold mx-1 font-sans text-sm" />،
          للتواصل معي يمكنكم الاتصال على <input placeholder="الموبايل" value={f.client_phone} onChange={(e) => setF({ ...f, client_phone: formatPhone(e.target.value) })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-36 sm:w-40 focus:outline-none focus:ring-2 focus:ring-gold mx-1 font-sans text-sm" dir="ltr" />
          أو مراسلتي على <input type="email" placeholder="البريد الإلكتروني" value={f.client_email} onChange={(e) => setF({ ...f, client_email: e.target.value })} className="inline-block bg-background border border-gold/30 rounded-full px-4 py-1.5 text-center w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-gold mx-1 mt-2 sm:mt-0 font-sans text-sm" dir="ltr" />.
        </div>
);

photog = photog.replace('<div className="font-medium text-sm">{addon.name}</div>', '<div className="font-medium text-sm flex items-center gap-1.5">{getAddonEmoji(addon.name)} {addon.name}</div>');

const stickyCTA =       <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
        <button onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })} className="w-full bg-charcoal text-gold py-3.5 rounded-full font-bold shadow-2xl flex items-center justify-center gap-2 border border-gold/30 backdrop-blur-md hover:bg-charcoal/90 transition-all active:scale-95">
          احجزي هذه المصورة 📸
        </button>
      </div>
      <Header />;
photog = photog.replace('<Header />', stickyCTA);

photog = photog.replace('const [formError, setFormError] = useState<string | null>(null);', 'const [formError, setFormError] = useState<string | null>(null);\n  const [shake, setShake] = useState(false);');

photog = photog.replace(
  'if (!f.client_name || !f.client_phone || !f.client_email || !f.event_date || !selected) {\n      return toast.error("يرجى تعبئة جميع البيانات الأساسية المطلوبة لاختيار باقتك");\n    }',
  if (!f.client_name || !f.client_phone || !f.client_email || !f.event_date || !selected) {\n      playSound('error');\n      setShake(true); setTimeout(() => setShake(false), 300);\n      return toast.error("يرجى تعبئة جميع البيانات الأساسية المطلوبة لاختيار باقتك");\n    }
);

photog = photog.replace('className="w-full bg-charcoal text-gold py-4', 'className={\w-full bg-charcoal text-gold py-4 \\ + " ');
photog = photog.replace('const handlePick = (pkgId: string) => {', 'const handlePick = (pkgId: string) => {\n    playSound("tick");');
photog = photog.replace('setSuccess({ token: res.token });', 'setSuccess({ token: res.token });\n      playSound("success");');

fs.writeFileSync('src/routes/photographers/.tsx', photog, 'utf8');

console.log("UX Features Applied Successfully");
