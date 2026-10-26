import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  defaultSettings,
  catalog,
  net,
  total,
  examSchema,
  stats,
  backupSchema,
  today,
  addDays,
  weekStart,
  type Snapshot,
  type Task,
} from "../lib/domain";
import {
  generateWeek,
  checkPlan,
  deferTask,
  capacity,
  completion,
} from "../lib/planner";
import { applyAction, parseProposal, validateProposal } from "../lib/service";
function fixture(): Snapshot {
  return structuredClone({
    version: 1,
    settings: defaultSettings,
    tasks: [],
    exams: [],
    topics: catalog,
    analyses: [],
  });
}
const exam = () => ({
  id: randomUUID(),
  name: "Gerçek deneme",
  date: today(),
  type: "TYT" as const,
  results: [],
  rank: null,
  participants: null,
  note: "",
});
const task = (date = "2026-10-26"): Task => ({
  id: randomUUID(),
  date,
  start: "18:30",
  subject: "TYT Temel Matematik",
  topic: "Temel kavramlar",
  kind: "Soru çözümü",
  minutes: 30,
  status: "planned",
  source: "plan",
  reason: "Öneri",
  actualMinutes: null,
});
test("Net formülü negatif sonuçlar dahil doğrudur", () => {
  assert.equal(net({ correct: 30, wrong: 8 }), 28);
  assert.equal(net({ correct: 0, wrong: 4 }), -1);
});
test("Eksik toplam ile sıfır net ayrılır", () => {
  assert.equal(total(exam()), null);
  const e = {
    ...exam(),
    results: [
      "Türkçe",
      "Sosyal Bilimler",
      "Temel Matematik",
      "Fen Bilimleri",
    ].map((subject) => ({
      subject,
      questions: 40,
      correct: 0,
      wrong: 0,
      blank: 40,
    })),
  };
  assert.equal(total(e), 0);
});
test("Soru toplamı ve ders türü doğrulanır", () => {
  assert.equal(
    examSchema.safeParse({
      ...exam(),
      results: [
        { subject: "Türkçe", questions: 40, correct: 20, wrong: 5, blank: 10 },
      ],
    }).success,
    false,
  );
  assert.equal(
    examSchema.safeParse({
      ...exam(),
      results: [
        { subject: "Fizik", questions: 14, correct: 10, wrong: 0, blank: 4 },
      ],
    }).success,
    false,
  );
});
test("Aynı ders iki kez ve geçersiz tarih reddedilir", () => {
  const r = {
    subject: "Türkçe",
    questions: 40,
    correct: 20,
    wrong: 0,
    blank: 20,
  };
  assert.equal(
    examSchema.safeParse({ ...exam(), results: [r, r] }).success,
    false,
  );
  assert.equal(
    examSchema.safeParse({ ...exam(), date: "2026-02-30" }).success,
    false,
  );
});
test("Az veride ortalama ve dalgalanma iddiası yok", () => {
  assert.deepEqual(stats([]), {
    count: 0,
    last: null,
    delta: null,
    avg3: null,
    avg5: null,
    volatility: null,
  });
  assert.equal(stats([20, 22]).avg3, null);
  assert.equal(stats([20, 22]).delta, 2);
  assert.equal(stats([10, 20, 30]).avg3, 20);
  assert.equal(stats([10, 20, 30, 40, 50]).avg5, 30);
  assert.equal(stats([5, 5, 5]).volatility, 0);
});
test("Başlangıç profili sonuç üretmez", () => {
  const b = fixture();
  assert.equal(b.exams.length, 0);
  assert.equal(b.tasks.length, 0);
  assert.equal(
    b.topics.every((t) => t.status === "Çalışılmadı"),
    true,
  );
});
test("Plan deterministik, çeşitli ve 7–9 saat sınırındadır", () => {
  const b = fixture();
  let i = 0;
  const a = generateWeek(b, "2026-10-26", () => `id${i++}`);
  i = 0;
  assert.deepEqual(
    a,
    generateWeek(b, "2026-10-26", () => `id${i++}`),
  );
  assert.deepEqual(checkPlan(a, b.settings), []);
  assert.ok(a.reduce((s, t) => s + t.minutes, 0) >= 420);
  assert.ok(new Set(a.map((t) => t.subject)).size >= 4);
  for (const d of ["2026-10-27", "2026-10-28", "2026-10-29"])
    assert.ok(
      a.filter((t) => t.date === d).reduce((s, t) => s + t.minutes, 0) <= 45,
    );
});
test("Plan tekrar üretildiğinde mevcut günleri çoğaltmaz", () => {
  const b = fixture();
  b.tasks = generateWeek(b, "2026-10-26", randomUUID);
  assert.equal(generateWeek(b, "2026-10-26", randomUUID).length, 0);
});
test("Çakışma, ulaşım ve günlük/haftalık aşım reddedilir", () => {
  const b = fixture(),
    t = task();
  assert.ok(checkPlan([t, { ...t, id: randomUUID() }], b.settings).length);
  assert.ok(
    checkPlan([{ ...task("2026-10-27"), start: "19:00" }], b.settings).length,
  );
  assert.ok(checkPlan([{ ...t, minutes: 120 }], b.settings).length);
  assert.ok(checkPlan([t], { ...b.settings, weeklyMinutes: 20 }).length);
});
test("Uygun yere ertelenir, eski kopya borç ve tamamlama hesabına eklenmez", () => {
  const b = fixture();
  const t = task();
  b.tasks = [t];
  const result = deferTask(b, t.id);
  assert.equal(result[0].status, "deferred");
  assert.ok(result[1].date > t.date);
  assert.deepEqual(checkPlan(result, b.settings), []);
  assert.equal(completion(result, "2026-10-26", "2026-11-01").planned, 30);
});
test("Boşluk yoksa erteleme yığma yapmaz", () => {
  const b = fixture();
  b.settings.windows = b.settings.windows.map((w) => ({ ...w, capacity: 0 }));
  const t = task();
  b.tasks = [t];
  assert.throws(() => deferTask(b, t.id), /uygun yer yok/);
  assert.equal(b.tasks[0].status, "planned");
});
test("Düşük tamamlama yükü sadeleştirir, artırmaz", () => {
  const b = fixture();
  b.tasks = Array.from({ length: 7 }, (_, i) => ({
    ...task(addDays("2026-10-26", -i - 1)),
    status: "skipped",
  }));
  const planned = generateWeek(b, "2026-10-26", randomUUID);
  assert.ok(planned.reduce((s, t) => s + t.minutes, 0) <= 315);
  assert.equal(b.settings.weeklyMinutes, 480);
});
test("Özel gün, deneme sonrası analiz ve yaklaşan tekrar dikkate alınır", () => {
  const b = fixture();
  b.settings.exceptions = [{ date: "2026-10-26", capacity: 0, note: "Tatil" }];
  b.exams = [{ ...exam(), date: "2026-10-25" }];
  b.settings.upcoming = [{ date: "2026-10-28", name: "Yaklaşan" }];
  const t = generateWeek(b, "2026-10-26", randomUUID);
  assert.equal(
    t.some((t) => t.date === "2026-10-26"),
    false,
  );
  assert.ok(t.some((t) => t.kind === "Yanlış analizi"));
  assert.ok(t.some((t) => t.kind === "Tekrar"));
  assert.equal(capacity(b.settings, "2026-10-26"), 0);
});
test("Kullanıcının eksik konu seçimi önceliği etkiler", () => {
  const b = fixture();
  b.topics = b.topics.map((t) =>
    t.subject === "AYT Biyoloji"
      ? { ...t, status: "Geliştirilmeli", review: true }
      : t,
  );
  const plan = generateWeek(b, "2026-10-26", randomUUID);
  assert.equal(plan[0].subject, "AYT Biyoloji");
});
test("Yedek tam doğrulanır; benzersiz kimlik ve sürüm zorunlu", () => {
  const b = fixture();
  assert.deepEqual(backupSchema.parse(JSON.parse(JSON.stringify(b))), b);
  assert.equal(backupSchema.safeParse({ ...b, version: 2 }).success, false);
  const t = task();
  assert.equal(backupSchema.safeParse({ ...b, tasks: [t, t] }).success, false);
  assert.equal(backupSchema.safeParse({ ...b, settings: {} }).success, false);
  assert.throws(() =>
    applyAction(b, { op: "restore", confirm: true, value: {} }),
  );
});
test("Geri yükleme yalnızca açık onayla ve çakışma yoksa uygulanır", () => {
  const b = fixture();
  assert.throws(() => applyAction(b, { op: "restore", value: b }));
  const t = task(addDays(weekStart(today()), 7));
  const bad = { ...b, tasks: [t, { ...t, id: randomUUID() }] };
  assert.throws(() =>
    applyAction(b, { op: "restore", confirm: true, value: bad }),
  );
  assert.deepEqual(
    applyAction(b, { op: "restore", confirm: true, value: b }),
    b,
  );
});
test("AI yalnızca tanımlı JSON; tarih ve kapasite kontrolü", () => {
  assert.throws(() => parseProposal('{"command":"rm -rf"}'));
  const b = fixture();
  const p = {
    summary: "Öneri",
    tasks: [
      {
        date: today(),
        start: "03:00",
        subject: "Matematik",
        topic: "Temel",
        kind: "Tekrar",
        minutes: 30,
      },
    ],
  };
  assert.throws(() => validateProposal(b, parseProposal(JSON.stringify(p))));
  assert.throws(() =>
    validateProposal(
      b,
      parseProposal(
        JSON.stringify({
          ...p,
          tasks: [{ ...p.tasks[0], date: addDays(today(), -1) }],
        }),
      ),
    ),
  );
});
test("AI arşivleme planı değiştirmez; onaysız ve tekrar uygulama yapılamaz", () => {
  const b = fixture();
  const generated = generateWeek(b, today(), randomUUID);
  assert.ok(generated.length);
  const t = generated[0];
  const raw = JSON.stringify({
    summary: "Kısa bir öneri",
    tasks: [
      {
        date: t.date,
        start: t.start,
        subject: t.subject,
        topic: t.topic,
        kind: t.kind,
        minutes: t.minutes,
      },
    ],
  });
  const archived = applyAction(b, { op: "aiSave", raw, apply: false });
  assert.equal(archived.tasks.length, 0);
  const applied = applyAction(archived, { op: "aiSave", raw, apply: true });
  assert.equal(applied.tasks.length, 1);
  assert.throws(() => applyAction(applied, { op: "aiSave", raw, apply: true }));
});
test("SQLite mutation ve geri yükleme atomiktir, tekrar açılınca korunur", async () => {
  process.env.ODAK_DB_PATH = "/tmp/odak-unit-" + randomUUID() + ".sqlite";
  const { read, mutate } = await import("../lib/db");
  const before = read();
  assert.throws(() => mutate((b) => ({ ...b, version: 2 as 1 })));
  assert.deepEqual(read(), before);
  mutate((b) => ({ ...b, exams: [exam()] }));
  assert.equal(read().exams.length, 1);
  const { execFileSync } = await import("node:child_process");
  const output = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      "const {read}=require('./lib/db'); console.log(read().exams.length)",
    ],
    { cwd: process.cwd(), env: process.env, encoding: "utf8" },
  );
  assert.equal(output.trim(), "1");
});

test("Yeni deneme ders önceliğini etkiler, veri yokken öneri uydurulmaz", async () => {
  const { focusRecommendation } = await import("../lib/planner");
  const b = fixture();
  assert.equal(focusRecommendation(b), null);
  b.settings.priority = "AYT Fizik";
  b.topics = b.topics.filter((t) =>
    ["TYT Türkçe", "TYT Temel Matematik"].includes(t.subject),
  );
  b.exams = [
    {
      ...exam(),
      results: [
        { subject: "Türkçe", questions: 40, correct: 40, wrong: 0, blank: 0 },
        {
          subject: "Temel Matematik",
          questions: 40,
          correct: 0,
          wrong: 0,
          blank: 40,
        },
      ],
    },
  ];
  assert.equal(
    generateWeek(b, today(), randomUUID).find(
      (t) => t.kind !== "Yanlış analizi",
    )!.subject,
    "TYT Temel Matematik",
  );
  assert.match(focusRecommendation(b)!, /Temel Matematik/);
  assert.match(focusRecommendation(b)!, /eğilim.*kanıtı değildir/);
});
