"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { addDays, today, type Snapshot, type Proposal } from "@/lib/domain";
import { aiPrompt, parseProposal, validateProposal } from "@/lib/service";
import { Field, fmt, type Action } from "./ui";
export function TopicList({ b, act }: { b: Snapshot; act: Action }) {
  const [filter, setFilter] = useState("Tümü");
  return (
    <section className="topics">
      <div className="section-heading lower">
        <div>
          <h2>Konulara küçük bir bakış</h2>
          <p className="small muted">
            Deneme netlerinden konu yanlışı çıkarılmaz. Eksiklerini sen
            işaretlersin.
          </p>
        </div>
        <select
          aria-label="Konu filtresi"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>Tümü</option>
          <option>Tekrar gereken</option>
          {[...new Set(b.topics.map((t) => t.subject))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {b.topics
        .filter(
          (t) =>
            filter === "Tümü" ||
            (filter === "Tekrar gereken" &&
              (t.review ||
                (!!t.lastReviewed &&
                  addDays(t.lastReviewed, 14) <= today()))) ||
            t.subject === filter,
        )
        .map((t) => (
          <div className="topic" key={t.id}>
            <div>
              <span>{t.subject}</span>
              <h3>{t.name}</h3>
              <small>
                {t.lastReviewed
                  ? `Son tekrar: ${fmt(t.lastReviewed)}`
                  : "Henüz tekrar kaydı yok"}
              </small>
            </div>
            <select
              aria-label={`${t.name} durum`}
              value={t.status}
              onChange={(e) =>
                act({ op: "topic", value: { ...t, status: e.target.value } })
              }
            >
              {["Çalışılmadı", "Geliştirilmeli", "Yeterli"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={t.review}
                onChange={(e) =>
                  act({
                    op: "topic",
                    value: { ...t, review: e.target.checked },
                  })
                }
              />{" "}
              Tekrar et
            </label>
            <details>
              <summary>Not</summary>
              <textarea
                aria-label={`${t.name} not`}
                maxLength={1000}
                defaultValue={t.note}
                onBlur={(e) => {
                  if (e.target.value !== t.note)
                    act({ op: "topic", value: { ...t, note: e.target.value } });
                }}
              />
            </details>
          </div>
        ))}
    </section>
  );
}
export function AiBridge({ b, act }: { b: Snapshot; act: Action }) {
  const [raw, setRaw] = useState(""),
    [preview, setPreview] = useState<Proposal | null>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [message, setMessage] = useState("");
  const prompt = aiPrompt(b);
  return (
    <div className="form-stack">
      <p className="modal-intro">
        API anahtarı gerekmez. Verilerini inceleyip kendi ChatGPT hesabına
        yalnızca sen aktarırsın. Uygulama dışarıya istek göndermez.
      </p>
      <Field label="1. Gerçek kayıtlarından oluşturulan prompt">
        <textarea className="prompt" readOnly value={prompt} />
      </Field>
      <button
        className="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
          } catch {
            setError(
              "Panoya erişilemedi. Prompt metnini seçip kopyalayabilirsin.",
            );
          }
        }}
      >
        <Copy size={15} />
        {copied ? "Kopyalandı" : "Promptu kopyala"}
      </button>
      <Field label="2. ChatGPT yanıtını yapıştır (JSON veya JSON kod bloğu)">
        <textarea
          className="prompt"
          value={raw}
          maxLength={30000}
          onChange={(e) => {
            setRaw(e.target.value);
            setPreview(null);
            setMessage("");
          }}
        />
      </Field>
      <button
        className="secondary"
        onClick={() => {
          try {
            setError("");
            const p = parseProposal(raw);
            validateProposal(b, p);
            setPreview(p);
          } catch (e) {
            setPreview(null);
            setError(
              "Öneri uygulanamaz: " +
                (e instanceof Error ? e.message : "Geçersiz JSON"),
            );
          }
        }}
      >
        Önerileri doğrula ve önizle
      </button>
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
      {preview && (
        <div className="ai-preview">
          <h3>3. Önizleme — henüz uygulanmadı</h3>
          <p>{preview.summary}</p>
          {preview.tasks.map((t, i) => (
            <div key={i}>
              <strong>
                {fmt(t.date)} · {t.start} · {t.minutes} dk
              </strong>
              <p>
                {t.subject} — {t.topic} · {t.kind}
              </p>
            </div>
          ))}
          <button
            className="primary"
            onClick={async () => {
              if (await act({ op: "aiSave", raw, apply: true })) {
                setPreview(null);
                setRaw("");
                setMessage("Öneriler onayınla plana eklendi.");
              }
            }}
          >
            Onaylıyorum, plana ekle
          </button>
        </div>
      )}
      {raw && (
        <button
          className="text-button"
          onClick={async () => {
            if (await act({ op: "aiSave", raw, apply: false }))
              setMessage("Analiz arşive kaydedildi; plan değiştirilmedi.");
          }}
        >
          Yalnızca analizi arşivle
        </button>
      )}
      {message && <p role="status">{message}</p>}
      <details>
        <summary>Geçmiş analizler ({b.analyses.length})</summary>
        {b.analyses.map((a) => (
          <details key={a.id}>
            <summary>
              {fmt(a.date)} · {a.applied ? "Uygulandı" : "Arşivlendi"}
            </summary>
            <pre>{a.raw}</pre>
          </details>
        ))}
      </details>
    </div>
  );
}
