import { z } from "zod";
export const subjects = {
  TYT: ["Türkçe", "Sosyal Bilimler", "Temel Matematik", "Fen Bilimleri"],
  AYT: ["Matematik", "Fizik", "Kimya", "Biyoloji"],
} as const;
export const defaults = { TYT: [40, 20, 40, 20], AYT: [40, 14, 13, 13] };
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Geçerli bir tarih gir.",
  );
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function clock(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
const windowSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    start: timeSchema,
    end: timeSchema,
    capacity: z.number().int().min(0).max(300),
  })
  .refine(
    (w) =>
      minutes(w.end) > minutes(w.start) &&
      w.capacity <= minutes(w.end) - minutes(w.start),
    "Kapasite, müsaitlik aralığına sığmalı.",
  );
const eventSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    label: z.string().min(1).max(80),
    start: timeSchema,
    end: timeSchema,
  })
  .refine(
    (w) => minutes(w.end) > minutes(w.start),
    "Bitiş başlangıçtan sonra olmalı.",
  );
export const settingsSchema = z
  .object({
    onboarded: z.boolean(),
    exam: z.string().min(1).max(60),
    field: z.string().min(1).max(60),
    rank: z.number().int().positive().max(5000000),
    goal: z.string().max(300),
    baseline: z.string().max(400),
    priority: z.string().min(1).max(80),
    weeklyMinutes: z.number().int().min(60).max(1500),
    windows: z
      .array(windowSchema)
      .length(7)
      .refine(
        (w) => new Set(w.map((x) => x.day)).size === 7,
        "Her gün bir kez tanımlanmalı.",
      ),
    events: z.array(eventSchema).max(50),
    exceptions: z
      .array(
        z.object({
          date: dateSchema,
          capacity: z.number().int().min(0).max(300),
          note: z.string().max(150),
        }),
      )
      .max(200)
      .refine(
        (x) => new Set(x.map((e) => e.date)).size === x.length,
        "Tarih tekrarlanmamalı.",
      ),
    upcoming: z
      .array(z.object({ date: dateSchema, name: z.string().min(1).max(100) }))
      .max(100),
    questionCounts: z.object({
      TYT: z.array(z.number().int().min(1).max(100)).length(4),
      AYT: z.array(z.number().int().min(1).max(100)).length(4),
    }),
  })
  .superRefine((s, ctx) => {
    for (const w of s.windows) {
      if (!w.capacity) continue;
      for (const e of s.events)
        if (
          e.day === w.day &&
          minutes(w.start) < minutes(e.end) &&
          minutes(e.start) < minutes(w.end)
        )
          ctx.addIssue({
            code: "custom",
            message: `${e.label} ile çalışma aralığı çakışıyor.`,
            path: ["windows"],
          });
    }
  });
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  onboarded: false,
  exam: "2027 YKS",
  field: "Sayısal",
  rank: 50000,
  goal: "İstanbul · Devlet üniversitesi · Bilgisayar Mühendisliği",
  baseline:
    "Kullanıcı beyanı: TYT yaklaşık 50 net; TYT Matematik 5–10 net. AYT Matematik başlangıç neti bilinmiyor. Düzenli çalışma alışkanlığı henüz oturmadı.",
  priority: "TYT Temel Matematik",
  weeklyMinutes: 480,
  windows: [
    { day: 0, start: "14:00", end: "17:00", capacity: 110 },
    { day: 1, start: "18:30", end: "20:30", capacity: 100 },
    ...[2, 3, 4].map((day) => ({
      day,
      start: "20:30",
      end: "21:30",
      capacity: 45,
    })),
    { day: 5, start: "18:30", end: "20:30", capacity: 100 },
    { day: 6, start: "16:00", end: "18:00", capacity: 110 },
  ],
  events: [
    ...[1, 2, 3, 4, 5].map((day) => ({
      day,
      label: "Okul",
      start: "08:45",
      end: "16:40",
    })),
    ...[2, 3, 4].flatMap((day) => [
      {
        day,
        label: "Dershane (okul ile 10 dk çakışıyor)",
        start: "16:30",
        end: "18:50",
      },
      { day, label: "Ulaşım · motosiklet", start: "18:50", end: "19:30" },
      { day, label: "Yemek ve dinlenme", start: "19:30", end: "20:30" },
    ]),
    { day: 6, label: "Dershane", start: "09:00", end: "13:50" },
    { day: 6, label: "Dönüş, yemek ve dinlenme", start: "13:50", end: "16:00" },
    ...[1, 5].map((day) => ({
      day,
      label: "Dönüş, yemek ve dinlenme",
      start: "16:40",
      end: "18:30",
    })),
  ],
  exceptions: [],
  upcoming: [],
  questionCounts: defaults,
};
export const resultSchema = z
  .object({
    subject: z.string().min(1).max(80),
    questions: z.number().int().min(1).max(100),
    correct: z.number().int().min(0),
    wrong: z.number().int().min(0),
    blank: z.number().int().min(0),
  })
  .refine(
    (r) => r.correct + r.wrong + r.blank === r.questions,
    "Doğru + yanlış + boş, soru sayısına eşit olmalı.",
  );
