// مزامنة iCal من Google Calendar: نحوّل كل فعالية إلى الأيام التي تشغلها بتوقيت عمّان
// ونحجبها في photographer_unavailability.
// - الفعاليات اليومية (VALUE=DATE): DTEND حصري.
// - الفعاليات بساعات: تُحوَّل من UTC/TZID إلى تاريخ عمّان (فعالية 01:00 بتوقيت عمّان = اليوم السابق في UTC).
// - تُتجاهل الفعاليات الملغاة (STATUS:CANCELLED) والمعلَّمة «متاح» (TRANSP:TRANSPARENT).
// - التكرار البسيط (RRULE: DAILY/WEEKLY/MONTHLY/YEARLY مع COUNT/UNTIL/INTERVAL/BYDAY) يُوسَّع لأفق ~سنة، مع EXDATE.
// - الأيام الماضية لا تُكتب.
const TZ = "Asia/Amman";
const HORIZON_DAYS = 400;

function ymdInTz(d: Date, tz = TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** يفكّ الأسطر المطويّة حسب RFC 5545 (سطر يبدأ بمسافة/Tab يكمل السابق). */
function unfold(ics: string): string[] {
  return ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

type Prop = { name: string; params: Record<string, string>; value: string };
function parseProp(line: string): Prop | null {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const [name, ...ps] = line.slice(0, i).split(";");
  const params: Record<string, string> = {};
  for (const p of ps) {
    const [k, v] = p.split("=");
    if (k && v) params[k.toUpperCase()] = v.replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(i + 1) };
}

/** وقت محلي في منطقة زمنية معيّنة → لحظة UTC. */
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(guess)).reduce<Record<string, number>>((o, p) => {
    if (p.type !== "literal") o[p.type] = Number(p.value);
    return o;
  }, {});
  const asTz = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(guess - (asTz - guess));
}

type When = { allDay: true; date: string } | { allDay: false; at: Date };
function parseWhen(p: Prop): When | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(p.value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, se, z] = m;
  if (!h || p.params.VALUE === "DATE") return { allDay: true, date: `${y}-${mo}-${d}` };
  let tz = z ? "UTC" : p.params.TZID || TZ;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { tz = TZ; }
  const at = tz === "UTC"
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se))
    : zonedToUtc(+y, +mo, +d, +h, +mi, +se, tz);
  return { allDay: false, at };
}

const addDays = (ymd: string, n: number) => {
  const t = new Date(ymd + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** أيام عمّان التي تشغلها فعالية واحدة. */
function daysOf(start: When, end: When | null): string[] {
  const out: string[] = [];
  if (start.allDay) {
    const last = end && end.allDay ? addDays(end.date, -1) : start.date; // DTEND حصري
    for (let d = start.date; d <= last && out.length < 60; d = addDays(d, 1)) out.push(d);
    return out.length ? out : [start.date];
  }
  const s = ymdInTz(start.at);
  // نهاية عند منتصف الليل بالضبط لا تشغل اليوم التالي
  const e = end && !end.allDay ? ymdInTz(new Date(end.at.getTime() - 1)) : s;
  for (let d = s; d <= (e < s ? s : e) && out.length < 60; d = addDays(d, 1)) out.push(d);
  return out;
}

const WD: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** يوسّع RRULE بسيطة إلى أيام بداية (بتوقيت عمّان) ضمن الأفق. */
export function expandRule(rule: string, firstDay: string, todayYmd: string): string[] {
  const r: Record<string, string> = {};
  for (const kv of rule.split(";")) {
    const [k, v] = kv.split("=");
    if (k && v) r[k.toUpperCase()] = v;
  }
  const freq = r.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return [firstDay];
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const untilM = r.UNTIL ? /^(\d{4})(\d{2})(\d{2})/.exec(r.UNTIL) : null;
  const horizon = addDays(todayYmd, HORIZON_DAYS);
  const until = untilM ? `${untilM[1]}-${untilM[2]}-${untilM[3]}` : horizon;
  const stop = until < horizon ? until : horizon;
  const byDay = r.BYDAY ? r.BYDAY.split(",").map((x) => WD[x.slice(-2)]).filter((x) => x !== undefined) : null;
  const start = new Date(firstDay + "T00:00:00Z");
  const out: string[] = [];
  let n = 0;
  for (let i = 0; i < 5000; i++) {
    let cands: string[];
    if (freq === "DAILY") cands = [addDays(firstDay, i * interval)];
    else if (freq === "WEEKLY") {
      const weekStart = addDays(firstDay, i * 7 * interval);
      const base = new Date(weekStart + "T00:00:00Z").getUTCDay();
      const days = byDay?.length ? byDay : [start.getUTCDay()];
      cands = days.map((wd) => addDays(weekStart, (wd - base + 7) % 7)).sort();
    } else {
      const t = new Date(start);
      if (freq === "MONTHLY") t.setUTCMonth(t.getUTCMonth() + i * interval);
      else t.setUTCFullYear(t.getUTCFullYear() + i * interval);
      if (t.getUTCDate() !== start.getUTCDate()) continue; // مثلاً 31 في شهر أقصر
      cands = [t.toISOString().slice(0, 10)];
    }
    if (cands[0] > stop) break;
    for (const c of cands) {
      if (c < firstDay || c > stop) continue;
      if (++n > count) return out;
      out.push(c);
    }
  }
  return out;
}

function unescapeText(v: string) {
  return v.replace(/\\([,;nN\\])/g, (_, c) => (c === "n" || c === "N" ? " " : c));
}

function eventDays(props: Prop[], today: string): { date: string; summary: string }[] {
  const get = (n: string) => props.find((p) => p.name === n);
  if ((get("STATUS")?.value ?? "").toUpperCase() === "CANCELLED") return [];
  if ((get("TRANSP")?.value ?? "").toUpperCase() === "TRANSPARENT") return [];
  const dStart = get("DTSTART");
  const start = dStart ? parseWhen(dStart) : null;
  if (!start) return [];
  const dEnd = get("DTEND");
  const end = dEnd ? parseWhen(dEnd) : null;
  const summary = unescapeText(get("SUMMARY")?.value ?? "").trim().slice(0, 120) || "Google event";
  const span = daysOf(start, end);
  const rrule = get("RRULE")?.value;
  const starts = rrule ? expandRule(rrule, span[0], today) : [span[0]];
  const ex = new Set(
    props.filter((p) => p.name === "EXDATE").flatMap((p) =>
      p.value.split(",").map((v) => {
        const w = parseWhen({ ...p, value: v });
        return w ? (w.allDay ? w.date : ymdInTz(w.at)) : "";
      }),
    ),
  );
  const out: { date: string; summary: string }[] = [];
  for (const s of starts) {
    if (ex.has(s)) continue;
    for (let k = 0; k < span.length; k++) {
      const d = addDays(s, k);
      if (d >= today) out.push({ date: d, summary });
    }
  }
  return out;
}

export function parseIcalDates(ics: string, now = new Date()): { date: string; summary: string }[] {
  const today = ymdInTz(now);
  const events: { date: string; summary: string }[] = [];
  let cur: Prop[] | null = null;
  for (const line of unfold(ics)) {
    if (/^BEGIN:VEVENT/i.test(line)) { cur = []; continue; }
    if (/^END:VEVENT/i.test(line)) {
      if (cur) events.push(...eventDays(cur, today));
      cur = null;
      continue;
    }
    if (cur) {
      const p = parseProp(line);
      if (p) cur.push(p);
    }
  }
  return events;
}
