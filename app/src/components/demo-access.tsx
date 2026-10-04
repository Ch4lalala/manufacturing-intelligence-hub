"use client";
import { useEffect, useRef, useState } from "react";
import { Button, SecretField, Notice } from "./ui";

export function DemoAccess({
  onAccess,
}: {
  onAccess: (allowed: boolean) => void;
}) {
  const [state, setState] = useState<{
      enabled: boolean;
      authenticated: boolean;
      reason: string;
      accessMode?: "direct";
    } | null>(null),
    [passcode, setPasscode] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0),
    [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null),
    pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetch("/api/demo-session", {
      signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)]),
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((s) => {
        if (!c.signal.aborted) {
          setState(s);
          onAccess(s.enabled && s.authenticated);
        }
      })
      .catch(() => {
        if (!c.signal.aborted) {
          onAccess(false);
          setError(
            "Demo access status could not load. Evidence replay remains available.",
          );
        }
      });
    return () => {
      c.abort();
      pending.current?.abort();
    };
  }, [onAccess, attempt]);

  async function change(method: "POST" | "DELETE") {
    if (busy) return;
    setBusy(true);
    setError("");
    const c = new AbortController();
    pending.current = c;
    try {
      const r = await fetch("/api/demo-session", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ passcode }) : undefined,
        signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)]),
      });
      const s = await r.json();
      if (!r.ok) {
        if ([401, 403, 503].includes(r.status)) {
          onAccess(false);
          setState((current) =>
            r.status === 401 && current
              ? { ...current, authenticated: false }
              : null,
          );
        }
        throw Error(s.error ?? "Demo access could not change.");
      }
      if (c.signal.aborted) return;
      setState((current) =>
        current ? { ...current, authenticated: s.authenticated } : current,
      );
      setPasscode("");
      onAccess(!!s.authenticated);
    } catch (e) {
      if (!c.signal.aborted) {
        setError(e instanceof Error ? e.message : "Demo access unavailable.");
        form.current?.querySelector("input")?.focus();
      }
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="quality-card">
      <h3>Live AI Model Gateway</h3>
      {error && <Notice tone="error">{error}</Notice>}
      {!state ? (
        error ? (
          <Button
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            Retry demo access status
          </Button>
        ) : (
          <p className="caption">Verifying gateway status…</p>
        )
      ) : !state.enabled ? (
        <p className="caption">{state.reason}</p>
      ) : state.accessMode === "direct" ? (
        <p className="caption">
          Live AI composition available. No demo passcode required.
        </p>
      ) : state.authenticated ? (
        <div className="button-row">
          <p className="caption">Live AI composition authorized.</p>
          <Button busy={busy} onClick={() => change("DELETE")}>
            Lock live access
          </Button>
        </div>
      ) : (
        <form
          ref={form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            change("POST");
          }}
        >
          <p className="caption">
            Enter the demo passcode to unlock live AI composition.
          </p>
          <SecretField
            label="Demo passcode"
            value={passcode}
            onChange={setPasscode}
            error={error}
          />
          <Button
            type="submit"
            busy={busy}
            disabled={!passcode}
            variant="primary"
          >
            Unlock live access
          </Button>
        </form>
      )}
    </div>
  );
}