export const examSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    date: dateSchema,
    type: z.enum(["TYT", "AYT"]),
    results: z.array(resultSchema).max(4),
    rank: z.number().int().positive().nullable(),
    participants: z.number().int().positive().nullable(),
    note: z.string().max(2000),
  })
  .superRefine((e, ctx) => {
    if (
      e.results.some(
        (r) => !(subjects[e.type] as readonly string[]).includes(r.subject),
      ) ||
      new Set(e.results.map((r) => r.subject)).size !== e.results.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Dersler sınav türüyle uyumlu ve benzersiz olmalı.",
      });
    if (e.rank && e.participants && e.rank > e.participants)
      ctx.addIssue({
        code: "custom",
        message: "Sıralama katılımcı sayısından büyük olamaz.",
      });
  });
export type Exam = z.infer<typeof examSchema>;
export const taskSchema = z.object({
  id: z.string().uuid(),
  date: dateSchema,
  start: timeSchema,
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(1).max(160),
  kind: z.enum(["Konu anlatımı", "Soru çözümü", "Tekrar", "Yanlış analizi"]),
  minutes: z.number().int().min(10).max(120),
  status: z.enum(["planned", "done", "deferred", "skipped"]),
  reason: z.string().max(500),
  source: z.enum(["plan", "manual", "ai"]),
  actualMinutes: z.number().int().min(0).max(600).nullable(),
});
export type Task = z.infer<typeof taskSchema>;
export const topicSchema = z.object({
  id: z.string().min(1).max(100),
  subject: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  status: z.enum(["Çalışılmadı", "Geliştirilmeli", "Yeterli"]),
  review: z.boolean(),
  lastReviewed: dateSchema.nullable(),
  note: z.string().max(1000),
});
export type Topic = z.infer<typeof topicSchema>;
export const catalog = [
  ["TYT Temel Matematik", "Temel kavramlar", "Sayılar", "Problemler"],
  ["TYT Türkçe", "Paragraf", "Dil bilgisi"],
  ["TYT Sosyal Bilimler", "Tarih ve coğrafya temelleri"],
  ["TYT Fen Bilimleri", "Temel fen kavramları"],
  ["AYT Matematik", "Fonksiyonlar", "Polinomlar", "Trigonometri"],
  ["AYT Fizik", "Kuvvet ve hareket"],
  ["AYT Kimya", "Mol ve tepkimeler"],
  ["AYT Biyoloji", "Hücre ve sistemler"],
].flatMap(([subject, ...names]) =>
  names.map((name, i) => ({
    id: `${subject}-${i}`,
    subject,
    name,
    status: "Çalışılmadı" as const,
    review: false,
    lastReviewed: null,
    note: "",
  })),
);
export const analysisSchema = z.object({
  id: z.string().uuid(),
  date: dateSchema,
  raw: z.string().max(30000),
  applied: z.boolean(),
});
export const backupSchema = z
  .object({
    version: z.literal(1),
    settings: settingsSchema,
    tasks: z.array(taskSchema).max(20000),
    exams: z.array(examSchema).max(5000),
    topics: z.array(topicSchema).max(1000),
    analyses: z.array(analysisSchema).max(1000),
  })
  .superRefine((b, c) => {
    for (const key of ["tasks", "exams", "topics", "analyses"] as const)
      if (new Set(b[key].map((x) => x.id)).size !== b[key].length)
        c.addIssue({ code: "custom", message: `${key}: yinelenen kimlik.` });
  });
export type Snapshot = z.infer<typeof backupSchema>;
export const proposalSchema = z
  .object({
    summary: z.string().min(1).max(2000),
    tasks: z
      .array(
        taskSchema.pick({
          date: true,
          start: true,
          subject: true,
          topic: true,
          kind: true,
          minutes: true,
        }),
      )
      .min(1)
      .max(21),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(date + "T12:00:00Z").getUTCDay();
}
export function weekStart(date: string) {
  return addDays(date, -((weekday(date) + 6) % 7));
}
export function net(r: { correct: number; wrong: number }) {
  return r.correct - r.wrong / 4;
}
export function total(e: Exam) {
  return e.results.length === 4
    ? e.results.reduce((s, r) => s + net(r), 0)
    : null;
}
export function stats(values: number[]) {
  return {
    count: values.length,
    last: values.at(-1) ?? null,
    delta: values.length >= 2 ? values.at(-1)! - values.at(-2)! : null,
    avg3:
      values.length >= 3
        ? values.slice(-3).reduce((a, b) => a + b, 0) / 3
        : null,
    avg5:
      values.length >= 5
        ? values.slice(-5).reduce((a, b) => a + b, 0) / 5
        : null,
    volatility:
      values.length >= 3
        ? Math.sqrt(
            values.reduce(
              (s, v) =>
                s +
                (v - values.reduce((a, b) => a + b, 0) / values.length) ** 2,
              0,
            ) / values.length,
          )
        : null,
  };
}
