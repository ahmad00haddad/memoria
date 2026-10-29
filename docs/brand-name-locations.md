# أماكن اسم "ميموريا / Memoria"

تاريخ التوليد: 2026-10-27 · 132 ملف · 717 سطر

للتحديث: `node scripts/brand-locations.mjs`

> ملاحظة: أماكن خارج الكود لازم تتغيّر يدوياً أيضاً: الدومين، Cloudflare (اسم الـ Worker)، Supabase (أسماء المشاريع، قوالب الإيميل)، Google OAuth (اسم التطبيق)، Zbooni، حسابات السوشال.

## .lovable/plan/خطة-تخفيض-تكلفة-cloud-إلى-الحد-الأدنى-بدون-شراء-رصيد-2026-09-02.md

```
3: الهدف: إبقاء Memoria يعمل فعلياً (تسجيل دخول، حجوزات، تتبّع) مع تقليل استهلاك الباك-إند والتخزين قدر الإمكان، ونقل ما يمكن نقله إلى خدمات مجانية خارجية.
```

## AUDIT_REPORT.md

```
1: # تقرير التدقيق الشامل — مشروع Memoria (ميموريا)
4: **النطاق:** الموقع الحي (`memoria-jo.lovable.app`) + المستودع الكامل
11: **Memoria** منصة أردنية RTL لحجز مصوّرات المناسبات، مبنية على TanStack Start + Supabase (Lovable Cloud) مع PWA وإشعارات وتقويم iCal ودفع CliQ. المشروع ناضج وظيف
137: | D8 | منخفض | `EMAIL_FROM=noreply@memoria.jo` — تأكدي من إعداد SPF/DKIM/DMARC للنطاق في Resend |
```

## README.md

```
2: <h1>📷 Memoria | ميموريا</h1>
10: **ميموريا (Memoria)** هي منصة رقمية متكاملة تهدف إلى ربط العرائس بأفضل المصورات المحترفات. صُممت المنصة لتسهيل رحلة الحجز بالكامل؛ بدءاً من استعراض معرض الأعمال
```

## apply_ux.js

```
67: localStorage.setItem("memoria_price_pref", JSON.stringify({ min: minPrice, max: maxPrice }));
73: const pref = JSON.parse(localStorage.getItem("memoria_price_pref") || "{}");
```

## docs/DEEP_AUDIT_2026-10-18.md

```
1: # تقرير الفحص — Memoria — 2026-10-18 (مُصحَّح)
```

## docs/competitors.md

```
1: # Memoria competitor analysis (2026-10-17)
14: ## Gaps for Memoria
19: ## Deep analysis (2026-10-18): features competitors have, Memoria lacks
20: Memoria already has: Kanban bookings, contracts + e-sign link, delivery galleries, verified reviews, referrals, subscriptions, calendar sync, push, WhatsApp tem
23: | Feature | Who has it | Memoria | Priority |
```

## docs/i18n-review.md

```
25: | استعرض أعمال وأسعار المصوّرة {0}{1} واحجز موعدك مباشرة عبر Memoria. | Explore {0}'s work and prices{1}, and book a session directly through Memoria. |
26: | {0} — مصوّرة أعراس{1} | Memoria | {0} — Wedding Photographer{1} | Memoria |
34: | Memoria · العدد ٠١ | Memoria · Issue 01 |
67: | مرحباً! شاهدت أعمالك الرائعة على منصة Memoria، وأود الاستفسار عن باقات التصوير لحفل زفافي.. | Hello! I saw your amazing work on Memoria and would like to inqu
103: | رابط تتبّع حجزي في ميموريا: | My booking tracking link on Memoria: |
186: | مرحباً! شاهدت أعمالك على ميموريا وأود الاستفسار عن باقات التصوير لحفل زفافي. | Hello! I saw your work on Memoria and would like to inquire about photography p
206: | متابعة حجزك — ميموريا | Continue Your Booking — Memoria |
366: | عرض السعر — ميموريا | Price Quote — Memoria |
392: | توقيع عقد التصوير — ميموريا | Sign Your Photography Contract — Memoria |
426: | قيّمي تجربتك — ميموريا | Rate Your Experience — Memoria |
```

## docs/marketing/production-plan-v2.md

```
1: # خطة إنتاج فيديو Memoria — النسخة 2 (للموافقة)
3: > تاريخ: 2026-10-11 · الهدف: فيديو إنستغرام بأسلوب Squarespace "Make The Next" يقنع المصوّرات بالاشتراك في Memoria لتوفير الوقت والجهد. النصوص بالإنجليزي، عملية
48: | **`memoria-cinema`** (بنيناها) | الكاميرات (ARRI/RED/Venice)، والعدسات، والأفلام، والإضاءة الناعمة، والهوية الأردنية، وقوالب Squarespace، و**قواعد الواقعية غي
76: - تالا تفتح Memoria على الهاتف واللابتوب (نسجّل الشاشة منفصلة).
```

## docs/marketing/video-production-plan.md

```
1: # خطة إنتاج فيديوهات Memoria بالذكاء الاصطناعي
69: - **ما نأخذه:** فيلم إطلاق Memoria. الأردن من الفضاء، ثم عمّان من الأعلى، ثم بيوت الحجر الأبيض، ثم مصوّرات في أماكن مختلفة يضغطن "انشري صفحتك"، ثم **كاميرات وأل
75: - **كوميديا قصيرة** عن ألم المهنة: عميل يختفي بعد العقد، أو حفلة خاطئة. **ما نأخذه:** سلسلة سكتشات قصيرة لتالا عن "مشاكل المصوّرات" (عروس اختفت بعد العربون، أو 
79: ## الجزء 2: الهوية البصرية الأردنية لـ Memoria
93: - **التطريز الفلاحي (Cross-stitch):** يحلّ مكان "STITCH" و"A. Name". **اسم المصوّرة مطرّز يدوياً على حقيبة الكاميرا أو حزامها**، ولوجو Memoria يتكوّن غرزة غرزة 
94: - **السوسنة السوداء:** العنصر الرمزي الختامي، مثل الوردة السوداء في Brrch. سوسنة معلّقة تحت مصباح ولوجو Memoria بجانبها.
125: | 1 | 0:00 إلى 1:00 | تالا واقفة في وسط الاستوديو، والكاميرا معلّقة على كتفها، وتعدّل كمّها. لقطة واسعة ثابتة. يظهر لوجو Memoria. | AI أو تصوير حقيقي |
138: | 14 | 15:30 إلى 17:30 | ابتسامة تالا، ثم **صفحة تالا على ميموريا تنبثق فوق وجهها**. | تسجيل شاشة حقيقي مع تركيب |
143: | 19 | 28:00 إلى 30:00 | لوجو Memoria فوق العينين، وسوسنة سوداء صغيرة، ونص "احجزي مصوّرتك على ميموريا". | جرافيك |
212: 5. **الجرافيكس وواجهة الموقع لا تُولَّد بالذكاء الاصطناعي.** سجّل شاشة Memoria الحقيقية (OBS من الكمبيوتر، أو تسجيل الشاشة في الهاتف)، وأضف الإطارات البيضاوية و
269: | 1 | اشتراك Nover، واختبار 3 لقطات على 3 نماذج، واختيار النموذج. تصوير لقطات وجه تالا الحقيقية (يوم واحد). تسجيل شاشات Memoria. |
```

## docs/zbooni/plan-card.html

```
48: <div class="brand"><img src="mark.svg" alt=""><span class="word">MEMORIA</span></div>
63: <div class="foot">بدون أي عمولة على حجوزاتك · <b>memoria</b> · مصوّرو الأعراس في الأردن</div>
```

## memoria-reel/package.json

```
2: "name": "memoria-reel",
```

## memoria-reel/public/memoria/logo-light.svg

```
40: <text x="552" y="760" text-anchor="end" fill="#1A1513" font-family="Cormorant Garamond Light" font-weight="600" font-size="112">Memoria</text><text x="580" y="7
```

## memoria-reel/src/Bride.tsx

```
1: // Memoria — "Price in DM?" bride-side reel. Bright bridal palette, one continuous take,
233: <div style={{fontFamily: serif, fontSize: 200, color: K.ink}}>Memoria</div>
244: <Head text="مع ميموريا… كل شي قدامك" a={6.1} b={7.5} y={110} size={72} accent="قدامك" />
```

## memoria-reel/src/EndCard.tsx

