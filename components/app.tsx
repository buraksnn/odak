"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import {
  Sun,
  ChartNoAxesCombined,
  SlidersHorizontal,
  NotebookPen,
  ArrowUpRight,
  Check,
  Plus,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Leaf,
  Download,
  Sparkles,
} from "lucide-react";
import {
  addDays,
  today,
  weekStart,
  weekday,
  total,
  type Snapshot,
  type Task,
  type Exam,
} from "@/lib/domain";
import {
  advice,
  completion,
  capacity,
  focusRecommendation,
} from "@/lib/planner";
import { Modal, Empty, fmt, num, type Action } from "./ui";
import { TaskForm } from "./task-form";
import { ExamForm, ExamCharts } from "./exams";
import { SettingsForm, Backup } from "./settings";
import { TopicList, AiBridge } from "./insights";
export default function App({ initial }: { initial: Snapshot }) {
  const [b, setB] = useState(initial),
    [tab, setTab] = useState("Bugün"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [onboarding, setOnboarding] = useState(!initial.settings.onboarded);
  const [date, setDate] = useState(today()),
    [editor, setEditor] = useState<Task | null | undefined>(),
    [exam, setExam] = useState<Exam | null | undefined>(),
    [ai, setAi] = useState(false),
    [template, setTemplate] = useState(false);
  const inFlight = useRef(false);
  const act: Action = async (value) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setB(data);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const dateNow = today();
  const week = weekStart(date);
  const rows = b.tasks
    .filter((t) => t.date === date)
    .sort((a, c) => a.start.localeCompare(c.start));
  const active = rows.filter(
    (t) => t.status === "planned" || t.status === "done",
  );
  const done = active.filter((t) => t.status === "done");
  const nav = [
    { name: "Bugün", icon: Sun },
    { name: "Denemeler", icon: NotebookPen },
    { name: "Gelişim", icon: ChartNoAxesCombined },
    { name: "Ayarlar", icon: SlidersHorizontal },
  ];
  return (
    <div className="shell" aria-busy={busy}>
      <aside className="sidebar">
        <Link className="brand" href="/">
          odak<span>.</span>
        </Link>
        <div className="workspace-label">KİŞİSEL ÇALIŞMA ALANIN</div>
        <nav aria-label="Ana gezinme">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "selected" : ""}
              onClick={() => {
                setTab(name);
                setError("");
              }}
              aria-current={tab === name ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{name}</span>
              {tab === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="tiny-dot" />
          Yerel ve sana özel<small>Verilerin bu cihazda kalır.</small>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span>
            {b.settings.exam} <span className="slash">/</span>{" "}
            {b.settings.field}
          </span>
          <span className="target">
            Hedef · İlk {b.settings.rank.toLocaleString("tr-TR")}
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Uyarıyı kapat">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="content">
          {tab === "Bugün" && (
            <>
              <div className="eyebrow">
                {fmt(date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="page-heading">
                <div>
                  <h1>
                    Bugün, biraz daha ileri<span>.</span>
                  </h1>
                  <p>Her şeyi değil, bugün için önemli olanı.</p>
                </div>
                <span className="round-sun">
                  <Sun size={28} strokeWidth={1.3} />
                </span>
              </div>
              <div className="week-strip">
                <button
                  className="icon"
                  onClick={() => setDate(addDays(date, -7))}
                  aria-label="Önceki hafta"
                >
                  <ChevronLeft size={17} />
                </button>
                {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(
                  (d) => (
                    <button
                      key={d}
                      className={`day ${d === date ? "current" : ""}`}
                      onClick={() => setDate(d)}
                    >
                      <span>{fmt(d, { weekday: "short" })}</span>
                      <strong>{fmt(d, { day: "numeric" })}</strong>
                      <i
                        className={
                          b.tasks.some(
                            (t) => t.date === d && t.status === "planned",
                          )
                            ? "has-task"
                            : ""
                        }
                      />
                    </button>
                  ),
                )}
                <button
                  className="icon"
                  onClick={() => setDate(addDays(date, 7))}
                  aria-label="Sonraki hafta"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="today-layout">
                <section>
                  <div className="section-heading">
                    <h2>
                      Günün planı <span className="count">{active.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      disabled={date < dateNow}
                      onClick={() => setEditor(null)}
                    >
                      <Plus size={15} /> Görev ekle
                    </button>
                  </div>
                  <div className="plan-summary">
                    <span>
                      <Clock3 size={15} />
                      {active.reduce((s, t) => s + t.minutes, 0)} dk planlanan
                    </span>
                    <span>
                      {done.length}/{active.length} tamamlandı
                    </span>
                  </div>
                  {rows.length === 0 ? (
                    <Empty>
                      <h3>Bugüne biraz alan açalım.</h3>
                      <p>
                        Müsaitliğine göre hafif bir plan önerelim.
                        <br />
                        Öneriler, çalışma kaydı olarak sayılmaz.
                      </p>
                      {date >= dateNow && date <= addDays(dateNow, 7) && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => act({ op: "generate", date })}
                        >
                          Haftalık plan öner <ArrowRight size={16} />
                        </button>
                      )}
                    </Empty>
                  ) : (
                    <div className="task-list">
                      {rows.map((t) => (
                        <article key={t.id} className={`task ${t.status}`}>
                          <button
                            aria-label={`${t.topic} ${t.status === "done" ? "tamamlamayı geri al" : "tamamla"}`}
                            className="check"
                            disabled={
                              busy ||
                              t.status === "deferred" ||
                              t.date > dateNow
                            }
                            onClick={() =>
                              act({
                                op: "status",
                                id: t.id,
                                status:
                                  t.status === "done" ? "planned" : "done",
                              })
                            }
                          >
                            {t.status === "done" && <Check size={17} />}
                          </button>
                          <div className="task-main">
                            <div className="task-meta">
                              <span>{t.subject}</span>
                              <span>
                                {t.start} · {t.minutes} dk
                              </span>
                            </div>
                            <h3>{t.topic}</h3>
                            <p>
                              {t.kind}
                              {t.actualMinutes !== null &&
                                ` · Girdiğin gerçek süre: ${t.actualMinutes} dk`}
                            </p>
                            <details>
                              <summary>Neden bu görev?</summary>
                              <p>{t.reason}</p>
                            </details>
                            {t.status === "planned" ? (
                              <div className="task-actions">
                                <button
                                  disabled={busy}
                                  onClick={() => setEditor(t)}
                                >
                                  Düzenle
                                </button>
                                <button
                                  disabled={busy || t.minutes <= 10}
                                  onClick={() =>
                                    act({
                                      op: "task",
                                      value: {
                                        ...t,
                                        minutes: Math.max(10, t.minutes - 10),
                                        reason:
                                          "Senin isteğinle 10 dakika kısaltıldı.",
                                      },
                                    })
                                  }
                                >
                                  Kısalt −10 dk
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => act({ op: "defer", id: t.id })}
                                >
                                  Ertele
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    act({
                                      op: "status",
                                      id: t.id,
                                      status: "skipped",
                                    })
                                  }
                                >
                                  Atla
                                </button>
                              </div>
                            ) : (
                              <span className="status-label">
                                {t.status === "done"
                                  ? "Tamamlandı"
                                  : t.status === "deferred"
                                    ? "Uygun bir güne taşındı"
                                    : "Atlandı · birikmiş borç yok"}
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="under-plan">
                    {date === dateNow && (
                      <button
                        className="text-button muted"
                        disabled={busy}
                        onClick={() => act({ op: "unavailable" })}
                      >
                        Bugün müsait değilim
                      </button>
                    )}
                    <span>Tamamlama süreleri tahminidir; sayaç değildir.</span>
                  </div>
                  {focusRecommendation(b) && (
                    <p className="focus-note">{focusRecommendation(b)}</p>
                  )}
                  <div className="section-heading lower">
                    <h2>Haftaya bir bakış</h2>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        act({
                          op: "generate",
                          date: addDays(weekStart(dateNow), 7),
                        })
                      }
                    >
                      Gelecek haftayı öner <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="week-overview">
                    {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(
                      (d) => {
                        const planned = b.tasks.filter(
                          (t) =>
                            t.date === d &&
                            (t.status === "planned" || t.status === "done"),
                        );
                        return (
                          <button key={d} onClick={() => setDate(d)}>
                            <span>{fmt(d, { weekday: "short" })}</span>
                            <strong>
                              {planned.reduce((s, t) => s + t.minutes, 0)}
                              <small> dk</small>
                            </strong>
                            <span>
                              {planned.length
                                ? `${planned.length} görev`
                                : "Plan yok"}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>
                <aside className="day-aside">
                  <div className="note-card">
                    <span className="eyebrow">
                      <Leaf size={15} /> KÜÇÜK ADIMLAR
                    </span>
                    <h3>
                      Plan sana
                      <br />
                      uyum sağlasın.
                    </h3>
                    <p>{advice(b, dateNow)}</p>
                    <div className="note-divider" />
                    <span className="small">Haftalık üst sınır</span>
                    <strong className="weekly-limit">
                      {num(b.settings.weeklyMinutes / 60)} <small>saat</small>
                    </strong>
                    <button
                      className="text-button"
                      onClick={() => setTab("Ayarlar")}
                    >
                      Müsaitliğini düzenle <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="schedule">
                    <h3>Günün çerçevesi</h3>
                    {b.settings.events
                      .filter((e) => e.day === weekday(date))
                      .sort((a, c) => a.start.localeCompare(c.start))
                      .map((e, i) => (
                        <div key={i}>
                          <span>
                            {e.start}–{e.end}
                          </span>
                          <p>{e.label}</p>
                        </div>
                      ))}
                    <div className="free-window">
                      <span>
                        {
                          b.settings.windows.find(
                            (w) => w.day === weekday(date),
                          )?.start
                        }
                        –
                        {
                          b.settings.windows.find(
                            (w) => w.day === weekday(date),
                          )?.end
                        }
                      </span>
                      <p>
                        Çalışmaya uygun · en fazla {capacity(b.settings, date)}{" "}
                        dk
                      </p>
                    </div>
                    {b.settings.exceptions
                      .filter((e) => e.date === date)
                      .map((e) => (
                        <p key={e.date}>{e.note}</p>
                      ))}
                  </div>
                </aside>
              </div>
            </>
          )}
          {tab === "Denemeler" && (
            <>
              <div className="eyebrow">ÖLÇ, ANLA, YÖN VER</div>
              <div className="page-heading">
                <div>
                  <h1>
                    Denemelerin<span>.</span>
                  </h1>
                  <p>Bir sonuç değil, zaman içindeki değişim önemli.</p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setTemplate(false);
                    setExam(null);
                  }}
                >
                  <Plus size={17} /> Deneme ekle
                </button>
              </div>
              <ExamCharts exams={b.exams} />
              <div className="section-heading lower">
                <h2>Deneme kayıtları</h2>
                <a className="text-button" href="/api/export">
                  <Download size={15} /> CSV indir
                </a>
              </div>
              {!b.exams.length ? (
                <Empty>
                  <h3>İlk denemen için yer hazır.</h3>
                  <p>
                    Başlangıç seviyen bir beyan; deneme sonucu değil.
                    <br />
                    Gerçek sonuçlarını eklediğinde gelişimin burada görünür.
                  </p>
                </Empty>
              ) : (
                <div className="exam-list">
                  {[...b.exams]
                    .sort((a, c) => c.date.localeCompare(a.date))
                    .map((e) => (
                      <article key={e.id}>
                        <span className="badge">{e.type}</span>
                        <div>
                          <h3>{e.name}</h3>
                          <p>
                            {fmt(e.date)} · {e.results.length}/4 ders girildi
                          </p>
                          {e.note && <p>{e.note}</p>}
                        </div>
                        <strong>
                          {num(total(e))}
                          <small>
                            {total(e) === null ? "eksik sonuç" : "net"}
                          </small>
                        </strong>
                        <div>
                          <button
                            className="text-button"
                            onClick={() => {
                              setTemplate(false);
                              setExam(e);
                            }}
                          >
                            Düzenle
                          </button>
                          <button
                            className="text-button"
                            onClick={() => {
                              setTemplate(true);
                              setExam({
                                ...e,
                                id: crypto.randomUUID(),
                                name: "",
                                date: dateNow,
                                rank: null,
                                participants: null,
                                note: "",
                              });
                            }}
                          >
                            Biçimi kullan
                          </button>
                          <button
                            className="text-button danger"
                            onClick={() => {
                              if (
                                confirm("Bu deneme kalıcı olarak silinsin mi?")
                              )
                                act({
                                  op: "deleteExam",
                                  id: e.id,
                                  confirm: true,
                                });
                            }}
                          >
                            Sil
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </>
          )}
          {tab === "Gelişim" && (
            <>
              <div className="eyebrow">GEÇMİŞTEN ÖĞREN</div>
              <div className="page-heading">
                <div>
                  <h1>
                    Gelişimin<span>.</span>
                  </h1>
                  <p>Gerçek kayıtlar, sakin bir bakış.</p>
                </div>
                <button className="secondary" onClick={() => setAi(true)}>
                  <Sparkles size={16} /> Haftamı ChatGPT ile analiz et
                </button>
              </div>
              <ExamCharts exams={b.exams} />
              <div className="two-columns">
                <section>
                  <div className="section-heading">
                    <h2>Haftalık plan tamamlama</h2>
                  </div>
                  {Array.from({ length: 4 }, (_, i) =>
                    addDays(weekStart(dateNow), -7 * i),
                  ).map((start) => {
                    const c = completion(
                      b.tasks,
                      start,
                      addDays(start, 6) < dateNow ? addDays(start, 6) : dateNow,
                    );
                    return (
                      <div className="completion" key={start}>
                        <div>
                          <span>{fmt(start)} haftası</span>
                          <strong>
                            {c.planned
                              ? `%${Math.round((c.done / c.planned) * 100)}`
                              : "Kayıt yok"}
                          </strong>
                        </div>
                        <div className="track">
                          <i
                            style={{
                              width: `${c.planned ? (c.done / c.planned) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p>
                          {c.done}/{c.planned} tahmini dakika · {c.count} görev
                          {start === weekStart(dateNow)
                            ? " · bugüne kadar"
                            : ""}
                        </p>
                      </div>
                    );
                  })}
                  <p className="muted small">
                    Eksik kayıtlar başarısızlık sayılmaz. Ertelenen görevin eski
                    kopyası hesaba katılmaz.
                  </p>
                </section>
                <section className="insight">
                  <Leaf size={22} />
                  <h3>Ritmini bulmak zaman alır.</h3>
                  <p>{advice(b, dateNow)}</p>
                  <p className="small muted">
                    Net değişimini tek bir göreve bağlamıyoruz. Sıralama tahmini
                    üretmiyoruz.
                  </p>
                </section>
              </div>
              <TopicList b={b} act={act} />
            </>
          )}
          {tab === "Ayarlar" && (
            <>
              <div className="eyebrow">SANA GÖRE</div>
              <div className="page-heading">
                <div>
                  <h1>
                    Ayarların<span>.</span>
                  </h1>
                  <p>Hayatın değiştikçe planın da değişebilir.</p>
                </div>
              </div>
              <SettingsForm
                key={JSON.stringify(b.settings)}
                settings={b.settings}
                act={act}
              />
              <Backup b={b} act={act} />
            </>
          )}
          <footer>
            odak. <span>Daha az karar, daha çok çalışma.</span>
            <span className="footer-right">Kendi hızında.</span>
          </footer>
        </div>
      </main>
      {onboarding && (
        <Modal title="Kendine alan aç." onClose={() => setOnboarding(false)}>
          <p className="modal-intro">
            odak. seni takip etmek için değil, ne çalışacağına karar vermeni
            kolaylaştırmak için burada. Hazır profili düzenleyebilir veya
            atlayabilirsin.
          </p>
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <SettingsForm
            settings={b.settings}
            compact
            act={async (a) => {
              const ok = await act(a);
              if (ok) setOnboarding(false);
              return ok;
            }}
          />
          <button
            className="text-button"
            onClick={() => {
              act({
                op: "settings",
                value: { ...b.settings, onboarded: true },
              }).then((ok) => {
                if (ok) setOnboarding(false);
              });
            }}
          >
            Şimdilik hazır profille devam et
          </button>
        </Modal>
      )}
      {editor !== undefined && (
        <Modal
          title={editor ? "Görevi düzenle" : "Bir çalışma ekle"}
          onClose={() => setEditor(undefined)}
        >
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <TaskForm
            task={editor}
            date={date}
            act={act}
            close={() => setEditor(undefined)}
          />
        </Modal>
      )}
      {exam !== undefined && (
        <Modal
          title={exam ? "Denemeyi düzenle" : "Yeni deneme"}
          onClose={() => setExam(undefined)}
        >
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <ExamForm
            exam={exam}
            template={template}
            b={b}
            act={act}
            close={() => setExam(undefined)}
          />
        </Modal>
      )}
      {ai && (
        <Modal title="Birlikte düşünmek için" onClose={() => setAi(false)}>
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <AiBridge b={b} act={act} />
        </Modal>
      )}
      {busy && (
        <div className="saving" role="status">
          Kaydediliyor…
        </div>
      )}
    </div>
  );
}
