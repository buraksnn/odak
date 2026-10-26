"use client";
import { type FormEvent } from "react";
import { today, subjects, type Task } from "@/lib/domain";
import { Field, Submit, type Action } from "./ui";
export function TaskForm({
  task,
  date,
  act,
  close,
}: {
  task: Task | null;
  date: string;
  act: Action;
  close: () => void;
}) {
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (
      await act({
        op: "task",
        value: {
          id: task?.id ?? crypto.randomUUID(),
          date: d.get("date"),
          start: d.get("start"),
          subject: d.get("subject"),
          topic: d.get("topic"),
          kind: d.get("kind"),
          minutes: Number(d.get("minutes")),
          actualMinutes: d.get("actual") ? Number(d.get("actual")) : null,
          status: "planned",
          source: task?.source ?? "manual",
          reason: task?.reason ?? "Kendi eklediğin çalışma.",
        },
      })
    )
      close();
  };
  return (
    <form onSubmit={save} className="form-stack">
      <div className="form-row">
        <Field label="Tarih">
          <input
            name="date"
            type="date"
            required
            min={today()}
            defaultValue={task?.date ?? date}
          />
        </Field>
        <Field label="Başlangıç">
          <input
            type="time"
            name="start"
            required
            defaultValue={task?.start ?? "20:30"}
          />
        </Field>
      </div>
      <Field label="Ders">
        <select
          name="subject"
          defaultValue={task?.subject ?? "TYT Temel Matematik"}
        >
          {Object.entries(subjects).flatMap(([type, list]) =>
            list.map((s) => (
              <option key={type + s}>
                {type} {s}
              </option>
            )),
          )}
          <option>TYT Genel</option>
          <option>AYT Genel</option>
        </select>
      </Field>
      <Field label="Konu">
        <input
          required
          name="topic"
          maxLength={160}
          defaultValue={task?.topic}
        />
      </Field>
      <Field label="Çalışma türü">
        <select name="kind" defaultValue={task?.kind}>
          {["Konu anlatımı", "Soru çözümü", "Tekrar", "Yanlış analizi"].map(
            (k) => (
              <option key={k}>{k}</option>
            ),
          )}
        </select>
      </Field>
      <div className="form-row">
        <Field label="Tahmini süre (dk)">
          <input
            required
            name="minutes"
            type="number"
            min={10}
            max={120}
            defaultValue={task?.minutes ?? 30}
          />
        </Field>
        <Field label="Gerçek süre (isteğe bağlı)">
          <input
            name="actual"
            type="number"
            min={0}
            max={600}
            defaultValue={task?.actualMinutes ?? ""}
          />
        </Field>
      </div>
      <p className="small muted">
        Çakışma veya kapasite aşımı varsa kayıt yapılmaz.
      </p>
      <Submit />
    </form>
  );
}
