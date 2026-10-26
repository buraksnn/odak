"use client";
import { useRef, useEffect, type ReactNode } from "react";
import { X, Leaf, ArrowRight } from "lucide-react";
export type Action = (value: unknown) => Promise<boolean>;
export const fmt = (
  date: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) =>
  new Intl.DateTimeFormat("tr-TR", opts).format(new Date(date + "T12:00:00Z"));
export const num = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-label={title}>
      <header className="modal-head">
        <h2>{title}</h2>
        <button className="icon" onClick={onClose} aria-label="Kapat">
          <X size={19} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Leaf size={22} />
      </span>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Submit({ children = "Kaydet" }: { children?: ReactNode }) {
  return (
    <button className="primary" type="submit">
      {children}
      <ArrowRight size={16} />
    </button>
  );
}
