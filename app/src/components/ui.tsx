"use client";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import type { Evidence, Locator } from "@/lib/types";
export function Button({
  children,
  variant = "outline",
  busy = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "outline" | "danger" | "text";
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`button ${variant} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Panel({
  title,
  sub,
  children,
  action,
  className = "",
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="caption">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <div className={`notice ${tone}`}>{children}</div>;
}
export function Select({
  label,
  value,
  onChange,
  options,
  id: customId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
}) {
  const generated = useId(),
    id = customId ?? generated;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  help,
  id: customId,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  help?: string;
  id?: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  const gen = useId(),
    id = customId ?? gen;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...rest}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error || help ? `${id}-help` : undefined}
      />
      {(error || help) && (
        <span id={`${id}-help`} className={error ? "error-text" : "caption"}>
          {error ?? help}
        </span>
      )}
    </div>
  );
}
export function Search({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  const id = useId(),
    ref = useRef<HTMLInputElement>(null);
  return (
    <div className="field search">
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          ref={ref}
          id={id}
          type="search"
          value={value}
          placeholder="Search tags, mechanisms, components…"
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <Button
            variant="text"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
export function Pagination({
  page,
  total,
  size = 20,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span aria-live="polite">
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}`
          : "0 results"}
      </span>
      <div>
        <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} / {pages}
        </span>
        <Button disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>(".dialog-body [autofocus]")?.focus();
    }
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={onClose}
      className={wide ? "wide" : ""}
    >
      <div className="dialog-head">
        <h2 id={id}>{title}</h2>
        <Button onClick={onClose} autoFocus>
          Close
        </Button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export type SourceDisplay = {
  title: string;
  locators: Locator[];
  excerpt?: string;
  kind?: string;
  formula?: string;
  period?: string;
  unit?: string;
  owner?: string;
  warnings?: string[];
};
export function SourceButton({
  evidence,
  onOpen,
  label = "View source",
}: {
  evidence: Evidence;
  onOpen: (s: SourceDisplay) => void;
  label?: string;
}) {
  return (
    <Button
      variant="text"
      onClick={() =>
        onOpen({
          title: evidence.id,
          locators: [evidence.locator],
          excerpt: evidence.excerpt,
          kind: evidence.kind,
          period: evidence.time ?? "Report availability unknown",
          unit: evidence.unit,
        })
      }
    >
      {label}
    </Button>
  );
}
export function SourceDialog({
  source,
  onClose,
}: {
  source: SourceDisplay;
  onClose: () => void;
}) {
  const [remote, retry] = useRemoteSource(source);
  return (
    <Modal title={source.title} onClose={onClose} wide>
      <div className="source-meta">
        <Badge>{source.kind ?? "source"}</Badge>
        {source.period && (
          <p>
            <strong>Period:</strong> {source.period}
          </p>
        )}
        {source.unit && (
          <p>
            <strong>Unit:</strong> {source.unit}
          </p>
        )}
        {source.formula && (
          <p>
            <strong>Definition / formula:</strong> {source.formula}
          </p>
        )}
        {source.owner && (
          <p>
            <strong>Owner (proposed):</strong> {source.owner}
          </p>
        )}
      </div>
      {source.warnings?.map((w) => (
        <Notice key={w} tone="warning">
          {w}
        </Notice>
      ))}
      {source.locators.map((l, i) => (
        <div className="locator" key={i}>
          <code>{l.file}</code>
          <p>
            {[
              l.sheet,
              l.cell,
              l.slide ? `Slide ${l.slide}` : "",
              l.shape ? `Shape ${l.shape}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <a
            className="source-link"
            href={`/api/source?file=${encodeURIComponent(l.file)}&download=1`}
          >
            Download verified original
          </a>
        </div>
      ))}
      <h3>
        {source.kind?.includes("source") || !source.kind
          ? "Exact source excerpt"
          : "Evidence & calculation context"}
      </h3>
      <pre className="excerpt">{source.excerpt ?? remote}</pre>
      {remote.startsWith("Unable") && (
        <Button onClick={retry}>Retry excerpt</Button>
      )}
      <p className="caption">
        Source timestamps are local to the supplied files; timezone and report
        publication availability are unknown. Extraction retains content and
        locators; consult the original for visual layout.
      </p>
    </Modal>
  );
}
import { useState } from "react";
function useRemoteSource(source: SourceDisplay) {
  const [value, setValue] = useState("Loading source excerpt…"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (source.excerpt) return;
    const controller = new AbortController();
    Promise.all(
      source.locators.map(async (l) => {
        const q = new URLSearchParams(
          Object.entries(l).map(([k, v]) => [k, String(v)]),
        );
        const r = await fetch(`/api/source?${q}`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!r.ok) throw new Error();
        return (await r.json()).excerpt as string;
      }),
    )
      .then((parts) => setValue(parts.join("\n\n")))
      .catch(() => {
        if (!controller.signal.aborted)
          setValue(
            "Unable to load the excerpt. Retry or download the original.",
          );
      });
    return () => controller.abort();
  }, [source, attempt]);
  return [
    value,
    () => {
      setValue("Loading source excerpt…");
      setAttempt((a) => a + 1);
    },
  ] as const;
}
