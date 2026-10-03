"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Icon } from "./icons";
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
  const semantic =
    tone !== "neutral"
      ? tone
      : typeof children === "string" && /^Synthetic/.test(children)
        ? "synthetic"
        : typeof children === "string" &&
            /^(Source|Computed|Proposed)/i.test(children)
          ? children.split(" ")[0].toLowerCase()
          : tone;
  return (
    <span className={`badge ${semantic}`} data-tone={tone}>
      {children}
    </span>
  );
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
  return (
    <div className={`notice ${tone}`}>
      <Icon
        name={
          tone === "success"
            ? "check"
            : tone === "error" || tone === "warning"
              ? "warning"
              : "info"
        }
      />
      <div className="notice-content">{children}</div>
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  id: customId,
  className = "",
  placeholder = "Select...",
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id?: string;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const generated = useId(),
    id = customId ?? generated;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const effectiveAriaLabel = ariaLabel ?? label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    const idx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const toggleDropdown = () => {
    if (open) {
      setOpen(false);
    } else {
      openDropdown();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openDropdown();
      } else {
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openDropdown();
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && highlightedIndex >= 0 && options[highlightedIndex]) {
        onChange(options[highlightedIndex].value);
        setOpen(false);
        triggerRef.current?.focus();
      } else {
        openDropdown();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={`field custom-select-field ${className}`} ref={containerRef}>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="custom-select-wrapper">
        <button
          type="button"
          ref={triggerRef}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={effectiveAriaLabel}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`custom-select-trigger ${open ? "is-open" : ""}`}
        >
          <span className={`custom-select-value ${!selectedOption ? "is-placeholder" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <Icon name="chevron-down" className="custom-select-chevron" />
        </button>

        {open && (
          <ul
            role="listbox"
            className="custom-select-popover"
            tabIndex={-1}
          >
            {options.map((o, idx) => {
              const isSelected = o.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className="option-label">{o.label}</span>
                  {isSelected && <Icon name="check" className="option-check" />}
                </li>
              );
            })}
          </ul>
        )}

        <select
          ref={nativeSelectRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          aria-label={effectiveAriaLabel}
          className="sr-only-select"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
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
  ariaLabel,
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
  ariaLabel?: string;
}) {
  const gen = useId(),
    id = customId ?? gen;
  const isDate = type === "date" || type === "datetime-local";
  return (
    <div className={`field ${isDate ? "date-field" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={isDate ? "input-wrapper with-icon" : "input-wrapper"}>
        {isDate && <Icon name="calendar" className="field-prefix-icon" />}
        <input
          {...rest}
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-label={ariaLabel ?? label}
          aria-describedby={error || help ? `${id}-help` : undefined}
        />
      </div>
      {(error || help) && (
        <span id={`${id}-help`} className={error ? "error-text" : "caption"}>
          {error ?? help}
        </span>
      )}
    </div>
  );
}

export function SecretField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId(),
    [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="button-row input-row">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <Button
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </Button>
      </div>
      {error && (
        <span id={`${id}-error`} className="error-text">
          {error}
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
      <div className="search-input-wrap">
        <Icon name="search" className="search-prefix-icon" />
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
            className="search-clear-btn"
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
      <span aria-live="polite" className="pagination-count">
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total}`
          : "0 results"}
      </span>
      <div className="pagination-controls">
        <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="pagination-page">
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
          <Icon name="close" />
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
  detailHeading?: string;
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
          period: evidence.time ?? "Active record period",
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
            <strong>Definition:</strong> {source.formula}
          </p>
        )}
        {source.owner && (
          <p>
            <strong>Data Steward:</strong> {source.owner}
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
            <Icon name="source" /> Download verified original
          </a>
        </div>
      ))}
      <h3>
        {source.detailHeading ??
          (source.kind?.includes("source") || !source.kind
            ? "Exact source excerpt"
            : "Evidence & calculation context")}
      </h3>
      <pre
        className="excerpt"
        tabIndex={0}
        role="region"
        aria-label="Source evidence excerpt"
      >
        {source.excerpt ?? remote}
      </pre>
      {remote.startsWith("Unable") && (
        <Button onClick={retry}>Retry excerpt</Button>
      )}
      <p className="caption">
        Original record excerpt and verified document provenance locators.
      </p>
    </Modal>
  );
}

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
