import {
  addDays,
  clock,
  minutes,
  weekStart,
  weekday,
  type Snapshot,
  type Settings,
  type Task,
  type Topic,
  net,
  today,
} from "./domain";
export function capacity(settings: Settings, date: string) {
  const w = settings.windows.find((w) => w.day === weekday(date))!;
  return Math.min(
    w.capacity,
    settings.exceptions.find((e) => e.date === date)?.capacity ?? 300,
    minutes(w.end) - minutes(w.start),
  );
}
export function active(t: Task) {
  return t.status === "planned" || t.status === "done";
}
export function checkPlan(tasks: Task[], s: Settings, from?: string) {
  const errors: string[] = [];
  const relevant = tasks.filter((t) => active(t) && (!from || t.date >= from));
  for (const date of new Set(relevant.map((t) => t.date))) {
    const day = relevant.filter((t) => t.date === date),
      w = s.windows.find((w) => w.day === weekday(date))!;
    if (day.length > 3)
      errors.push(`${date}: bir günde en fazla 3 görev olabilir.`);
    if (day.reduce((sum, t) => sum + t.minutes, 0) > capacity(s, date))
      errors.push(`${date}: günlük kapasite aşılıyor.`);
    for (const t of day) {
      const end = minutes(t.start) + t.minutes;
      if (minutes(t.start) < minutes(w.start) || end > minutes(w.end))
        errors.push(`${date}: görev müsaitlik dışında.`);
      if (
        s.events.some(
          (e) =>
            e.day === weekday(date) &&
            minutes(t.start) < minutes(e.end) &&
            minutes(e.start) < end,
        )
      )
        errors.push(`${date}: okul, ulaşım veya dinlenme ile çakışma.`);
    }
    const sorted = [...day].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++)
      if (
        minutes(sorted[i - 1].start) + sorted[i - 1].minutes >
        minutes(sorted[i].start)
      )
        errors.push(`${date}: görevler çakışıyor.`);
  }
  for (const week of new Set(relevant.map((t) => weekStart(t.date)))) {
    const used = tasks
      .filter((t) => active(t) && weekStart(t.date) === week)
      .reduce((sum, t) => sum + t.minutes, 0);
    if (used > s.weeklyMinutes)
      errors.push(`${week}: haftalık üst sınır aşılıyor.`);
  }
  return [...new Set(errors)];
}
export function completion(tasks: Task[], start: string, end: string) {
  const rows = tasks.filter(
    (t) => t.date >= start && t.date <= end && t.status !== "deferred",
  );
  const planned = rows.reduce((sum, t) => sum + t.minutes, 0);
  return {
    planned,
    done: rows
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + t.minutes, 0),
    count: rows.length,
  };
}
export function advice(b: Snapshot, date: string) {
  const recent = completion(b.tasks, addDays(date, -14), addDays(date, -1));
  if (recent.count < 6)
    return "İlk hedef düzen kurmak. Henüz tamamlanma eğilimi için yeterli kayıt yok.";
  const ratio = recent.done / recent.planned;
  if (ratio < 0.5)
    return "Son 14 gündeki planın yarısından azı tamamlandı. Haftalık üst sınırı ayarlardan azaltmayı düşünebilirsin; kaçırılan görevler borç olarak taşınmaz.";
  if (ratio >= 0.85)
    return "Son 14 gündeki planın en az %85’i tamamlandı. İstersen haftalık üst sınırı ayarlardan kademeli artırabilirsin; otomatik artış yapılmaz.";
  return "Plan, belirlediğin zaman sınırları içinde kalır. Tamamlanan süreler görev tahminidir.";
}
function topicScore(t: Topic, b: Snapshot, date: string) {
  let score = t.subject === b.settings.priority ? 6 : 0;
  if (t.status === "Geliştirilmeli") score += 5;
  if (t.review) score += 4;
  if (t.lastReviewed && addDays(t.lastReviewed, 14) <= date) score += 3;
  if (t.status === "Çalışılmadı") score += 1;
  const [type, ...parts] = t.subject.split(" ");
  const subject = parts.join(" ");
  const exams = b.exams
    .filter((e) => e.type === type)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const results = exams.flatMap((e) =>
    e.results.filter((r) => r.subject === subject),
  );
  const last = results.at(-1);
  if (last) {
    score += (1 - net(last) / last.questions) * 4;
    if (results.length >= 3 && net(last) < net(results.at(-3)!)) score += 1;
  }
  return score;
}
export function generateWeek(
  b: Snapshot,
  date: string,
  id: () => string,
): Task[] {
  const start = weekStart(date),
    end = addDays(start, 6);
  const tasks = [...b.tasks];
  const created: Task[] = [];
  const usedTopics = new Map<string, number>();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter(
    (d) => d >= date,
  );
  let remaining =
    b.settings.weeklyMinutes -
    tasks
      .filter((t) => active(t) && t.date >= start && t.date <= end)
      .reduce((s, t) => s + t.minutes, 0);
  const available = days.filter((d) => !tasks.some((t) => t.date === d));
  let remainingCap = available.reduce((s, d) => s + capacity(b.settings, d), 0);
  const history = completion(b.tasks, addDays(date, -14), addDays(date, -1));
  const simplify = history.count >= 6 && history.done / history.planned < 0.5;
  for (const d of available) {
    const cap = capacity(b.settings, d);
    let budget =
      Math.floor(
        Math.min(cap, remaining * (remainingCap ? cap / remainingCap : 0)) / 5,
      ) * 5;
    remainingCap -= cap;
    if (simplify) budget = Math.min(budget, 45);
    if (budget < 10) continue;
    const w = b.settings.windows.find((w) => w.day === weekday(d))!;
    let cursor = minutes(w.start);
    const count = budget >= 75 ? 3 : budget >= 30 ? 2 : 1;
    const recent = b.exams
      .filter((e) => e.date <= d && e.date >= addDays(d, -7))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    for (let i = 0; i < count; i++) {
      const duration = Math.min(120, Math.floor(budget / (count - i) / 5) * 5);
      if (duration < 10) continue;
      const topic = [...b.topics].sort(
        (a, c) =>
          topicScore(c, b, d) -
            (usedTopics.get(c.id) ?? 0) * 5 -
            (topicScore(a, b, d) - (usedTopics.get(a.id) ?? 0) * 5) ||
          a.id.localeCompare(c.id),
      )[0];
      if (!topic) continue;
      const review =
        i === 0 &&
        recent &&
        !tasks.some(
          (t) => t.kind === "Yanlış analizi" && t.topic === recent.name,
        );
      const upcoming = b.settings.upcoming.find(
        (e) => e.date >= d && e.date <= addDays(d, 2),
      );
      const task: Task = {
        id: id(),
        date: d,
        start: clock(cursor),
        subject: review ? `${recent.type} Genel` : topic.subject,
        topic: review ? recent.name : topic.name,
        kind: review
          ? "Yanlış analizi"
          : upcoming ||
              topic.review ||
              (topic.lastReviewed && addDays(topic.lastReviewed, 14) <= d)
            ? "Tekrar"
            : topic.status === "Çalışılmadı"
              ? "Konu anlatımı"
              : "Soru çözümü",
        minutes: duration,
        status: "planned",
        actualMinutes: null,
        source: "plan",
        reason: review
          ? "Son deneme kaydın için yanlış analizi alanı ayrıldı."
          : simplify
            ? "Son 14 günün tamamlanma kayıtları nedeniyle plan hafifletildi."
            : upcoming
              ? "Yaklaşan deneme nedeniyle kısa tekrar önerildi."
              : `${topic.status === "Geliştirilmeli" ? "İşaretlediğin eksik konu" : topic.subject === b.settings.priority ? "Seçtiğin öncelikli ders" : "Dersler arasında denge"}; günlük kapasite ve haftalık üst sınır korundu.`,
      };
      if (checkPlan([...tasks, task], b.settings, date).length === 0) {
        tasks.push(task);
        created.push(task);
        usedTopics.set(topic.id, (usedTopics.get(topic.id) ?? 0) + 1);
        remaining -= duration;
        budget -= duration;
        cursor += duration;
      }
    }
  }
  return created;
}
export function deferTask(b: Snapshot, id: string): Task[] {
  const original = b.tasks.find((t) => t.id === id);
  if (!original || original.status !== "planned")
    throw Error("Yalnızca planlı görev ertelenebilir.");
  for (let i = 1; i <= 7; i++) {
    const date = addDays(original.date < today() ? today() : original.date, i);
    const w = b.settings.windows.find((w) => w.day === weekday(date))!;
    for (
      let start = minutes(w.start);
      start + original.minutes <= minutes(w.end);
      start += 5
    ) {
      const candidate = {
        ...original,
        id: crypto.randomUUID(),
        date,
        start: clock(start),
        reason: "Senin isteğinle, kapasitesi uygun bir güne ertelendi.",
      };
      const result = b.tasks
        .map((t) => (t.id === id ? { ...t, status: "deferred" as const } : t))
        .concat(candidate);
      if (!checkPlan(result, b.settings, today()).length) return result;
    }
  }
  throw Error(
    "Sonraki 7 günde uygun yer yok. Görevi kısaltabilir veya atlayabilirsin; görevler yığılmadı.",
  );
}

/** A study priority, not a prediction or a diagnosis of a specific topic. */
export function focusRecommendation(b: Snapshot): string | null {
  const latest = [...b.exams]
    .reverse()
    .sort((a, c) => c.date.localeCompare(a.date))
    .find((e) => e.results.length > 0);
  if (!latest) return null;
  const lowest = [...latest.results].sort(
    (a, c) => net(a) / a.questions - net(c) / c.questions,
  )[0];
  return `${latest.name} kaydında, girilen dersler arasında net/soru oranı en düşük ders ${latest.type} ${lowest.subject}. Yeni planlarda bu derse öncelik puanı eklenir. Bu tek kayıt bir eğilim veya konu eksikliği kanıtı değildir.`;
}
