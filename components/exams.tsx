"use client";
import { useState, type FormEvent } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import {
  subjects,
  today,
  net,
  total,
  stats,
  type Snapshot,
  type Exam,
} from "@/lib/domain";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Field, Submit, fmt, num, type Action } from "./ui";
export function ExamForm({
  exam,
  b,
  act,
  close,
  template = false,
}: {
  exam: Exam | null;
  template?: boolean;
  b: Snapshot;
  act: Action;
  close: () => void;
}) {
  const [type, setType] = useState<"TYT" | "AYT">(exam?.type ?? "TYT");
  const [counts, setCounts] = useState(
    exam
      ? subjects[exam.type].map(
          (s, i) =>
            exam.results.find((r) => r.subject === s)?.questions ??
            b.settings.questionCounts[exam.type][i],
        )
      : b.settings.questionCounts.TYT,
  );
  const [results, setResults] = useState<
    Record<string, { correct: string; wrong: string; blank: string }>
  >(() =>
    Object.fromEntries(
      (template ? [] : exam?.results)?.map((r) => [
        r.subject,
        {
          correct: String(r.correct),
          wrong: String(r.wrong),
          blank: String(r.blank),
        },
      ]) ?? [],
    ),
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const output = subjects[type].flatMap((s, i) => {
      const r = results[s];
      if (!r || Object.values(r).every((v) => v === "")) return [];
      return [
        {
          subject: s,
          questions: counts[i],
          correct: r.correct === "" ? NaN : Number(r.correct),
          wrong: r.wrong === "" ? NaN : Number(r.wrong),
          blank: r.blank === "" ? NaN : Number(r.blank),
        },
      ];
    });
    if (
      await act({
        op: "exam",
        value: {
          id: exam?.id ?? crypto.randomUUID(),
          name: data.get("name"),
          date: data.get("date"),
          type,
          results: output,
          rank: data.get("rank") ? Number(data.get("rank")) : null,
          participants: data.get("participants")
            ? Number(data.get("participants"))
            : null,
          note: data.get("note"),
        },
      })
    )
      close();
  }
  const live = subjects[type]
    .map((s) => results[s])
    .filter((r) => r && Object.values(r).every((v) => v !== ""));
  return (
    <form className="form-stack" onSubmit={save}>
      <Field label="Deneme adı">
        <input name="name" required maxLength={100} defaultValue={exam?.name} />
      </Field>
      <div className="form-row">
        <Field label="Tarih">
          <input
            type="date"
            name="date"
            required
            max={today()}
            defaultValue={exam?.date ?? today()}
          />
        </Field>
        <Field label="Sınav türü">
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as "TYT" | "AYT";
              setType(t);
              setCounts(b.settings.questionCounts[t]);
              setResults({});
            }}
          >
            <option>TYT</option>
            <option>AYT</option>
          </select>
        </Field>
      </div>
      <p className="small muted">
        Bir ders bilinmiyorsa tüm alanlarını boş bırak. Girilen derste doğru +
        yanlış + boş = soru sayısı olmalı.
      </p>
      <div className="result-table">
        <div className="result-row result-label">
          <span>Ders</span>
          <span>Soru</span>
          <span>Doğru</span>
          <span>Yanlış</span>
          <span>Boş</span>
        </div>
        {subjects[type].map((s, i) => (
          <div className="result-row" key={s}>
            <span>{s}</span>
            <input
              aria-label={`${s} soru`}
              type="number"
              min={1}
              max={100}
              required
              value={counts[i]}
              onChange={(e) =>
                setCounts(
                  counts.map((n, j) => (j === i ? Number(e.target.value) : n)),
                )
              }
            />
            {(["correct", "wrong", "blank"] as const).map((k, j) => (
              <input
                key={k}
                aria-label={`${s} ${["doğru", "yanlış", "boş"][j]}`}
                type="number"
                min={0}
                max={counts[i]}
                value={results[s]?.[k] ?? ""}
                onChange={(e) =>
                  setResults({
                    ...results,
                    [s]: {
                      ...(results[s] ?? { correct: "", wrong: "", blank: "" }),
                      [k]: e.target.value,
                    },
                  })
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="net-preview">
        {live.length === 4
          ? "Toplam net"
          : "Girilen derslerin neti (eksik sonuç)"}{" "}
        <strong>
          {num(
            live.reduce(
              (s, r) =>
                s + net({ correct: Number(r.correct), wrong: Number(r.wrong) }),
              0,
            ),
          )}
        </strong>
      </div>
      <div className="form-row">
        <Field label="Sıralama (isteğe bağlı)">
          <input
            type="number"
            min={1}
            name="rank"
            defaultValue={exam?.rank ?? ""}
          />
        </Field>
        <Field label="Katılımcı (isteğe bağlı)">
          <input
            type="number"
            min={1}
            name="participants"
            defaultValue={exam?.participants ?? ""}
          />
        </Field>
      </div>
      <Field label="Kısa not (isteğe bağlı)">
        <textarea name="note" maxLength={2000} defaultValue={exam?.note} />
      </Field>
      <Submit>Denemeyi kaydet</Submit>
    </form>
  );
}
export function ExamCharts({ exams }: { exams: Exam[] }) {
  const [type, setType] = useState<"TYT" | "AYT">("TYT");
  const [subject, setSubject] = useState("Toplam");
  const sorted = exams
    .filter((e) => e.type === type)
    .sort((a, b) => a.date.localeCompare(b.date));
  const data = sorted.map((e) => ({
    date: fmt(e.date),
    name: e.name,
    value:
      subject === "Toplam"
        ? total(e)
        : (() => {
            const r = e.results.find((r) => r.subject === subject);
            return r ? net(r) : null;
          })(),
  }));
  const metrics = stats(
    data.flatMap((d) => (d.value === null ? [] : [d.value])),
  );
  return (
    <section className="chart-section">
      <div className="section-heading">
        <div className="segmented">
          {(["TYT", "AYT"] as const).map((t) => (
            <button
              key={t}
              className={type === t ? "active" : ""}
              onClick={() => {
                setType(t);
                setSubject("Toplam");
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          aria-label="Grafik dersi"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option>Toplam</option>
          {subjects[type].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {data.some((d) => d.value !== null) ? (
        <>
          <div className="chart-stats">
            <div>
              <span>Son net</span>
              <strong>{num(metrics.last)}</strong>
            </div>
            <div>
              <span>Önceki tam kayda göre</span>
              <strong>
                {metrics.delta !== null && metrics.delta > 0 ? "+" : ""}
                {num(metrics.delta)}
              </strong>
            </div>
            <div>
              <span>Son 3 ortalaması</span>
              <strong>{num(metrics.avg3)}</strong>
            </div>
            <div>
              <span>Son 5 ortalaması</span>
              <strong>{num(metrics.avg5)}</strong>
            </div>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={`${type} ${subject} net grafiği`}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={data}
                margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e8e9e3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(v) => [num(Number(v)), "Net"]} />
                <Line
                  dataKey="value"
                  type="linear"
                  stroke="#527451"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#527451" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="small muted">
            {metrics.count} geçerli kayıt ·{" "}
            {metrics.volatility === null
              ? "Dalgalanma için en az 3 sonuç gerekli."
              : `Net dalgalanması (standart sapma): ${num(metrics.volatility)}.`}{" "}
            Eksik toplamlar grafikte boş bırakılır.
          </p>
        </>
      ) : (
        <div className="chart-empty">
          <ChartNoAxesCombined size={28} strokeWidth={1.2} />
          <p>
            Henüz {type} {subject === "Toplam" ? "tam deneme" : subject} sonucu
            yok.
          </p>
          <span>Grafik, gerçek sonuçlarını eklediğinde oluşacak.</span>
        </div>
      )}
    </section>
  );
}