```
1: // Memoria end card (16:9, 60fps, 7.5s). Timed to endcard/voice.mp3 — the user lays the VO over it,
2: // so the voice is not mixed in here. "Memoria" → all the event's details → not just a random location.
13: // voice beats: "Memoria" 0–0.9 · "كل تفاصيل الحفل" 1.4–3.67 · "مش بس لوكيشن عشوائي" 4.16–5.71
86: <div style={{fontFamily: serif, fontSize: 200, fontWeight: 500, color: C.ink, letterSpacing: 2, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`}}>Memoria</div>
```

## memoria-reel/src/Journal.tsx

```
1: // Memoria — "Live your moments": a photographer's journal. Scrapbook page, polaroids of her own
2: // moments, task stickers that slap on and cover them, then peel off into the Memoria badge.
32: bday: 0.3, dinner: 6.07, friday: 10.53, every: 15.0, memoria: 18.45,
275: // ---------- the Memoria badge: puffy round sticker with rotating text ----------
278: const ring = 'MEMORIA · LIVE YOUR MOMENTS · MEMORIA · LIVE YOUR MOMENTS · ';
303: {f: S(T.memoria) - 10, x: OV.x, y: OV.y, z: OV.z + 0.02},
304: {f: S(T.memoria) + 40, x: 640, y: 900, z: 0.86, ease: IN_OUT},
323: {t: 'كل لحظة إلي… كانت رايحة على شغلة صغيرة', a: T.every, b: T.memoria - 0.3},
324: {t: 'مع ميموريا…', a: T.memoria, b: T.fix1 - 0.1},
359: const badgeS = pop(f, S(T.memoria) + 6, 11);
439: <div style={{fontFamily: serif, fontSize: 120, color: K.plum}}>Memoria</div>
449: <Sfx at={S(T.memoria) + 6} src={P('shimmer.wav')} volume={0.22} />
```

## memoria-reel/src/Launch.tsx

```
1: // Memoria — launch film (9:16, 60fps, ~79s). Style ref: Intercom "Introducing Fin 4" (whatships):
331: <div><Txt size={22} color={K.mute}>Memoria · تلقائي</Txt><Txt size={30} w={600}>{m}</Txt></div>
472: <Title text="Memoria" a={V(B.intro) + 18} b={V(B.page) - 40} y={800} size={190} font={en} dir="ltr" w={200} />
533: <div style={{fontFamily: en, fontSize: 170, fontWeight: 200, letterSpacing: -5, color: K.ink}}>Memoria</div>
```

## memoria-reel/src/Memoria.tsx

```
1: // Memoria — Instagram reel (9:16, 60fps, ~46s). Style ref: Odessia (whatships) — ivory, serif, floating cards, phone UI.
8: const P = (n: string) => `memoria/${n}`;
24: export const MEMORIA_TOTAL = S(SC.total);
132: <div style={{fontFamily: serif, fontSize: 150, fontWeight: 500, color: C.ink, letterSpacing: 2}}>Memoria</div>
133: <Txt size={50} w={500} color={C.accent} style={{marginTop: -10}}>ميموريا</Txt>
268: <Txt size={22} w={700} color={C.muted}>ميموريا · الآن</Txt>
387: <Txt size={22} w={700} color={C.muted}>رابط خاص · memoria</Txt>
419: const logo = pop(f, 4, 14); // voice says "ميموريا" right as the scene opens
436: <div style={{fontFamily: serif, fontSize: 110, fontWeight: 500, color: C.ink, opacity: word, transform: `translateY(${(1 - word) * 30}px)`}}>Memoria</div>
447: {t: 'مع ميموريا… كل شغلك بمكان واحد', a: 5.2, b: 7.9, acc: ['واحد']},
456: export const Memoria: React.FC = () => {
458: const end = MEMORIA_TOTAL;
```

## memoria-reel/src/Night.tsx

```
1: // Memoria — "Same night, twice" reel (9:16, 60fps). Cold night → warm night, synced to night/voice.mp3.
15: q1: 3.66, receipt: 6.41, tomorrow: 9.85, turn: 12.61, memoria: 14.28,
22: const night = (f: number) => interpolate(f, [V(B.turn) + 30, V(B.memoria)], [0, 1], {...clamp, easing: IN_OUT}); // 0 dark → 1 warm
224: <Txt size={22} w={700} color={C.muted}>ميموريا · إلى سارة · تلقائي</Txt>
241: {t: 'نفس الليلة… بس مع ميموريا', a: 12.61, b: 15.2, acc: ['ميموريا']},
256: const rewind = interpolate(f, [V(B.turn) + 10, V(B.memoria) + 10], [0, 1], {...clamp, easing: IN_OUT});
287: {/* turn: memoria mark under the rewinding clock */}
288: <div style={{position: 'absolute', top: 1060, width: '100%', display: 'flex', justifyContent: 'center', opacity: tween(f, V(B.memoria), 30) * (1 - tween(f, V(B.
291: <div style={{fontFamily: serif, fontSize: 90, color: C.ink}}>Memoria</div>
317: <Txt size={34} w={600} color={dark ? DIM : C.muted} style={{position: 'absolute', top: 1050, width: 540, textAlign: 'center'}}>{dark ? 'بدون ميموريا' : 'مع ميمو
325: <div style={{fontFamily: serif, fontSize: 130, color: C.ink, opacity: tween(f, V(B.logo) + 12, 40)}}>Memoria</div>
339: <Audio src={staticFile(P('music-dark.mp3'))} volume={(fr) => interpolate(fr, [0, 40, V(B.turn) + 30, V(B.memoria) + 20], [0, 0.22, 0.22, 0], clamp)} />
348: <Sfx at={V(B.memoria)} src={P('shimmer.wav')} volume={0.24} />
```

## memoria-reel/src/OneTake.tsx

```
1: // Memoria — "Two brides, one day": one continuous take inside the photographer's calendar. No cuts:
16: wrote: 0, want: 1.41, ok: 3.78, month: 6.2, second: 7.22, forgot: 9.35, day: 11.4, turn: 14.61, memoria: 15.4,
114: const ripR = interpolate(f, [V(B.turn) + 30, V(B.memoria) + 40], [0, 2600], {...clamp, easing: IN_OUT});
116: const wGlobal = interpolate(f, [V(B.turn) + 40, V(B.memoria) + 40], [0, 1], {...clamp, easing: IN_OUT});
166: <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: tween(f, V(B.memoria), 30)}}>
167: <div style={{fontFamily: serif, fontSize: 72, color: C.ink}}>Memoria</div>
231: <div style={{fontFamily: serif, fontSize: 92, color: C.ink, lineHeight: 1.1}}>Memoria</div>
244: <Audio src={staticFile(P('music-dark.mp3'))} volume={(fr) => interpolate(fr, [0, 40, V(B.turn) + 20, V(B.memoria) + 30], [0, 0.22, 0.22, 0], clamp)} />
254: <Sfx at={V(B.memoria) + 10} src={P('shimmer.wav')} volume={0.22} />
268: {t: 'طب لو كانت عندي ميموريا؟', a: 14.61, b: 16.2, acc: ['ميموريا؟']},
```

## memoria-reel/src/Outro.tsx

```
1: // Memoria outro (16:9, 60fps, ~20s), white ground. Style ref: Socoloff brand launch (whatships) —
18: // voice: 0–3.68 protect photos/rights · 4.15–6.02 no battlefield · 6.42–7.33 Memoria ·
53: // ---- 6.42: Memoria — giant cropped type + mark ----
124: {/* 3 · Memoria */}
127: <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: inter, fontWeight: 800, fontSize: 330, letterSpacing: -18, colo
140: <Lock closed={lockClose} size={26} color={lockClose > 0.5 ? GOLD : '#999'} /> memoria · gallery · ••••••••
207: <div style={{fontFamily: inter, fontWeight: 800, fontSize: 190, letterSpacing: -10, color: INK, clipPath: `inset(0 ${(1 - tween(f, S(18.5), 40)) * 100}% 0 0)`}}
```

## memoria-reel/src/Price.tsx

```
1: // Memoria — "Your price, your decision" (9:16, 60fps, ~77s). Luxury-jeweller look: deep emerald, gold, ivory,
2: // Amiri serif. One anchor for the whole film: a gold balance scale that tips under pressure and levels with Memoria.
258: <Txt size={15} w={600} color={K.goldL} style={{fontFamily: serif, letterSpacing: 2}}>MEMORIA</Txt>
374: // tilt: pressure (left down) until Memoria lands, then level; small reactions on every beat
435: <Head text="موثّقة من Memoria" a={44.06} b={51.6} y={455} size={74} />
450: <div style={{fontFamily: serif, fontSize: 130, color: K.goldL}}>Memoria</div>
```

## memoria-reel/src/Root.tsx

```
4: import {Memoria, MEMORIA_TOTAL} from './Memoria';
18: <Composition id="Memoria" component={Memoria} durationInFrames={MEMORIA_TOTAL} fps={FPS} width={1080} height={1920} />
```

## public/brand/logo-dark.svg

```
40: <text x="552" y="760" text-anchor="end" fill="#FFF8F3" font-family="Cormorant Garamond Light" font-weight="600" font-size="112">Memoria</text><text x="580" y="7
```

## public/brand/logo-light.svg

```
40: <text x="552" y="760" text-anchor="end" fill="#1A1513" font-family="Cormorant Garamond Light" font-weight="600" font-size="112">Memoria</text><text x="580" y="7
```

## public/brand/og.svg

```
41: <text x="1080" y="250" text-anchor="end" fill="#FFF8F3" font-family="Cormorant Garamond Light" font-weight="600" font-size="104">Memoria</text>
42: <text x="1080" y="360" text-anchor="end" fill="#D8B49E" font-family="Amiri" font-weight="700" font-size="88">ميموريا</text>
```

## public/game/game.js

```
732: const SITE_NAME='Memoria · ميموريا';
733: const SITE_URL='https://memoria-jo.lovable.app/';
```

## public/manifest.webmanifest

```
2: "name": "Memoria",
3: "short_name": "Memoria",
```

## public/offline.html

```
7: <title>بلا اتصال — Memoria</title>
24: <div class="brand">Memoria</div>
```

## public/sw.js

```
1: // Memoria Service Worker — PWA caching + offline support
4: const CACHE_NAME = "memoria-v7";
171: self.registration.showNotification(title || "Memoria", {
```

## scripts/brand-locations.mjs

```
6: const NAME = /ميموريا|memoria/gi;
26: let md = `# أماكن اسم "ميموريا / Memoria"\n\nتاريخ التوليد: ${new Date().toISOString().slice(0, 10)} · ${files.length} ملف · ${total} سطر\n\nللتحديث: \`node scr
```

## scripts/i18n/check.mjs

```
17: /Memoria\W+Memoria/.test(v) ? "double-brand" :
```

## scripts/i18n/keys.json

```
50: "Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان": [
53: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب.": [
56: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس.": [
142: "ميموريا": [
150: "· ميموريا": [
168: "لماذا ميموريا": [
263: "© {0} Memoria · ميموريا. صُمِّم بعناية في عمّان.": [
430: "أضيفي ميموريا لهاتفك": [
456: "كيف يتم الحجز على Memoria": [
484: "Memoria · ميموريا — منصّة تصوير المناسبات في الأردن": [
490: "Memoria · ميموريا — تصوير المناسبات": [
496: "Memoria · ميموريا": [
706: "ميزة التوفر الفوري خلتني أقدر أرتب أموري خلال ساعات، بدل ما أنتظر أيام عشان أسمع رد المصورات. الصور وصلتني أسرع من المتوقع، شكراً ميموريا.": [
721: "من نحن — Memoria · ميموريا": [
724: "ميموريا منصّة أردنية متخصّصة في تنظيم حجوزات مصوّرات الأعراس. تعرّفي على قصّتنا، رؤيتنا، والكيان الذي يقف خلف المنصّة.": [
727: "قصّة ميموريا: لماذا بدأنا، وما الذي نؤمن به.": [
733: "ميموريا منصّة أردنية متخصّصة، أُسّست لتنظيم رحلة حجز مصوّرات الأعراس من البحث حتى التسليم — بعيداً عن فوضى الرسائل، الأسعار الغامضة، والمواعيد المتداخلة.": [
767: "الباقات والأسعار — Memoria · ميموريا": [
770: "باقات اشتراك مرنة للمصوّرات على منصّة ميموريا — بدون عمولة على الحجوزات، وأدوات كاملة لإدارة الأعمال.": [
773: "الباقات والأسعار — Memoria": [
878: "الأسئلة الشائعة — Memoria · ميموريا": [
881: "إجابات لأكثر الأسئلة شيوعاً حول الحجز، الدفع، الإلغاء، التقييمات، والاشتراكات على منصّة ميموريا.": [
884: "الأسئلة الشائعة — Memoria": [
965: "للعملاء — لماذا Memoria؟ | حجز مصوّرات الأعراس بثقة": [
971: "للعملاء — لماذا Memoria؟": [
1061: "Memoria منصّة متخصّصة في مصوّرات الأعراس في الأردن. اخترنا لكِ أفضل المصوّرات، تحقّقنا منهنّ، ووفّرنا أدوات حماية وتتبّع لكل خطوة من خطوات حجزكِ.": [
1073: "١٢ سبباً لاختيار Memoria": [
1082: "للمصوّرات — انضمي إلى Memoria | إدارة كاملة لأعمال التصوير": [
1088: "للمصوّرات — انضمي إلى Memoria": [
1196: "Memoria ليست فقط منصّة عرض — بل نظام إدارة متكامل صُمّم خصيصاً لمصوّرات الأعراس في الأردن. حجوزات، عقود، عرابين، تسليم صور، تقارير، وقوالب واتساب — كل ذلك بالع
1226: "تواصلي معنا — Memoria · ميموريا": [
1229: "فريق ميموريا هنا للمساعدة في الحجوزات، الاشتراكات، والاستفسارات. أرسلي رسالتك وسنردّ خلال 24 ساعة.": [
1241: "[ميموريا] رسالة من {0}": [
1313: "سياسة الخصوصية — Memoria": [
1316: "كيف نجمع بياناتك ونستخدمها ونحميها على منصة Memoria لحجوزات مصوّرات الأعراس في الأردن.": [
1381: "الشروط والأحكام — Memoria": [
1384: "شروط استخدام منصة Memoria لحجوزات مصوّرات الأعراس في الأردن: الحجز، العربون، الإلغاء، والتسليم.": [
1390: "Memoria منصة تنظيمية تربط العميلات بمصوّرات الأعراس في الأردن. المنصة ليست طرفاً في عقد التصوير نفسه؛ العقد يُبرم مباشرة بين العميلة والمصوّرة.": [
1441: "سياسة الإلغاء — Memoria · ميموريا": [
1444: "العربون والاشتراك غير قابلين للاسترداد. كيف يعمل الإلغاء على منصّة ميموريا ومن المسؤول عن ماذا.": [
1447: "سياسة الإلغاء والاسترداد — Memoria": [
1456: "ميموريا منصّة تنظيمية لإدارة الحجوزات.": [
1513: "كيف يعمل الموقع — رحلة العميل والمصور | Memoria": [
1519: "كيف يعمل Memoria — رحلتك خطوة بخطوة": [
1663: "لماذا Memoria أفضل؟": [
1791: "مصوّرات أعراس في الأردن — ابحثي واحجزي | Memoria": [
2051: "تسجيل الدخول — Memoria · ميموريا": [
2054: "سجّلي الدخول إلى حساب Memoria لإدارة حجوزاتك، ملفك الشخصي، وباقاتك.": [
2166: "استعادة كلمة المرور | Memoria": [
2217: "إعادة تعيين كلمة المرور | Memoria": [
2262: "استرداد رابط الحجز — Memoria": [
2265: "استعيدي روابط تتبع حجوزاتك على منصة ميموريا.": [
2304: "حمّل تطبيق Memoria على هاتفك | Memoria": [
2307: "ثبّتي Memoria كتطبيق على هاتفك (iPhone أو Android) أو على سطح المكتب — يعمل دون متجر، بسرعة، ومع أيقونة على الشاشة الرئيسية.": [
2319: "ثبّت تطبيق Memoria": [
2337: "ستظهر أيقونة Memoria على شاشتك الرئيسية": [
2361: "يمكنك الآن فتح Memoria مباشرة من شاشتك الرئيسية": [
2415: "انضمي كمصوّرة — Memoria · ميموريا": [
2418: "انضمي إلى Memoria وابدئي استقبال حجوزات مباشرة من العميلات، بأدوات إدارة كاملة وبدون عمولة.": [
2421: "انضمي كمصوّرة — Memoria": [
2478: "انضمي إلى ميموريا": [
2602: "حجوزات مكتملة عبر ميموريا": [
2613: "على ميموريا منذ": [
2652: "«الأفضل» يُحسب من بيانات المصوّرات على ميموريا فقط. التقييمات والحجوزات المكتملة تأتي من حجوزات حقيقية عبر المنصّة.": [
2691: "تمت مراجعة الملف يدوياً من فريق ميموريا": [
2694: "مصوّرة موثّقة من ميموريا": [
2700: "مصوّرة موثّقة من ميموريا، اضغطي لمعرفة المعنى": [
2772: "استعرض أعمال وأسعار المصوّرة {0}{1} واحجز موعدك مباشرة عبر Memoria.": [
2775: "{0} — مصوّرة أعراس{1} | Memoria": [
2802: "Memoria · العدد ٠١": [
2913: "مرحباً! شاهدت أعمالك الرائعة على منصة Memoria، وأود الاستفسار عن باقات التصوير لحفل زفافي..": [
3029: "رابط تتبّع حجزي في ميموريا:": [
3306: "مرحباً! شاهدت أعمالك على ميموريا وأود الاستفسار عن باقات التصوير لحفل زفافي.": [
3312: "عرض السعر — ميموريا": [
3381: "توقيع عقد التصوير — ميموريا": [
3461: "متابعة حجزك — ميموريا": [
3952: "قيّمي تجربتك — ميموريا": [
4128: "رمز تأكيد حجزي في ميموريا: {0}": [
4587: "نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمكِ، وتظهر حجوزاتكِ فوراً في تقويم «Memoria» على هاتفكِ. لا نرى عناوين مواعيدكِ — فقط
4590: "نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمك، وتظهر حجوزاتك فوراً في تقويم «Memoria» على هاتفك. لا نرى عناوين مواعيدك — فقط إن 
4866: "أهلاً بكِ في Memoria 👋": [
4869: "أهلاً بك في Memoria 👋": [
5111: "حين تجدين مصوّرة تعجبك، ابحثي عن ما يؤكد أنها جادة وملتزمة. على Memoria تحمل بعض الملفات شارة «موثّقة» بعد مراجعة فريقنا للهوية والأعمال، والتقييمات لا تُكتب إ
5123: "ويفضّل أن تتفقا على كل شيء كتابةً، من التاريخ والساعات إلى طريقة التسليم. على Memoria يُوثّق هذا في الحجز نفسه، وتتابعين مراحله من صفحة خاصة بك.": [
5204: "حين تتحدثين عن المال، اطلبي الوضوح من البداية. اسألي عن مبلغ العربون ومتى يُدفع، وماذا يحدث إن غيّرتِ التاريخ أو أُلغي الحجز. اقرئي سياسة الإلغاء المكتوبة، فهي
5222: "بعد أن تتفقا، تأكدي أن النقاط الأساسية مكتوبة: التاريخ، الساعات، الموقع، عدد الصور، موعد التسليم، العربون وبقية المبلغ. إن كنتِ تحجزين عبر Memoria فإن صفحة الت
5315: "ضعي الباقات التي تعجبك بجانب بعضها واكتبي لكل واحدة: الساعات، الفريق، الصور، التسليم، الرسوم الإضافية. حين تتساوى هذه البنود يصبح الفرق في السعر مفهوماً. على M
5570: "الحجز عبر Memoria يمرّ بخطوات واضحة: تتصفّحين ملفات مصوّرات منشورة بعد مراجعة بياناتها، وتقارنين الباقات وأعمال كل مصوّرة، ثم ترسلين طلب الحجز بتاريخك. بعد موا
5573: "كيف أحجز مصوّرة أعراس في {0} عبر Memoria؟": [
5597: "مصورة أعراس في عمّان — احجزي مصوّرة موثّقة | Memoria": [
5612: "في المدن الكبيرة يزداد الطلب على بعض التواريخ، خصوصاً أيام نهاية الأسبوع في مواسم الأعراس. تقويم كل مصوّرة على Memoria يُظهر الأيام المحجوزة، فتعرفين من البداي
5615: "مصورة أعراس في إربد — احجزي مصوّرة موثّقة | Memoria": [
5633: "مصورة أعراس في الزرقاء — احجزي مصوّرة موثّقة | Memoria": [
5651: "مصورة أعراس في العقبة — احجزي مصوّرة موثّقة | Memoria": [
5669: "مصورة أعراس في السلط — احجزي مصوّرة موثّقة | Memoria": [
5687: "مصورة أعراس في مادبا — احجزي مصوّرة موثّقة | Memoria": [
5705: "مصورة أعراس في جرش — احجزي مصوّرة موثّقة | Memoria": [
5753: "مصورة حفل زفاف في الأردن — احجزي مصوّرة موثّقة | Memoria": [
5777: "مصورة خطوبة في الأردن — احجزي مصوّرة موثّقة | Memoria": [
5801: "مصورة ليلة الحنّاء في الأردن — احجزي مصوّرة موثّقة | Memoria": [
5825: "مصورة تخرّج في الأردن — احجزي مصوّرة موثّقة | Memoria": [
5849: "مصورة مولود جديد في الأردن — احجزي مصوّرة موثّقة | Memoria": [
6311: "اشتراك Memoria — {0} {1}": [
6421: "<div dir=\"rtl\" style=\"font-family: sans-serif;\"> <h2>مرحباً {0}،</h2> <p>طلبتم استرداد روابط التتبع لحجوزاتكم النشطة على منصة Memoria.</p> <p>إليكم روابط ا
6424: "روابط تتبع حجوزاتك — Memoria": [
6664: "مدوّنة Memoria — نصائح لتصوير الأعراس والمناسبات": [
6670: "اهربي يا عروس — Memoria · ميموريا": [
6673: "لعبة ميموريا: اهربي من العريس واكسري رقمك القياسي، ثم شاركي نتيجتك.": [
6676: "اهربي يا عروس — Memoria": [
6839: "mailto:{0}?subject=ردّ على رسالتك — Memoria": [
8444: "نقرة واحدة واختاري تطبيقكِ. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.": [
8447: "نقرة واحدة واختر تطبيقك. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.": [
9789: "العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلكِ مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل.": [
9792: "العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلك مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل.": [
9795: "التوثيق يعني أن فريق ميموريا راجع ملفكِ وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة": [
9798: "التوثيق يعني أن فريق ميموريا راجع ملفك وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة": [
9876: "عروض وأخبار ميموريا": [
9992: "سنتي {0} مع Memoria": [
10025: "مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّلي من هنا وجرّبيه مجاناً ١٤ يوماً: {0}": [
10028: "مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّل من هنا وجرّبه مجاناً ١٤ يوماً: {0}": [
10214: "اشتراكك فعّال ✓ شكراً لثقتك بميموريا": [
10370: "بنفس بريدك المسجّل في Memoria.": [
10445: "إعداد حسابك — Memoria": [
10457: "مرحباً بكِ في Memoria": [
10460: "مرحباً بك في Memoria": [
```

## scripts/i18n/leftovers.txt

```
213: src/content/seo.ts:29 [module-level] "الحجز عبر Memoria يمرّ بخطوات واضحة: تتصفّحين ملفات مصوّرات منشورة بع
215: src/content/seo.ts:54 [module-level] "مصورة أعراس في عمّان — احجزي مصوّرة موثّقة | Memoria"
223: src/content/seo.ts:67 [module-level] "مصورة أعراس في إربد — احجزي مصوّرة موثّقة | Memoria"
231: src/content/seo.ts:80 [module-level] "مصورة أعراس في الزرقاء — احجزي مصوّرة موثّقة | Memoria"
239: src/content/seo.ts:93 [module-level] "مصورة أعراس في العقبة — احجزي مصوّرة موثّقة | Memoria"
247: src/content/seo.ts:106 [module-level] "مصورة أعراس في السلط — احجزي مصوّرة موثّقة | Memoria"
255: src/content/seo.ts:119 [module-level] "مصورة أعراس في مادبا — احجزي مصوّرة موثّقة | Memoria"
263: src/content/seo.ts:132 [module-level] "مصورة أعراس في جرش — احجزي مصوّرة موثّقة | Memoria"
272: src/content/seo.ts:168 [module-level] "مصورة حفل زفاف في الأردن — احجزي مصوّرة موثّقة | Memoria"
281: src/content/seo.ts:182 [module-level] "مصورة خطوبة في الأردن — احجزي مصوّرة موثّقة | Memoria"
290: src/content/seo.ts:196 [module-level] "مصورة ليلة الحنّاء في الأردن — احجزي مصوّرة موثّقة | Memoria"
299: src/content/seo.ts:210 [module-level] "مصورة تخرّج في الأردن — احجزي مصوّرة موثّقة | Memoria"
308: src/content/seo.ts:224 [module-level] "مصورة مولود جديد في الأردن — احجزي مصوّرة موثّقة | Memoria"
371: src/routes/blog.index.tsx:8 [module-level] "مدوّنة Memoria — نصائح لتصوير الأعراس والمناسبات"
```

## scripts/i18n/translate.mjs

```
18: const SYSTEM = `You translate the Arabic UI of "Memoria", a Jordanian platform for booking wedding and event photographers, into English.
21: Glossary: ميموريا = Memoria; مصوّرة/مصورة/مصوّر = photographer; العروس/عروس = bride; العميلة = client; عربون = deposit; حجز = booking; باقة = package; لوحة التح
```

## src/components/ClientTour.tsx

```
124: window.addEventListener("memoria-role-gate", on);
125: return () => window.removeEventListener("memoria-role-gate", on);
```

## src/components/CommandPalette.tsx

```
12: export const OPEN_COMMAND_EVENT = "memoria:open-command";
```

## src/components/NotificationPermission.tsx

```
22: if (localStorage.getItem("memoria_notif_dismissed") === "1") {
44: localStorage.setItem("memoria_notif_dismissed", "1");
```

## src/components/OnboardingWizard.tsx

```
11: { icon: Sparkles, title: g(t("أهلاً بكِ في Memoria 👋"), t("أهلاً بك في Memoria 👋")), desc: g(t("هذه الجولة السريعة تأخذ دقيقتين لتعرفي من أين تبدئين. يمكنك تخ
```

## src/components/VerifiedBadge.tsx

```
11: "تمت مراجعة الملف يدوياً من فريق ميموريا",
18: <span className={`inline-flex shrink-0 ${className}`} title={t("مصوّرة موثّقة من ميموريا")} role="img" aria-label={t("مصوّرة موثّقة")}>
28: aria-label={t("مصوّرة موثّقة من ميموريا، اضغطي لمعرفة المعنى")}
32: {t("مصوّرة موثّقة من ميموريا")}
```

## src/components/VerifyBookingPanel.tsx

```
35: ? `https://wa.me/${verify.whatsapp_number}?text=${encodeURIComponent(t("رمز تأكيد حجزي في ميموريا: {0}", [verify.whatsapp_code]))}`
```

## src/components/dashboard/GoogleConnectCard.tsx

```
11: // يقرأ أوقات الانشغال فقط، ويكتب الحجوزات فوراً في تقويم «Memoria» منفصل.
91: t("نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمكِ، وتظهر حجوزاتكِ فوراً في تقويم «Memoria» على هاتفكِ. لا نرى عناوين مواعيدكِ — ف
92: t("نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمك، وتظهر حجوزاتك فوراً في تقويم «Memoria» على هاتفك. لا نرى عناوين مواعيدك — فقط إ
```

## src/components/dashboard/NotifyChannelsCard.tsx

```
118: <div>{t("بتفتح محادثة «Memoria ميموريا» — اضغطي زر")}{" "}<b>START</b>{" "}{t("(أو «ابدأ») أسفل الشاشة")}</div>
```

## src/components/dashboard/SubscriptionGuard.tsx

```
26: const DISMISS_KEY = "memoria.subguard.dismissed";
```

## src/components/dashboard/ToolIndex.tsx

```
20: const VISITED_KEY = "memoria:visited-tools";
```

## src/components/search/CompareMode.tsx

```
52: { label: "حجوزات مكتملة عبر ميموريا", score: (d) => d.completed_count || null, better: "high", cell: (d) => d.completed_count || "—" },
60: { label: "على ميموريا منذ",
175: {t("«الأفضل» يُحسب من بيانات المصوّرات على ميموريا فقط. التقييمات والحجوزات المكتملة تأتي من حجوزات حقيقية عبر المنصّة.")}
```

## src/components/site/FirstVisitIntro.tsx

```
62: const LETTERS = "MEMORIA".split("");
223: {tr("ميموريا")}
```

## src/components/site/Footer.tsx

```
18: <div className="font-serif text-xl mb-2">Memoria <span className="text-muted-foreground text-base">{t("· ميموريا")}</span></div>
26: <li><Link to="/for-clients" className="inline-block py-1.5 hover:text-gold">{t("لماذا ميموريا")}</Link></li>
67: <span>{t("© {0} Memoria · ميموريا. صُمِّم بعناية في عمّان.", [new Date().getFullYear()])}</span>
```

## src/components/site/Header.tsx

```
42: const r = localStorage.getItem("memoria_visitor_role") as "client" | "photographer" | "guest" | null;
147: <div className="font-serif text-lg tracking-wide">Memoria <span className="text-muted-foreground text-sm">{t("ميموريا")}</span></div>
172: try { localStorage.setItem("memoria_visitor_role", "photographer"); } catch { /* ignore */ }
190: try { localStorage.setItem("memoria_visitor_role", "client"); } catch { /* ignore */ }
276: try { localStorage.setItem("memoria_visitor_role", newRole); } catch { /* ignore */ }
```

## src/components/site/MobileTabBar.tsx

```
18: const r = localStorage.getItem("memoria_visitor_role") as "client" | "photographer" | "guest" | null;
```

## src/components/site/PwaInstallPrompt.tsx

```
82: {t("أضيفي ميموريا لهاتفك")}
```

## src/components/site/SeoLanding.tsx

```
45: provider: { "@type": "Organization", name: "Memoria", url: crumbs[0]?.url },
80: <h2 className="font-serif text-2xl mt-10 mb-3">{t("كيف يتم الحجز على Memoria")}</h2>
```

## src/content/blog.ts

```
51: "حين تجدين مصوّرة تعجبك، ابحثي عن ما يؤكد أنها جادة وملتزمة. على Memoria تحمل بعض الملفات شارة «موثّقة» بعد مراجعة فريقنا للهوية والأعمال، والتقييمات لا تُكتب إ
59: "ويفضّل أن تتفقا على كل شيء كتابةً، من التاريخ والساعات إلى طريقة التسليم. على Memoria يُوثّق هذا في الحجز نفسه، وتتابعين مراحله من صفحة خاصة بك.",
120: "حين تتحدثين عن المال، اطلبي الوضوح من البداية. اسألي عن مبلغ العربون ومتى يُدفع، وماذا يحدث إن غيّرتِ التاريخ أو أُلغي الحجز. اقرئي سياسة الإلغاء المكتوبة، فهي
134: "بعد أن تتفقا، تأكدي أن النقاط الأساسية مكتوبة: التاريخ، الساعات، الموقع، عدد الصور، موعد التسليم، العربون وبقية المبلغ. إن كنتِ تحجزين عبر Memoria فإن صفحة الت
213: "ضعي الباقات التي تعجبك بجانب بعضها واكتبي لكل واحدة: الساعات، الفريق، الصور، التسليم، الرسوم الإضافية. حين تتساوى هذه البنود يصبح الفرق في السعر مفهوماً. على M
```

## src/content/seo.ts

```
3: export const SITE_URL = "https://memoria-production.ahmad000haddad.workers.dev";
30: "الحجز عبر Memoria يمرّ بخطوات واضحة: تتصفّحين ملفات مصوّرات منشورة بعد مراجعة بياناتها، وتقارنين الباقات وأعمال كل مصوّرة، ثم ترسلين طلب الحجز بتاريخك. بعد موا
34: q: t("كيف أحجز مصوّرة أعراس في {0} عبر Memoria؟", [cityName]),
55: title: "مصورة أعراس في عمّان — احجزي مصوّرة موثّقة | Memoria",
61: "في المدن الكبيرة يزداد الطلب على بعض التواريخ، خصوصاً أيام نهاية الأسبوع في مواسم الأعراس. تقويم كل مصوّرة على Memoria يُظهر الأيام المحجوزة، فتعرفين من البداي
68: title: "مصورة أعراس في إربد — احجزي مصوّرة موثّقة | Memoria",
81: title: "مصورة أعراس في الزرقاء — احجزي مصوّرة موثّقة | Memoria",
94: title: "مصورة أعراس في العقبة — احجزي مصوّرة موثّقة | Memoria",
107: title: "مصورة أعراس في السلط — احجزي مصوّرة موثّقة | Memoria",
120: title: "مصورة أعراس في مادبا — احجزي مصوّرة موثّقة | Memoria",
133: title: "مصورة أعراس في جرش — احجزي مصوّرة موثّقة | Memoria",
169: title: "مصورة حفل زفاف في الأردن — احجزي مصوّرة موثّقة | Memoria",
183: title: "مصورة خطوبة في الأردن — احجزي مصوّرة موثّقة | Memoria",
197: title: "مصورة ليلة الحنّاء في الأردن — احجزي مصوّرة موثّقة | Memoria",
211: title: "مصورة تخرّج في الأردن — احجزي مصوّرة موثّقة | Memoria",
225: title: "مصورة مولود جديد في الأردن — احجزي مصوّرة موثّقة | Memoria",
```

## src/hooks/use-dismissed.ts

```
8: const storageKey = `memoria.dismissed.${key}`;
```

## src/hooks/use-gender.tsx

```
17: const LS_KEY = "memoria.gender";
```

## src/i18n/en.json

```
12: "Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان": "Memoria — Safeguarding Your Day's Memories",
13: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب.": "Memoria: Jordanian platform for booki
14: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس.": "Memoria: Jordanian platform for booking wedding photographers.",
35: "ميموريا": "",
37: "· ميموريا": "· Memoria",
41: "لماذا ميموريا": "Why Memoria?",
66: "© {0} Memoria · ميموريا. صُمِّم بعناية في عمّان.": "© {0} Memoria · Designed with care in Amman.",
72: "ذاكرة يومكِ · الأردن": "Memoria · Jordan",
106: "أضيفي ميموريا لهاتفك": "Add Memoria to Phone",
114: "كيف يتم الحجز على Memoria": "How Booking Works on Memoria",
184: "ميزة التوفر الفوري خلتني أقدر أرتب أموري خلال ساعات، بدل ما أنتظر أيام عشان أسمع رد المصورات. الصور وصلتني أسرع من المتوقع، شكراً ميموريا.": "The instant avail
189: "من نحن — Memoria · ميموريا": "About Us — Memoria · Mymoría",
190: "ميموريا منصّة أردنية متخصّصة في تنظيم حجوزات مصوّرات الأعراس. تعرّفي على قصّتنا، رؤيتنا، والكيان الذي يقف خلف المنصّة.": "Memoria is a Jordanian platform speci
192: "ميموريا منصّة أردنية متخصّصة، أُسّست لتنظيم رحلة حجز مصوّرات الأعراس من البحث حتى التسليم — بعيداً عن فوضى الرسائل، الأسعار الغامضة، والمواعيد المتداخلة.": "Me
203: "الباقات والأسعار — Memoria · ميموريا": "Packages & Pricing — Memoria · Mymoría",
204: "باقات اشتراك مرنة للمصوّرات على منصّة ميموريا — بدون عمولة على الحجوزات، وأدوات كاملة لإدارة الأعمال.": "Flexible subscription packages for photographers on th
205: "الباقات والأسعار — Memoria": "Packages & Pricing — Memoria",
238: "إجابات لأكثر الأسئلة شيوعاً حول الحجز، الدفع، الإلغاء، التقييمات، والاشتراكات على منصّة ميموريا.": "Answers to the most common questions about booking, payment
239: "الأسئلة الشائعة — Memoria": "FAQ — Memoria",
267: "للعملاء — لماذا Memoria؟": "Why Memoria?",
296: "Memoria منصّة متخصّصة في مصوّرات الأعراس في الأردن. اخترنا لكِ أفضل المصوّرات، تحقّقنا منهنّ، ووفّرنا أدوات حماية وتتبّع لكل خطوة من خطوات حجزكِ.": "Memoria sp
300: "١٢ سبباً لاختيار Memoria": "12 Reasons to Choose Memoria",
339: "Memoria ليست فقط منصّة عرض — بل نظام إدارة متكامل صُمّم خصيصاً لمصوّرات الأعراس في الأردن. حجوزات، عقود، عرابين، تسليم صور، تقارير، وقوالب واتساب — كل ذلك بالع
348: "تواصلي معنا — Memoria · ميموريا": "Contact Us — Memoria · MIMORIA",
349: "فريق ميموريا هنا للمساعدة في الحجوزات، الاشتراكات، والاستفسارات. أرسلي رسالتك وسنردّ خلال 24 ساعة.": "The Memoria team is here to assist with bookings, subscri
353: "[ميموريا] رسالة من {0}": "[Memoria] Message from {0}",
374: "سياسة الخصوصية — Memoria": "Privacy Policy — Memoria",
375: "كيف نجمع بياناتك ونستخدمها ونحميها على منصة Memoria لحجوزات مصوّرات الأعراس في الأردن.": "How we collect, use, and protect your data on the Memoria platform fo
396: "الشروط والأحكام — Memoria": "Terms of Service — Memoria",
398: "Memoria منصة تنظيمية تربط العميلات بمصوّرات الأعراس في الأردن. المنصة ليست طرفاً في عقد التصوير نفسه؛ العقد يُبرم مباشرة بين العميلة والمصوّرة.": "Memoria conn
404: "تلتزم المصوّرة بمدة التسليم المتفق عليها في العقد. في حال التأخير غير المبرَّر يمكن تقديم شكوى، وللمنصة حق تعليق ملف المصوّرة.": "Photographers must adhere to 
412: "يحق للمنصة تحديث هذه الشروط في أي وقت، وسيتم إخطار المستخدمين بالتغييرات الجوهرية.": "Memoria reserves the right to update these terms at any time and will not
415: "سياسة الإلغاء — Memoria · ميموريا": "Cancellation Policy — Memoria · Cancellation policy details on how it works and who’s responsible for what.",
416: "العربون والاشتراك غير قابلين للاسترداد. كيف يعمل الإلغاء على منصّة ميموريا ومن المسؤول عن ماذا.": "Deposit & Subscription Non-Refundable. How cancellation work
419: "ميموريا منصّة تنظيمية لإدارة الحجوزات.": "Memoria is a booking management platform.",
427: "إذا ألغت المصوّرة حجزاً مؤكَّداً، فإعادة العربون مسؤوليتها المباشرة تجاهكِ لأن المبلغ في حسابها. دور المنصّة: توثيق الحجز وإثبات التحويل وسجلّ الرسائل، والتواص
482: "لماذا Memoria أفضل؟": "Why Memoria is Better?",
599: "سجّلي الدخول إلى حساب Memoria لإدارة حجوزاتك، ملفك الشخصي، وباقاتك.": "Log into your Memoria account to manage bookings, profile, and packages.",
632: "استعادة كلمة المرور | Memoria": "Reset Password | Memoria",
647: "إعادة تعيين كلمة المرور | Memoria": "Reset Password | Memoria",
662: "استرداد رابط الحجز — Memoria": "Booking Recovery — Memoria",
663: "استعيدي روابط تتبع حجوزاتك على منصة ميموريا.": "Retrieve your booking tracking links on the Memoria platform.",
676: "حمّل تطبيق Memoria على هاتفك | Memoria": "Download the Memoria app on your phone | Memoria",
677: "ثبّتي Memoria كتطبيق على هاتفك (iPhone أو Android) أو على سطح المكتب — يعمل دون متجر، بسرعة، ومع أيقونة على الشاشة الرئيسية.": "Install Memoria as an app on yo
681: "ثبّت تطبيق Memoria": "Install Memoria App",
687: "ستظهر أيقونة Memoria على شاشتك الرئيسية": "Memoria will appear on your home screen",
695: "يمكنك الآن فتح Memoria مباشرة من شاشتك الرئيسية": "Now, you can launch Memoria directly from your home screen",
713: "انضمي كمصوّرة — Memoria · ميموريا": "Join as Photographer — Memoria · Join as Photographer",
714: "انضمي إلى Memoria وابدئي استقبال حجوزات مباشرة من العميلات، بأدوات إدارة كاملة وبدون عمولة.": "Join Memoria and start receiving direct bookings from clients wi
715: "انضمي كمصوّرة — Memoria": "Join as Photographer — Memoria",
734: "انضمي إلى ميموريا": "Join Memoria",
770: "حجوزات مكتملة عبر ميموريا": "Bookings Completed via Memoria",
773: "على ميموريا منذ": "On Memoria Since",
785: "«الأفضل» يُحسب من بيانات المصوّرات على ميموريا فقط. التقييمات والحجوزات المكتملة تأتي من حجوزات حقيقية عبر المنصّة.": "'Best Value' is calculated from data of 
798: "تمت مراجعة الملف يدوياً من فريق ميموريا": "Profile reviewed manually by Memoria team",
799: "مصوّرة موثّقة من ميموريا": "Memoria Verified Photographer",
801: "مصوّرة موثّقة من ميموريا، اضغطي لمعرفة المعنى": "Memoria Verified Photographer, learn more",
809: "Memoria · ميموريا — تصوير المناسبات": "Memoria — Event Photography",
810: "Memoria · ميموريا": "Memoria",
817: "الأسئلة الشائعة — Memoria · ميموريا": "FAQ — Memoria",
819: "للمصوّرات — انضمي إلى Memoria": "Photographers — Join Memoria",
820: "سياسة الإلغاء والاسترداد — Memoria": "Cancellation and Refund Policy — Memoria",
823: "تسجيل الدخول — Memoria · ميموريا": "Sign In — Memoria",
840: "استعرض أعمال وأسعار المصوّرة {0}{1} واحجز موعدك مباشرة عبر Memoria.": "Explore {0}'s work and prices{1}, and book a session directly through Memoria.",
841: "{0} — مصوّرة أعراس{1} | Memoria": "{0} — Wedding Photographer{1} | Memoria",
849: "Memoria · العدد ٠١": "Memoria · Issue 01",
882: "مرحباً! شاهدت أعمالك الرائعة على منصة Memoria، وأود الاستفسار عن باقات التصوير لحفل زفافي..": "Hello! I saw your amazing work on Memoria and would like to inqu
999: "مرحباً! شاهدت أعمالك على ميموريا وأود الاستفسار عن باقات التصوير لحفل زفافي.": "Hello! I saw your work on Memoria and would like to inquire about photography p
1001: "عرض السعر — ميموريا": "Price Quote — Memoria",
1021: "توقيع عقد التصوير — ميموريا": "Sign Your Photography Contract — Memoria",
1046: "متابعة حجزك — ميموريا": "Continue Your Booking — Memoria",
1199: "قيّمي تجربتك — ميموريا": "Rate Your Experience — Memoria",
1255: "رمز تأكيد حجزي في ميموريا: {0}": "Your booking confirmation code in Memoria: {0}",
1284: "Memoria · ميموريا — منصّة تصوير المناسبات في الأردن": "Memoria — event photography platform in Jordan",
1285: "قصّة ميموريا: لماذا بدأنا، وما الذي نؤمن به.": "Memoria's story: Why we started and what we believe in",
1286: "للعملاء — لماذا Memoria؟ | حجز مصوّرات الأعراس بثقة": "For clients — why Memoria? | Book wedding photographers with confidence",
1287: "للمصوّرات — انضمي إلى Memoria | إدارة كاملة لأعمال التصوير": "For photographers — join Memoria | full management of your photography business",
1290: "شروط استخدام منصة Memoria لحجوزات مصوّرات الأعراس في الأردن: الحجز، العربون، الإلغاء، والتسليم.": "Terms of Use for the Memoria Platform: Bookings, Deposits, C
1291: "كيف يعمل الموقع — رحلة العميل والمصور | Memoria": "How it works — the client's journey | Memoria",
1292: "كيف يعمل Memoria — رحلتك خطوة بخطوة": "How Memoria works — your step-by-Step guide",
1296: "مصوّرات أعراس في الأردن — ابحثي واحجزي | Memoria": "Wedding Photographers in Jordan — Search and Book | Memoria",
1299: "رابط تتبّع حجزي في ميموريا:": "My booking tracking link on Memoria:",
1403: "نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمكِ، وتظهر حجوزاتكِ فوراً في تقويم «Memoria» على هاتفكِ. لا نرى عناوين مواعيدكِ — فقط
1404: "نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمك، وتظهر حجوزاتك فوراً في تقويم «Memoria» على هاتفك. لا نرى عناوين مواعيدك — فقط إن 
1491: "أهلاً بكِ في Memoria 👋": "Welcome to Memoria 👋",
1492: "أهلاً بك في Memoria 👋": "Welcome to Memoria 👋",
1568: "حين تجدين مصوّرة تعجبك، ابحثي عن ما يؤكد أنها جادة وملتزمة. على Memoria تحمل بعض الملفات شارة «موثّقة» بعد مراجعة فريقنا للهوية والأعمال، والتقييمات لا تُكتب إ
1572: "ويفضّل أن تتفقا على كل شيء كتابةً، من التاريخ والساعات إلى طريقة التسليم. على Memoria يُوثّق هذا في الحجز نفسه، وتتابعين مراحله من صفحة خاصة بك.": "It’s best t
1599: "حين تتحدثين عن المال، اطلبي الوضوح من البداية. اسألي عن مبلغ العربون ومتى يُدفع، وماذا يحدث إن غيّرتِ التاريخ أو أُلغي الحجز. اقرئي سياسة الإلغاء المكتوبة، فهي
1605: "بعد أن تتفقا، تأكدي أن النقاط الأساسية مكتوبة: التاريخ، الساعات، الموقع، عدد الصور، موعد التسليم، العربون وبقية المبلغ. إن كنتِ تحجزين عبر Memoria فإن صفحة الت
1635: "ضعي الباقات التي تعجبك بجانب بعضها واكتبي لكل واحدة: الساعات، الفريق، الصور، التسليم، الرسوم الإضافية. حين تتساوى هذه البنود يصبح الفرق في السعر مفهوماً. على M
1718: "الحجز عبر Memoria يمرّ بخطوات واضحة: تتصفّحين ملفات مصوّرات منشورة بعد مراجعة بياناتها، وتقارنين الباقات وأعمال كل مصوّرة، ثم ترسلين طلب الحجز بتاريخك. بعد موا
1719: "كيف أحجز مصوّرة أعراس في {0} عبر Memoria؟": "How do I book a wedding photographer in {0} through Memoria?",
1731: "في المدن الكبيرة يزداد الطلب على بعض التواريخ، خصوصاً أيام نهاية الأسبوع في مواسم الأعراس. تقويم كل مصوّرة على Memoria يُظهر الأيام المحجوزة، فتعرفين من البداي
1944: "اشتراك Memoria — {0} {1}": "Memoria Subscription — {0} {1}",
1980: "<div dir=\"rtl\" style=\"font-family: sans-serif;\"> <h2>مرحباً {0}،</h2> <p>طلبتم استرداد روابط التتبع لحجوزاتكم النشطة على منصة Memoria.</p> <p>إليكم روابط ا
1981: "روابط تتبع حجوزاتك — Memoria": "Your Booking Tracking Links — Memoria",
2060: "لعبة ميموريا: اهربي من العريس واكسري رقمك القياسي، ثم شاركي نتيجتك.": "Memoria Game: Run from the groom and break your high score, then share your result.",
2061: "اهربي يا عروس — Memoria": "Run, Bride — Memoria",
2110: "mailto:{0}?subject=ردّ على رسالتك — Memoria": "mailto:{0}?subject=Replying to Your Message — Memoria",
2420: "نقرة واحدة واختاري تطبيقكِ. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.": "One tap and choose your app. Bookings and blocked days appear
2421: "نقرة واحدة واختر تطبيقك. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.": "One tap and select your app. Bookings and blocked days appear as
2605: "رابطه في بايو إنستجرام لتبدأ العرائس بالحجز مباشرة.": "Link Memoria in your Instagram bio for brides to book directly.",
2850: "العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلكِ مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل.": "The deposit on all Memoria bookings is 
2851: "العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلك مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل.": "The deposit on all Memoria bookings is n
2852: "التوثيق يعني أن فريق ميموريا راجع ملفكِ وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة": "Verification means that the Memoria team reviewed your pr
2853: "التوثيق يعني أن فريق ميموريا راجع ملفك وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة": "Verification means that the Memoria team reviewed your pro
2879: "عروض وأخبار ميموريا": "Memoria Offers & News",
2917: "سنتي {0} مع Memoria": "Year {0} with Memoria",
2927: "مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّلي من هنا وجرّبيه مجاناً ١٤ يوماً: {0}": "Hi! I use Memoria
2928: "مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّل من هنا وجرّبه مجاناً ١٤ يوماً: {0}": "Hi! I use Memoria t
2990: "اشتراكك فعّال ✓ شكراً لثقتك بميموريا": "Your subscription is active ✓ Thank you for choosing Memoria",
3040: "بنفس بريدك المسجّل في Memoria.": "With the email registered in Memoria.",
3086: "مصورة أعراس في عمّان — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Amman — Book a Verified Photographer | Memoria",
3087: "مصورة أعراس في إربد — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Irbid — Book a Verified Photographer | Memoria",
3088: "مصورة أعراس في الزرقاء — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Zarqa — Book a Verified Photographer | Memoria",
3089: "مصورة أعراس في العقبة — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Aqaba — Book a Verified Photographer | Memoria",
3090: "مصورة أعراس في السلط — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Salt — Book a Verified Photographer | Memoria",
3091: "مصورة أعراس في مادبا — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Madaba — Book a Verified Photographer | Memoria",
3092: "مصورة أعراس في جرش — احجزي مصوّرة موثّقة | Memoria": "Wedding Photographers in Jerash — Book a Verified Photographer | Memoria",
3093: "مصورة حفل زفاف في الأردن — احجزي مصوّرة موثّقة | Memoria": "Wedding Photography in Jordan — Book a Verified Photographer | Memoria",
3094: "مصورة خطوبة في الأردن — احجزي مصوّرة موثّقة | Memoria": "Engagement Photography in Jordan — Book a Verified Photographer | Memoria",
3095: "مصورة ليلة الحنّاء في الأردن — احجزي مصوّرة موثّقة | Memoria": "Henna Night Photography in Jordan — Book a Verified Photographer | Memoria",
3096: "مصورة تخرّج في الأردن — احجزي مصوّرة موثّقة | Memoria": "Graduation Photography in Jordan — Book a Verified Photographer | Memoria",
3097: "مصورة مولود جديد في الأردن — احجزي مصوّرة موثّقة | Memoria": "Newborn Photography in Jordan — Book a Verified Photographer | Memoria",
3098: "مدوّنة Memoria — نصائح لتصوير الأعراس والمناسبات": "Memoria Blog — Wedding and Event Photography Tips",
3099: "اهربي يا عروس — Memoria · ميموريا": "Bride's Corner — Memoria · Memoria",
3109: "إعداد حسابك — Memoria": "Set Up Your Account — Memoria",
3113: "مرحباً بكِ في Memoria": "Welcome to Memoria, Bride!",
3114: "مرحباً بك في Memoria": "Welcome to Memoria",
```

## src/i18n/index.ts

```
12: * The language comes from ?lang= or the memoria_lang cookie, so the server
18: export const LANG_COOKIE = "memoria_lang";
```

## src/lib/admin-alerts.functions.ts

```
36: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/booking.functions.ts

```
582: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/cancellation.functions.ts

```
22: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/email.functions.ts

```
47: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
58: <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;">Memoria</div>
69: رسالة آلية من Memoria — لا داعي للرد مباشرة.
```

## src/lib/email.server.ts

```
92: <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;letter-spacing:0.5px;">Memoria</div>
103: هذه رسالة آلية من Memoria — لا داعي للرد عليها مباشرة.
118: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
213: <p>ينتهي اشتراكك في Memoria خلال <strong>${args.days_left}</strong> أيام.</p>
259: <p>شكراً لاستخدامك Memoria.</p>`);
```

## src/lib/google-calendar.server.ts

```
5: // - الكتابة: تقويم ثانوي «Memoria» ننشئه نحن (calendar.app.created)، نكتب فيه
25: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
117: /** يحفظ الربط بعد الرجوع من Google وينشئ تقويم «Memoria». */
126: body: JSON.stringify({ summary: "Memoria — الحجوزات", timeZone: TZ, description: "حجوزات ميموريا (تُحدَّث تلقائياً)" }),
132: memoria_calendar_id: cal.id,
177: // ---------- الكتابة: الحجوزات إلى تقويم «Memoria» ----------
206: description: `حجز ميموريا\n${appUrl()}/dashboard/bookings/${b.id}`,
231: const pushed = await pushBookings(userId, token, link.memoria_calendar_id);
245: return { pushed: await pushBookings(photographerId, token, full.memoria_calendar_id, [bookingId]) };
```

## src/lib/intro.ts

```
17: export const INTRO_COOKIE = "memoria_intro_seen";
```

## src/lib/negotiation.functions.ts

```
64: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/payments.functions.ts

```
28: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
154: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
161: description: t("اشتراك Memoria — {0} {1}", [data.months, data.months === 1 ? "شهر" : "أشهر"]),
```

## src/lib/payments.server.ts

```
347: descriptor: "Memoria Subscription",
468: "line_items[0][price_data][product_data][name]": `اشتراك Memoria — ${args.months} ${args.months === 1 ? "شهر" : "أشهر"}`,
```

## src/lib/paytabs.functions.ts

```
60: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
66: description: `Memoria ${plan.name} — ${plan.months === 12 ? t("اشتراك سنوي") : t("اشتراك شهري")}`,
69: customer: { name: (prof as any)?.display_name || (prof as any)?.username || "Memoria", email },
```

## src/lib/production.functions.ts

```
108: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
171: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
195: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/recover.functions.ts

```
43: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
52: const emailHtml = t("<div dir=\"rtl\" style=\"font-family: sans-serif;\"> <h2>مرحباً {0}،</h2> <p>طلبتم استرداد روابط التتبع لحجوزاتكم النشطة على منصة Memoria.<
62: subject: t("روابط تتبع حجوزاتك — Memoria"),
83: photographer_name: "Memoria Support",
```

## src/lib/telegram.functions.ts

```
58: const ok = await sendTelegramToPhotographer(context.userId, "✅ رسالة تجربة من ميموريا. هيك رح توصلك إشعارات الحجوزات.");
```

## src/lib/telegram.server.ts

```
24: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/lib/verification.server.ts

```
36: return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
134: <p>لتأكيد طلب الحجز على ميموريا، أدخلي هذا الرمز في صفحة الحجز:</p>
```

## src/lib/verification.ts

```
2: // What "verified" means on Memoria. One list, used by the photographer's
```

## src/lib/whatsapp.server.ts

```
192: `لأي استفسار، يُرجى التواصل معنا عبر Memoria.`,
208: return `مرحباً ${client_name}، تحديث من Memoria بخصوص حجزك مع ${photographer_name}.`;
```

## src/lib/zbooni.functions.ts

```
140: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/nitro/cron.ts

```
11: const base = env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/routes/__root.tsx

```
69: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
112: { name: "apple-mobile-web-app-title", content: "Memoria" },
113: { title: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
114: { name: "description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب.") },
115: { property: "og:title", content: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
116: { property: "og:description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب
118: { property: "og:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
122: { name: "twitter:site", content: "@memoria_jo" },
123: { name: "twitter:title", content: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
124: { name: "twitter:description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس.") },
125: { name: "twitter:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
158: children: "(function(){if(location.hostname==='memoria-jo.lovable.app'){location.replace('https://memoria-production.ahmad000haddad.workers.dev'+location.pathna
172: name: "Memoria",
173: url: "https://memoria-production.ahmad000haddad.workers.dev",
177: target: "https://memoria-production.ahmad000haddad.workers.dev/search?q={search_term_string}",
242: const KEY = "memoria.chunk-reload-at";
262: (window as any).__memoriaChunkReload = (err: unknown) => {
```

## src/routes/_authenticated.tsx

```
36: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
```

## src/routes/_authenticated/admin.contact-messages.tsx

```
152: href={t("mailto:{0}?subject=ردّ على رسالتك — Memoria", [selectedMsg.email])}
```

## src/routes/_authenticated/dashboard.bookings.$id.tsx

```
48: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
105: const draftKey = `memoria:draft:${id}`;
107: try { return typeof window !== "undefined" ? localStorage.getItem(`memoria:draft:${id}`) ?? "" : ""; } catch { return ""; }
119: const hintsKey = `memoria.dismissed-hints.${id}`;
153: try { localStorage.setItem("memoria:last-booking", JSON.stringify({ id: bk.id, name: bk.client_name })); } catch { /* ignore */ }
```

## src/routes/_authenticated/dashboard.bookings.index.tsx

```
41: const SWIPE_HINT_KEY = "memoria:swipe-hint-seen";
42: const LAST_BOOKING_KEY = "memoria:last-booking";
```

## src/routes/_authenticated/dashboard.calendar.tsx

```
173: const outlookSubscribeUrl = exportUrl ? `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(exportUrl)}&name=${encodeURIComponent("Memoria"
291: {g(t("نقرة واحدة واختاري تطبيقكِ. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط."), t("نقرة واحدة واختر تطبيقك. الحجوزات والأيام المحجوبة تظ
```

## src/routes/_authenticated/dashboard.index.tsx

```
418: const LAST_VISIT_KEY = "memoria:dashboard-last-visit";
```

## src/routes/_authenticated/dashboard.production.tsx

```
29: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
100: try { return !!localStorage.getItem("memoria-production-tour-seen"); } catch { return true; }
364: onClick={() => { setTipSeen(true); try { localStorage.setItem("memoria-production-tour-seen", "true"); } catch { /* ignore */ } }}
```

## src/routes/_authenticated/dashboard.profile.tsx

```
416: {g(tr("العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلكِ مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل."), tr("العربون غير قابل للاسترداد عل
428: {g(tr("التوثيق يعني أن فريق ميموريا راجع ملفكِ وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة"), tr("التوثيق يعني أن فريق ميموريا راجع ملفك وتأكّد أ
497: { key: "marketing", label: tr("عروض وأخبار ميموريا") },
```

## src/routes/_authenticated/dashboard.recap.tsx

```
63: const file = new File([blob], `memoria-${r.year}.png`, { type: "image/png" });
65: await navigator.share({ files: [file], title: t("سنتي {0} مع Memoria", [r.year]) });
145: a.download = `memoria-${year}.png`;
213: ctx.fillText(t("Memoria · ميموريا"), W / 2, H - 170);
```

## src/routes/_authenticated/dashboard.referrals.tsx

```
49: const shareText = g(tr("مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّلي من هنا وجرّبيه مجاناً ١٤ يوماً: {
```

## src/routes/_authenticated/dashboard.reports.tsx

```
54: a.download = `memoria-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
```

## src/routes/_authenticated/dashboard.subscription.tsx

```
103: if (result === "success") toast.success(t("اشتراكك فعّال ✓ شكراً لثقتك بميموريا"));
368: <li>{g(t("ادفعي"), t("ادفع"))} <span className="text-foreground font-semibold">{t("{0} د.أ", [amount])}</span>{" "}{t("بنفس بريدك المسجّل في Memoria.")}</li>
```

## src/routes/_authenticated/dashboard.whatsapp-templates.tsx

```
49: "{{tracking_url}}": "memoria.app/track/…",
```

## src/routes/_authenticated/onboarding.tsx

```
21: { title: tr("إعداد حسابك — Memoria") },
50: { icon: Sparkles, title: g(tr("مرحباً بكِ في Memoria"), tr("مرحباً بك في Memoria")), desc: tr("٤ خطوات قصيرة تستغرق أقل من ٥ دقائق — بعدها ملفك جاهز لاستقبال أو
```

## src/routes/about.tsx

```
11: { title: t("من نحن — Memoria · ميموريا") },
12: { name: "description", content: t("ميموريا منصّة أردنية متخصّصة في تنظيم حجوزات مصوّرات الأعراس. تعرّفي على قصّتنا، رؤيتنا، والكيان الذي يقف خلف المنصّة.") },
13: { property: "og:title", content: t("من نحن — Memoria · ميموريا") },
14: { property: "og:description", content: t("قصّة ميموريا: لماذا بدأنا، وما الذي نؤمن به.") },
15: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/about" },
17: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/about" }],
30: {t("ميموريا منصّة أردنية متخصّصة، أُسّست لتنظيم رحلة حجز مصوّرات الأعراس من البحث حتى التسليم — بعيداً عن فوضى الرسائل، الأسعار الغامضة، والمواعيد المتداخلة.")}
```

## src/routes/api/public/google/callback.ts

```
9: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/routes/api/public/hooks/booking-changed.ts

```
14: // يكتب الحجز فوراً في تقويم «Memoria» على Google إن كانت المصوّرة مربوطة.
```

## src/routes/api/public/hooks/email-reminders.ts

```
202: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
205: subject: "انتهى اشتراكك في Memoria — جدّد الآن",
212: <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;">Memoria</div>
218: <p>للأسف انتهى اشتراكك في Memoria اليوم. تم إخفاء ملفك الشخصي مؤقتاً من نتائج البحث.</p>
226: هذه رسالة آلية من Memoria — لا داعي للرد عليها مباشرة.
```

## src/routes/api/public/hooks/paytabs.ts

```
18: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
61: const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/routes/api/public/hooks/telegram.ts

```
33: "أهلاً 👋 هذا بوت إشعارات ميموريا.",
36: "1. افتحي ميموريا ← لوحة التحكم ← الملف الشخصي ← «الإشعارات».",
58: : "الرمز غير صحيح أو مستخدم. ارجعي لميموريا واضغطي «فتح تيليغرام والربط» من جديد لتحصلي على رمز جديد.");
```

## src/routes/api/public/ical.$token.ts

```
56: "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Memoria//AR//", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
57: `X-WR-CALNAME:${esc(`Memoria - ${profile.display_name ?? ""}`)}`,
65: `UID:booking-${b.id}@memoria-jo`,
77: `UID:unavail-${u.date}@memoria-jo`,
88: "Content-Disposition": 'inline; filename="memoria.ics"',
```

## src/routes/app.tsx

```
16: { title: t("حمّل تطبيق Memoria على هاتفك | Memoria") },
19: content: t("ثبّتي Memoria كتطبيق على هاتفك (iPhone أو Android) أو على سطح المكتب — يعمل دون متجر، بسرعة، ومع أيقونة على الشاشة الرئيسية."),
22: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/app" }],
51: other: "ثبّت تطبيق Memoria",
57: { icon: Home, label: "اضغطي «إضافة» وانتهى", desc: "ستظهر أيقونة Memoria على شاشتك الرئيسية" },
121: {t("يمكنك الآن فتح Memoria مباشرة من شاشتك الرئيسية")}
```

## src/routes/blog.$slug.tsx

```
21: { title: `${p.title} | Memoria` },
43: author: { "@type": "Organization", name: "Memoria" },
44: publisher: { "@type": "Organization", name: "Memoria", url: SITE_URL },
53: { "@type": "ListItem", position: 1, name: "Memoria", item: SITE_URL },
```

## src/routes/blog.index.tsx

```
9: const TITLE = "مدوّنة Memoria — نصائح لتصوير الأعراس والمناسبات";
31: { "@type": "ListItem", position: 1, name: "Memoria", item: SITE_URL },
```

## src/routes/contact.tsx

```
13: { title: t("تواصلي معنا — Memoria · ميموريا") },
14: { name: "description", content: t("فريق ميموريا هنا للمساعدة في الحجوزات، الاشتراكات، والاستفسارات. أرسلي رسالتك وسنردّ خلال 24 ساعة.") },
15: { property: "og:title", content: t("تواصلي معنا — Memoria · ميموريا") },
17: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/contact" },
19: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/contact" }],
56: const subject = encodeURIComponent(t("[ميموريا] رسالة من {0}", [name]));
```

## src/routes/contracts.$token.tsx

```
18: { title: t("توقيع عقد التصوير — ميموريا") },
20: { property: "og:title", content: t("توقيع عقد التصوير — ميموريا") },
```

## src/routes/faq.tsx

```
11: { title: t("الأسئلة الشائعة — Memoria · ميموريا") },
12: { name: "description", content: t("إجابات لأكثر الأسئلة شيوعاً حول الحجز، الدفع، الإلغاء، التقييمات، والاشتراكات على منصّة ميموريا.") },
13: { property: "og:title", content: t("الأسئلة الشائعة — Memoria") },
15: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/faq" },
17: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/faq" }],
```

## src/routes/for-clients.tsx

```
11: { title: t("للعملاء — لماذا Memoria؟ | حجز مصوّرات الأعراس بثقة") },
13: { property: "og:title", content: t("للعملاء — لماذا Memoria؟") },
16: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/for-clients" }],
45: {t("Memoria منصّة متخصّصة في مصوّرات الأعراس في الأردن. اخترنا لكِ أفضل المصوّرات، تحقّقنا منهنّ، ووفّرنا أدوات حماية وتتبّع لكل خطوة من خطوات حجزكِ.")}
58: <h2 className="font-serif text-3xl sm:text-4xl">{t("١٢ سبباً لاختيار Memoria")}</h2>
```

## src/routes/for-photographers.tsx

```
12: { title: t("للمصوّرات — انضمي إلى Memoria | إدارة كاملة لأعمال التصوير") },
14: { property: "og:title", content: t("للمصوّرات — انضمي إلى Memoria") },
17: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/for-photographers" }],
54: {t("Memoria ليست فقط منصّة عرض — بل نظام إدارة متكامل صُمّم خصيصاً لمصوّرات الأعراس في الأردن. حجوزات، عقود، عرابين، تسليم صور، تقارير، وقوالب واتساب — كل ذلك ب
```

## src/routes/forgot-password.tsx

```
15: { title: t("استعادة كلمة المرور | Memoria") },
```

## src/routes/game.tsx

```
10: { title: t("اهربي يا عروس — Memoria · ميموريا") },
11: { name: "description", content: t("لعبة ميموريا: اهربي من العريس واكسري رقمك القياسي، ثم شاركي نتيجتك.") },
12: { property: "og:title", content: t("اهربي يا عروس — Memoria") },
```

## src/routes/guide.tsx

```
18: { title: t("كيف يعمل الموقع — رحلة العميل والمصور | Memoria") },
20: { property: "og:title", content: t("كيف يعمل Memoria — رحلتك خطوة بخطوة") },
23: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/guide" }],
169: Memoria
225: {t("لماذا Memoria أفضل؟")}
239: <div className="border-e px-4 py-3 text-center sm:py-4">Memoria</div>
```

## src/routes/index.tsx

```
22: { title: tr("Memoria · ميموريا — منصّة تصوير المناسبات في الأردن") },
24: { property: "og:title", content: tr("Memoria · ميموريا — تصوير المناسبات") },
27: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/" },
29: { name: "twitter:title", content: tr("Memoria · ميموريا") },
31: { property: "og:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
32: { name: "twitter:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
34: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/" }],
43: export const VISITOR_ROLE_KEY = "memoria_visitor_role";
61: <div className="font-serif text-xl tracking-wide">Memoria <span className="text-muted-foreground text-base">{tr("ميموريا")}</span></div>
226: const ls = JSON.parse(localStorage.getItem("memoria_last_search") || "null");
252: window.dispatchEvent(new CustomEvent("memoria-role-gate", { detail: showRoleGate }));
287: <span className="eyebrow">Memoria</span>
570: <Quote name={tr("لين المجالي")} text={tr("ميزة التوفر الفوري خلتني أقدر أرتب أموري خلال ساعات، بدل ما أنتظر أيام عشان أسمع رد المصورات. الصور وصلتني أسرع من الم
```

## src/routes/login.tsx

```
17: { title: t("تسجيل الدخول — Memoria · ميموريا") },
18: { name: "description", content: t("سجّلي الدخول إلى حساب Memoria لإدارة حجوزاتك، ملفك الشخصي، وباقاتك.") },
28: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
60: try { const last = localStorage.getItem("memoria_last_email"); if (last) setEmail(last); } catch { /* ignore */ }
112: try { localStorage.setItem("memoria_last_email", email.trim()); } catch { /* ignore */ }
```

## src/routes/occasion.$type.tsx

```
23: { name: "Memoria", url: SITE_URL },
```

## src/routes/offer.$token.tsx

```
15: { title: t("عرض السعر — ميموريا") },
17: { property: "og:title", content: t("عرض السعر — ميموريا") },
```

## src/routes/photographers/$username.tsx

```
58: const desc = p?.bio?.slice(0, 155) || tr("استعرض أعمال وأسعار المصوّرة {0}{1} واحجز موعدك مباشرة عبر Memoria.", [name, city]);
60: const image = rawImage && rawImage.startsWith("/") ? `https://memoria-production.ahmad000haddad.workers.dev${rawImage}` : rawImage;
61: const url = `https://memoria-production.ahmad000haddad.workers.dev/photographers/${params.username}`;
63: { title: tr("{0} — مصوّرة أعراس{1} | Memoria", [name, city]) },
212: "@id": `https://memoria-production.ahmad000haddad.workers.dev/photographers/${profile.username}`,
214: url: `https://memoria-production.ahmad000haddad.workers.dev/photographers/${profile.username}`,
300: <span>{tr("Memoria · العدد ٠١")}</span>
618: <a href={`https://wa.me/${(profile.whatsapp || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(tr("مرحباً! شاهدت أعمالك الرائعة على منصة Memoria، وأود الا
719: const MY_BOOKINGS_KEY = "memoria.my-bookings";
740: const storageKey = `memoria.booking-draft.${profile.username}`;
765: const successKey = `memoria.booking-success.${profile.username}`;
1009: <a href={`https://wa.me/?text=${encodeURIComponent(tr("رابط تتبّع حجزي في ميموريا:") + fullUrl)}`} target="_blank" rel="noopener noreferrer"
1521: href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(tr("مرحباً! شاهدت أعمالك على ميموريا وأود الاستفسار عن باقات التصوير لحفل زفاف
```

## src/routes/photographers/join.tsx

```
19: { title: tr("انضمي كمصوّرة — Memoria · ميموريا") },
20: { name: "description", content: tr("انضمي إلى Memoria وابدئي استقبال حجوزات مباشرة من العميلات، بأدوات إدارة كاملة وبدون عمولة.") },
21: { property: "og:title", content: tr("انضمي كمصوّرة — Memoria") },
23: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/photographers/join" },
25: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/photographers/join" }],
208: <h1 className="font-serif text-4xl">{tr("انضمي إلى ميموريا")}</h1>
227: <span className="text-muted-foreground" dir="ltr">{form.username ? `memoria/photographers/${form.username}` : ""}</span>
```

## src/routes/pricing.tsx

```
13: { title: t("الباقات والأسعار — Memoria · ميموريا") },
14: { name: "description", content: t("باقات اشتراك مرنة للمصوّرات على منصّة ميموريا — بدون عمولة على الحجوزات، وأدوات كاملة لإدارة الأعمال.") },
15: { property: "og:title", content: t("الباقات والأسعار — Memoria") },
17: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/pricing" },
19: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/pricing" }],
```

## src/routes/privacy.tsx

```
9: { title: tr("سياسة الخصوصية — Memoria") },
10: { name: "description", content: tr("كيف نجمع بياناتك ونستخدمها ونحميها على منصة Memoria لحجوزات مصوّرات الأعراس في الأردن.") },
12: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/privacy" }],
```

## src/routes/recover.tsx

```
14: { title: t("استرداد رابط الحجز — Memoria") },
15: { name: "description", content: t("استعيدي روابط تتبع حجوزاتك على منصة ميموريا.") },
94: {t("هل تواجهين مشكلة؟ تواصلي مع")}{" "}<a href="mailto:support@memoria.jo" className="underline">{t("الدعم الفني")}</a>.
```

## src/routes/refund-policy.tsx

```
9: { title: tr("سياسة الإلغاء — Memoria · ميموريا") },
10: { name: "description", content: tr("العربون والاشتراك غير قابلين للاسترداد. كيف يعمل الإلغاء على منصّة ميموريا ومن المسؤول عن ماذا.") },
11: { property: "og:title", content: tr("سياسة الإلغاء والاسترداد — Memoria") },
13: { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/refund-policy" },
15: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/refund-policy" }],
31: {tr("ميموريا منصّة تنظيمية لإدارة الحجوزات.")}{" "}<strong>{tr("المنصّة لا تستلم أموال الحجز ولا تحتفظ بها")}</strong>{tr("؛ العربون يُحوَّل مباشرة من العميلة إ
```

## src/routes/reset-password.tsx

```
14: { title: t("إعادة تعيين كلمة المرور | Memoria") },
```

## src/routes/review.$token.tsx

```
18: { title: tr("قيّمي تجربتك — ميموريا") },
20: { property: "og:title", content: tr("قيّمي تجربتك — ميموريا") },
```

## src/routes/robots[.]txt.ts

```
4: const BASE_URL = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/routes/search.tsx

```
33: { title: tr("مصوّرات أعراس في الأردن — ابحثي واحجزي | Memoria") },
40: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/search" }],
75: setFavs(JSON.parse(localStorage.getItem("memoria_favs") || "[]"));
76: const ls = JSON.parse(localStorage.getItem("memoria_last_search") || "null");
79: const onFav = () => { try { setFavs(JSON.parse(localStorage.getItem("memoria_favs") || "[]")); } catch { /* ignore */ } };
80: window.addEventListener("memoria-favs-change", onFav);
81: return () => window.removeEventListener("memoria-favs-change", onFav);
118: try { localStorage.setItem("memoria_last_search", JSON.stringify({ city, maxPrice, date })); } catch { /* ignore */ }
673: const favs = JSON.parse(localStorage.getItem("memoria_favs") || "[]");
682: const favs = JSON.parse(localStorage.getItem("memoria_favs") || "[]");
691: localStorage.setItem("memoria_favs", JSON.stringify(newFavs));
693: window.dispatchEvent(new Event("memoria-favs-change"));
```

## src/routes/sitemap[.]xml.ts

```
8: const BASE_URL = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
```

## src/routes/terms.tsx

```
9: { title: tr("الشروط والأحكام — Memoria") },
10: { name: "description", content: tr("شروط استخدام منصة Memoria لحجوزات مصوّرات الأعراس في الأردن: الحجز، العربون، الإلغاء، والتسليم.") },
12: links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/terms" }],
28: {tr("Memoria منصة تنظيمية تربط العميلات بمصوّرات الأعراس في الأردن. المنصة ليست طرفاً في عقد التصوير نفسه؛ العقد يُبرم مباشرة بين العميلة والمصوّرة.")}
```

## src/routes/track.$token.tsx

```
35: { title: t("متابعة حجزك — ميموريا") },
37: { property: "og:title", content: t("متابعة حجزك — ميموريا") },
50: if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
```

## src/routes/wedding-photographer.$city.tsx

```
24: { name: "Memoria", url: SITE_URL },
```

## supabase/.temp/linked-project.json

```
1: {"ref":"qrpkfanblpjiqgkufnrb","name":"memoria","organization_id":"eisegjbiihyimdcfaaot","organization_slug":"eisegjbiihyimdcfaaot"}
```

## supabase/migrations/20261011100000_demo_photographers.sql

```
48: ('11111111-1111-4111-8111-000000000001'::uuid, 'layla-demo', 'ليلى (نسخة تجريبية)', 'layla.demo@memoria.invalid'),
49: ('11111111-1111-4111-8111-000000000002'::uuid, 'noor-demo',  'نور (نسخة تجريبية)',  'noor.demo@memoria.invalid')
61: bio = 'مصوّرة أعراس من عمّان، أحب اللقطات الصادقة والضوء الطبيعي والتفاصيل الصغيرة التي تُنسى في زحمة اليوم الكبير. هذا حساب تجريبي لتري المصوّرات كيف سيبدو حسا
74: bio = 'مصوّرة محجّبة تحب الأجواء الهادئة والخاصة، مناسبة للحفلات النسائية والعائلية. هذا حساب تجريبي لتري المصوّرات كيف سيبدو حسابهن على ميموريا.',
```

## supabase/migrations/20261016130000_google_calendar_oauth.sql

```
9: memoria_calendar_id text,
33: -- Push a booking to the photographer's Google "Memoria" calendar as soon as it
44: url := 'https://memoria-production.ahmad000haddad.workers.dev/api/public/hooks/booking-changed',
```

## wrangler.jsonc

```
3: "name": "memoria-production",
15: "PUBLIC_APP_URL": "https://memoria-production.ahmad000haddad.workers.dev",
18: "TELEGRAM_BOT_USERNAME": "MemoriaJoBot",
```

