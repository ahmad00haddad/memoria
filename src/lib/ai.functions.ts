import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAI } from "./ai.server";

const SYS_AR = "أنت مساعد محترف لمصوّري الأعراس في الأردن. اكتب بالعربية الفصحى السلسة، باختصار وبدون مقدمات.";

export const aiGenerateBio = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    name: z.string().min(1),
    city: z.string().optional().default(""),
    style: z.string().optional().default(""),
    equipment: z.string().optional().default(""),
    years: z.string().optional().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `اكتب نبذة احترافية (٣-٤ جمل) لمصوّر أعراس باسم "${data.name}" من ${data.city}. الأسلوب: ${data.style || "كلاسيكي راقٍ"}. الخبرة: ${data.years || "—"} سنوات. المعدّات: ${data.equipment || "—"}. ركّز على الأناقة والتميّز وخدمة العميل. لا تستخدم رموز تعبيرية.`,
    });
    return { text: out };
  });

export const aiSuggestReply = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    clientMessage: z.string().min(1),
    tone: z.enum(["ودّي", "رسمي", "مختصر"]).default("ودّي"),
  }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `العميل كتب: "${data.clientMessage}". صُغ ردًا ${data.tone} (٢-٣ جمل) كمصوّر محترف، يطمئن العميل ويوضّح الخطوة التالية.`,
    });
    return { text: out };
  });

export const aiAnalyzeBrief = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ brief: z.string().min(5) }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `حلّل ملخّص العميل التالي واستخرج قائمة تحضير عملية (نقاط) للمصوّر تشمل: المعدّات المقترحة، اللقطات الأساسية، تنبيهات الإضاءة/المكان، توقيت الوصول. الملخّص: """${data.brief}"""`,
      maxTokens: 600,
    });
    return { text: out };
  });

export const aiGenerateCaption = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ topic: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `اكتب ٣ كابشنات إنستغرام أنيقة وقصيرة (سطر-سطرين) لصورة عرس عن: "${data.topic}". أضف ٥ هاشتاقات عربية/إنجليزية مناسبة لمصوّري الأعراس في الأردن.`,
    });
    return { text: out };
  });

export const aiSuggestPricing = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    city: z.string().min(1),
    years: z.string().default(""),
    style: z.string().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `اقترح ٣ باقات تسعير (أساسية، فضّية، ذهبية) لمصوّر أعراس في ${data.city} بالأردن، الخبرة ${data.years || "متوسّطة"}، الأسلوب ${data.style || "كلاسيكي"}. لكل باقة: السعر التقريبي بالدينار، عدد الساعات، عدد الصور المعدّلة، وما يميّزها. كن واقعيًا حسب السوق الأردني ٢٠٢٥.`,
      maxTokens: 700,
    });
    return { text: out };
  });

export const aiContractClause = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ topic: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: "أنت مستشار قانوني يصيغ بنود عقود واضحة بالعربية الفصحى.",
      prompt: `صُغ بندًا قانونيًا واضحًا لعقد تصوير أعراس بخصوص: "${data.topic}". اجعله محايدًا وعمليًا في فقرة واحدة.`,
    });
    return { text: out };
  });

export const aiSummarizeReviews = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ reviews: z.array(z.string()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: SYS_AR,
      prompt: `لخّص تقييمات العملاء التالية في فقرة قصيرة تبرز نقاط القوة المتكرّرة وأي ملاحظات للتحسين:\n${data.reviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
    });
    return { text: out };
  });

export const aiTranslate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    text: z.string().min(1),
    to: z.enum(["ar", "en"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const target = data.to === "ar" ? "العربية الفصحى السلسة" : "English (natural professional tone)";
    const out = await callAI({
      prompt: `Translate the following to ${target}, keep meaning and tone, return only the translation:\n\n${data.text}`,
    });
    return { text: out };
  });

export const aiAskAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ question: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      system: "أنت مستشار أعمال لمصوّري الأعراس في الأردن. أجب باختصار عملي.",
      prompt: data.question,
      maxTokens: 600,
    });
    return { text: out };
  });

export const aiSeoMeta = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    name: z.string(),
    city: z.string().default(""),
    bio: z.string().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const out = await callAI({
      prompt: `أعد JSON فقط بهذا الشكل {"title":"...", "description":"..."} لصفحة مصوّر أعراس. الاسم: ${data.name}. المدينة: ${data.city}. النبذة: ${data.bio}. الـ title أقل من ٦٠ حرفًا، description أقل من ١٥٥ حرفًا، عربي جذّاب يحوي كلمات مفتاحية (مصوّر أعراس، ${data.city}).`,
      maxTokens: 300,
    });
    return { text: out };
  });