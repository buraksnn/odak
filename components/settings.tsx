"use client";
import { useState } from "react";
import { Plus, X, Download } from "lucide-react";
import { subjects, today, type Snapshot, type Settings } from "@/lib/domain";
import { Field, Submit, Modal, type Action } from "./ui";
const days = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];
export function SettingsForm({
  settings,
  act,
  compact = false,
}: {
  settings: Settings;
  act: Action;
  compact?: boolean;
}) {
  const [s, setS] = useState(settings),
    [saved, setSaved] = useState(false);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setS({ ...s, [key]: value });
  };
  return (
    <form
      className="settings-form form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await act({ op: "settings", value: { ...s, onboarded: true } }))
          setSaved(true);
      }}
    >
      <h2>Hedef ve başlangıç</h2>
      <div className="form-row">
        <Field label="Hedef sınav">
          <input
            required
            value={s.exam}
            onChange={(e) => set("exam", e.target.value)}
          />
        </Field>
        <Field label="Hedef sıralama">
          <input
            required
            type="number"
            min={1}
            value={s.rank}
            onChange={(e) => set("rank", Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Alan">
          <input
            required
            value={s.field}
            onChange={(e) => set("field", e.target.value)}
          />
        </Field>
        <Field label="Öncelikli ders">
          <select
            value={s.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {Object.entries(subjects).flatMap(([type, list]) =>
              list.map((sub) => (
                <option key={type + sub}>
                  {type} {sub}
                </option>
              )),
            )}
          </select>
        </Field>
      </div>
      <Field label="Üniversite ve bölüm hedefi">
        <input
          value={s.goal}
          maxLength={300}
          onChange={(e) => set("goal", e.target.value)}
        />
      </Field>
      {!compact && (
        <Field label="Başlangıç beyanı (deneme kaydı değildir)">
          <textarea
            value={s.baseline}
            maxLength={400}
            onChange={(e) => set("baseline", e.target.value)}
          />
        </Field>
      )}
      <Field label="Haftalık bireysel çalışma üst sınırı (dakika)">
        <input
          type="number"
          required
          min={60}
          max={1500}
          value={s.weeklyMinutes}
          onChange={(e) => set("weeklyMinutes", Number(e.target.value))}
        />
      </Field>
      <p className="small muted">
        Başlangıç önerisi 420–540 dk (7–9 saat). Yük kendiliğinden artırılmaz.
      </p>
      <h2>Müsaitlik ve günlük kapasite</h2>
      <p className="small muted">
        Bu aralıklar yemek ve dinlenmeden sonrasını kapsar. Kapasiteyi
        yorgunluğuna göre azaltabilirsin. Pazar varsayılan olarak deneme günü
        değildir.
      </p>
      <div className="availability">
        <div className="availability-row labels">
          <span>Gün</span>
          <span>Başlangıç</span>
          <span>Bitiş</span>
          <span>En çok dk</span>
        </div>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const w = s.windows.find((w) => w.day === day)!;
          return (
            <div className="availability-row" key={day}>
              <span>{days[day]}</span>
              <input
                aria-label={`${days[day]} başlangıç`}
                type="time"
                required
                value={w.start}
                onChange={(e) =>
                  set(
                    "windows",
                    s.windows.map((x) =>
                      x.day === day ? { ...x, start: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`${days[day]} bitiş`}
                type="time"
                required
                value={w.end}
                onChange={(e) =>
                  set(
                    "windows",
                    s.windows.map((x) =>
                      x.day === day ? { ...x, end: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`${days[day]} kapasite`}
                type="number"
                required
                min={0}
                max={300}
                value={w.capacity}
                onChange={(e) =>
                  set(
                    "windows",
                    s.windows.map((x) =>
                      x.day === day
                        ? { ...x, capacity: Number(e.target.value) }
                        : x,
                    ),
                  )
                }
              />
            </div>
          );
        })}
      </div>
      {!compact && (
        <>
          <details className="settings-details">
            <summary>Okul, dershane, ulaşım ve dinlenme saatleri</summary>
            <p className="small muted">
              Salı–Perşembe okul ile dershane başlangıcı 10 dk çakışır. Çalışma
              aralığı bu kısıtlarla çakışamaz. Tüm engelli saatler
              düzenlenebilir.
            </p>
            {s.events.map((e, i) => (
              <div className="event-row" key={i}>
                <select
                  aria-label={`Kısıt ${i + 1} gün`}
                  value={e.day}
                  onChange={(v) =>
                    set(
                      "events",
                      s.events.map((x, j) =>
                        i === j ? { ...x, day: Number(v.target.value) } : x,
                      ),
                    )
                  }
                >
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Kısıt ${i + 1} açıklama`}
                  required
                  value={e.label}
                  onChange={(v) =>
                    set(
                      "events",
                      s.events.map((x, j) =>
                        i === j ? { ...x, label: v.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Kısıt ${i + 1} başlangıç`}
                  required
                  type="time"
                  value={e.start}
                  onChange={(v) =>
                    set(
                      "events",
                      s.events.map((x, j) =>
                        i === j ? { ...x, start: v.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Kısıt ${i + 1} bitiş`}
                  required
                  type="time"
                  value={e.end}
                  onChange={(v) =>
                    set(
                      "events",
                      s.events.map((x, j) =>
                        i === j ? { ...x, end: v.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  className="icon"
                  type="button"
                  aria-label={`Kısıt ${i + 1} sil`}
                  onClick={() =>
                    set(
                      "events",
                      s.events.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              className="text-button"
              type="button"
              onClick={() =>
                set("events", [
                  ...s.events,
                  { day: 1, label: "Özel zaman", start: "17:00", end: "18:00" },
                ])
              }
            >
              <Plus size={14} /> Saat kısıtı ekle
            </button>
          </details>
          <details className="settings-details">
            <summary>Tatil, özel gün ve yaklaşan denemeler</summary>
            <h3>Güne özel kapasite</h3>
            <p className="small muted">
              Müsait olmadığın gün için 0 dk gir. Daha yüksek kapasite için
              haftalık müsaitlik aralığını da düzenle.
            </p>
            {s.exceptions.map((x, i) => (
              <div className="exception-row" key={i}>
                <input
                  aria-label={`Özel gün ${i + 1} tarih`}
                  type="date"
                  required
                  value={x.date}
                  onChange={(e) =>
                    set(
                      "exceptions",
                      s.exceptions.map((x, j) =>
                        j === i ? { ...x, date: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Özel gün ${i + 1} kapasite`}
                  type="number"
                  min={0}
                  max={300}
                  required
                  value={x.capacity}
                  onChange={(e) =>
                    set(
                      "exceptions",
                      s.exceptions.map((x, j) =>
                        j === i
                          ? { ...x, capacity: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Özel gün ${i + 1} not`}
                  value={x.note}
                  onChange={(e) =>
                    set(
                      "exceptions",
                      s.exceptions.map((x, j) =>
                        j === i ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  className="icon"
                  type="button"
                  aria-label={`Özel gün ${i + 1} sil`}
                  onClick={() =>
                    set(
                      "exceptions",
                      s.exceptions.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              className="text-button"
              type="button"
              onClick={() =>
                set("exceptions", [
                  ...s.exceptions,
                  { date: today(), capacity: 0, note: "" },
                ])
              }
            >
              <Plus size={14} /> Özel gün ekle
            </button>
            <h3>Yaklaşan denemeler</h3>
            {s.upcoming.map((x, i) => (
              <div className="exception-row" key={i}>
                <input
                  aria-label={`Yaklaşan deneme ${i + 1} tarih`}
                  type="date"
                  required
                  value={x.date}
                  onChange={(e) =>
                    set(
                      "upcoming",
                      s.upcoming.map((x, j) =>
                        j === i ? { ...x, date: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Yaklaşan deneme ${i + 1} ad`}
                  required
                  value={x.name}
                  onChange={(e) =>
                    set(
                      "upcoming",
                      s.upcoming.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  className="icon"
                  type="button"
                  aria-label={`Yaklaşan deneme ${i + 1} sil`}
                  onClick={() =>
                    set(
                      "upcoming",
                      s.upcoming.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              className="text-button"
              type="button"
              onClick={() =>
                set("upcoming", [...s.upcoming, { date: today(), name: "" }])
              }
            >
              <Plus size={14} /> Deneme tarihi ekle
            </button>
          </details>
          <details className="settings-details">
            <summary>Varsayılan soru sayıları</summary>
            {(["TYT", "AYT"] as const).map((type) => (
              <div key={type}>
                <h3>{type}</h3>
                <div className="form-row">
                  {subjects[type].map((sub, i) => (
                    <Field key={sub} label={sub}>
                      <input
                        required
                        type="number"
                        min={1}
                        max={100}
                        value={s.questionCounts[type][i]}
                        onChange={(e) =>
                          set("questionCounts", {
                            ...s.questionCounts,
                            [type]: s.questionCounts[type].map((n, j) =>
                              j === i ? Number(e.target.value) : n,
                            ),
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </>
      )}
      <div className="form-buttons">
        <Submit>{compact ? "Bu profille başla" : "Ayarları kaydet"}</Submit>
        {saved && <span role="status">Ayarlar kaydedildi.</span>}
      </div>
    </form>
  );
}
export function Backup({ b, act }: { b: Snapshot; act: Action }) {
  const [restore, setRestore] = useState<unknown>(),
    [err, setErr] = useState(""),
    [message, setMessage] = useState("");
  return (
    <section className="backup">
      <h2>Verilerin sende</h2>
      <p>
        Veritabanı bu cihazda saklanır. Yedekleri kişisel bir klasörde tut;
        GitHub’a yükleme.
      </p>
      <div className="backup-actions">
        <a className="secondary" href="/api/backup">
          <Download size={16} /> JSON yedeği indir
        </a>
        <label className="secondary file-label">
          Yedekten geri yükle
          <input
            type="file"
            accept="application/json,.json"
            aria-label="JSON yedeği seç"
            onChange={async (e) => {
              setErr("");
              setMessage("");
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 12000000) throw Error("En fazla 12 MB.");
                const { backupSchema } = await import("@/lib/domain");
                setRestore(backupSchema.parse(JSON.parse(await file.text())));
              } catch {
                setErr("Yedek geçersiz. Mevcut veriler değiştirilmedi.");
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {err && (
        <p role="alert" className="danger">
          {err}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {restore !== undefined && (
        <Modal title="Yedeği geri yükle" onClose={() => setRestore(undefined)}>
          <p>
            Bu işlem mevcut tüm verileri yedekteki verilerle değiştirecek. Önce
            mevcut JSON yedeğini indirmeni öneririz.
          </p>
          <p>
            {(restore as Snapshot).exams.length} deneme ·{" "}
            {(restore as Snapshot).tasks.length} görev ·{" "}
            {(restore as Snapshot).topics.length} konu
          </p>
          <button
            className="primary"
            onClick={async () => {
              if (await act({ op: "restore", value: restore, confirm: true })) {
                setRestore(undefined);
                setMessage("Yedek doğrulandı ve geri yüklendi.");
              }
            }}
          >
            Onaylıyorum, verileri değiştir
          </button>
        </Modal>
      )}
      <details className="settings-details danger">
        <summary>Verileri sil</summary>
        <p>
          {b.exams.length} deneme, {b.tasks.length} görev, konu durumları ve
          analizler silinir. Profil korunur.
        </p>
        <button
          className="secondary danger"
          onClick={() => {
            const typed = prompt("Kalıcı silme için TÜM VERİLERİ SİL yaz.");
            if (typed === "TÜM VERİLERİ SİL")
              act({ op: "reset", confirm: typed });
          }}
        >
          Tüm çalışma kayıtlarını sil
        </button>
      </details>
    </section>
  );
}
