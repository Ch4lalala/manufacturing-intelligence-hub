"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Catalog,
  Bundle,
  Workspace,
  WorkspaceAction,
  ActionDraft,
  Hypothesis,
} from "@/lib/types";
import { emptyWorkspace, restoreWorkspace, reviewKey } from "@/lib/actions";
import { sourceTime } from "@/lib/time";
import {
  Button,
  Select,
  Notice,
  SourceDialog,
  Modal,
  type SourceDisplay,
} from "./ui";
import { Icon, type IconName } from "./icons";
import { Badge } from "./ui";
import { Overview } from "./overview";
import { DataMap } from "./data-map";
import { Problems } from "./problems";
import { Investigation } from "./investigation";
import { Actions } from "./actions";
const views = [
  { id: "overview", label: "Executive Overview", icon: "overview" as IconName },
  { id: "data", label: "Data & KPI Map", icon: "data" as IconName },
  { id: "problems", label: "Problem Tank", icon: "problems" as IconName },
  {
    id: "investigation",
    label: "Investigation",
    icon: "investigation" as IconName,
  },
  { id: "actions", label: "Action Tracker", icon: "actions" as IconName },
];
type HubContext = {
  catalog: Catalog;
  bundle: Bundle | null;
  query: Record<string, string>;
  setQuery: (patch: Record<string, string>) => void;
  navigate: (view: string, tag?: string, incident?: string) => void;
  workspace: Workspace;
  save: (update: (w: Workspace) => Workspace, message: string) => void;
  notify: (message: string) => void;
  openSource: (s: SourceDisplay) => void;
  role: string;
  createAction: (a: ActionDraft, h: Hypothesis, analysisMode: string) => void;
  loading: boolean;
  error: string;
};
const Context = createContext<HubContext | null>(null);
export function useHub() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace unavailable");
  return value;
}
const STORAGE = "caliber-workspace-v1";
export function Hub({ catalog }: { catalog: Catalog }) {
  const [query, setQueryState] = useState<Record<string, string>>({});
  const [bundle, setBundle] = useState<Bundle | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [workspace, setWorkspace] = useState(() =>
      emptyWorkspace(catalog.version),
    ),
    [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(""),
    [source, setSource] = useState<SourceDisplay | null>(null),
    [reset, setReset] = useState(false),
    [role, setRole] = useState("Plant manager");
  const heading = useRef<HTMLHeadingElement>(null);
  const activeNavigation = useRef<HTMLButtonElement>(null);
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const view = query.view ?? "overview",
    tag = query.asset ?? "KO-3201",
    mode = query.mode === "prospective" ? "prospective" : "historical";
  const requestedCutoff = query.asOf || query.episodeAsOf || "";
  const reference =
    mode === "prospective"
      ? "2026-04-22 23:59:59"
      : (catalog.assets
          .find((a) => a.tag === tag)
          ?.hourlyWindow.split(" to ")[1] ?? "2026-04-30 23:00:00");
  let asOf = requestedCutoff || reference;
  try {
    asOf = sourceTime(asOf);
  } catch {
    /* API displays invalid-calendar state. */
  }
  function setQuery(patch: Record<string, string>) {
    const next = { ...query, ...patch };
    for (const key of Object.keys(next)) if (!next[key]) delete next[key];
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(next).toString();
    window.history.pushState({}, "", url);
    setQueryState(next);
    if (
      (next.mode ?? "historical") !== mode ||
      (next.asset ?? "KO-3201") !== tag ||
      (next.asOf || next.episodeAsOf || reference) !== asOf
    ) {
      setBundle(null);
      setLoading(true);
      setSource(null);
    }
  }
  function navigate(nextView: string, nextTag?: string, incident = "") {
    setQuery({
      view: nextView,
      ...(nextTag ? { asset: nextTag } : {}),
      incident,
    });
    heading.current?.focus();
  }
  function save(update: (w: Workspace) => Workspace, text: string) {
    setWorkspace((w) => update(w));
    setMessage(text);
  }
  useEffect(() => {
    const sync = () => {
      setSource(null);
      setQueryState(
        Object.fromEntries(new URL(window.location.href).searchParams),
      );
    };
    queueMicrotask(sync);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const result = restoreWorkspace(
          localStorage.getItem(STORAGE),
          catalog.version,
        );
        setWorkspace(result.workspace);
        if (result.notice) setMessage(result.notice);
      } catch {
        setMessage(
          "Local storage unavailable. Changes remain in this tab until reload.",
        );
      }
      setLoaded(true);
    });
    const external = (e: StorageEvent) => {
      if (e.key !== STORAGE) return;
      const result = restoreWorkspace(e.newValue, catalog.version);
      setWorkspace(result.workspace);
      setMessage(
        "Workspace changed in another tab. Latest saved state loaded; review before editing.",
      );
    };
    window.addEventListener("storage", external);
    return () => window.removeEventListener("storage", external);
  }, [catalog.version]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(workspace));
    } catch {
      queueMicrotask(() =>
        setMessage(
          "Unable to save locally. Changes remain in this tab; enable storage before reload.",
        ),
      );
    }
  }, [workspace, loaded]);
  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams({
      asset: tag,
      mode,
    });
    if (mode === "prospective" || requestedCutoff) q.set("asOf", asOf);
    fetch(`/api/case?${q}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "Unable to load this source scope. Select a valid asset and replay time, or retry.",
          );
        return r.json();
      })
      .then((b) => {
        if (controller.signal.aborted) return;
        setBundle(b);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "View unavailable. Retry.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [tag, mode, asOf, requestedCutoff, catalog.assets, attempt]);
  useEffect(() => {
    const revealActive = () => {
      const button = activeNavigation.current;
      const nav = button?.parentElement;
      if (button && nav && nav.scrollWidth > nav.clientWidth)
        nav.scrollTo({
          left: button.offsetLeft - nav.offsetLeft - 8,
          behavior: "instant",
        });
    };
    revealActive();
    window.addEventListener("resize", revealActive);
    return () => window.removeEventListener("resize", revealActive);
  }, [view]);
  useEffect(() => {
    document.title = `${views.find((v) => v.id === view)?.label ?? "Workspace"} | CALIBER`;
  }, [view]);
  function createAction(
    draft: ActionDraft,
    h: Hypothesis,
    analysisMode: string,
  ) {
    if (!bundle) return;
    if (
      draft.hypothesisId !== h.id ||
      !draft.evidenceIds.some((id) => h.evidenceIds.includes(id))
    ) {
      setMessage(
        "This draft must link to the reviewed hypothesis and its evidence.",
      );
      return;
    }
    if (
      workspace.reviews[reviewKey(tag, analysisMode, bundle.asOf, h)] !==
      "Accepted"
    ) {
      setMessage(
        "Accept the linked finding or hypothesis before creating an action draft.",
      );
      return;
    }
    if (
      workspace.actions.some(
        (a) =>
          a.caseId === tag &&
          a.hypothesisId === h.id &&
          a.hypothesisTitle === h.title &&
          a.analysisMode === bundle.mode &&
          a.analysisAsOf === bundle.asOf &&
          a.title === draft.title,
      )
    ) {
      setMessage("This draft already exists. Open it in Action Tracker.");
      navigate("actions");
      return;
    }
    const action: WorkspaceAction = {
      ...draft,
      id: crypto.randomUUID(),
      caseId: tag,
      analysisMode: bundle.mode,
      analysisAsOf: bundle.asOf,
      hypothesisId: h.id,
      hypothesisTitle: h.title,
      priorityReason:
        bundle.episodes[0]?.reason ??
        "Engineer-reviewed evidence requires follow-up",
      dependencies:
        "Engineering review and Operations agreement required; resources unknown",
      owner: "",
      due: "",
      state: "Draft",
      completionEvidence: "",
      reviewer: "",
      history: [
        {
          at: new Date().toISOString(),
          actor: role,
          description: "Draft created from accepted evidence review",
        },
      ],
      sources: bundle.evidence.filter((e) => draft.evidenceIds.includes(e.id)),
    };
    save(
      (w) => ({ ...w, actions: [...w.actions, action] }),
      "Action draft created. Assign an owner and due date, then approve it.",
    );
    navigate("actions");
  }
  const selected =
    catalog.assets.find((a) => a.tag === tag) ?? catalog.assets[1];
  const safeBundle =
    bundle?.asset.tag === tag &&
    bundle.mode === mode &&
    bundle.asOf === asOf &&
    (mode === "prospective" ||
      Boolean(bundle.observationCutoff) === Boolean(requestedCutoff))
      ? bundle
      : null;
  const context: HubContext = {
    catalog,
    bundle: safeBundle,
    query,
    setQuery,
    navigate,
    workspace,
    save,
    notify: setMessage,
    openSource: setSource,
    role,
    createAction,
    loading: loading || !safeBundle,
    error,
  };
  const body: Record<string, ReactNode> = {
    overview: <Overview />,
    data: <DataMap />,
    problems: <Problems />,
    investigation: (
      <Investigation key={`${tag}:${mode}:${asOf}:${query.incident ?? ""}`} />
    ),
    actions: <Actions />,
  };
  return (
    <Context.Provider value={context}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <strong>
              CALIBER<span>2026 / CASE 2</span>
            </strong>
            <p>
              Manufacturing
              <br />
              Decision Hub
            </p>
          </div>
          <p className="eyebrow nav-label">Decision workspace</p>
          <nav aria-label="Main navigation">
            {views.map((v) => (
              <button
                key={v.id}
                ref={view === v.id ? activeNavigation : undefined}
                onClick={() => navigate(v.id)}
                className={view === v.id ? "active" : ""}
                aria-current={view === v.id ? "page" : undefined}
                disabled={
                  mode === "prospective" &&
                  !["investigation", "problems", "actions"].includes(v.id)
                }
                title={
                  mode === "prospective" &&
                  !["investigation", "problems", "actions"].includes(v.id)
                    ? "Return to historical review to access outcome summaries"
                    : undefined
                }
              >
                <Icon name={v.icon} />
                {v.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="status-dot" />
            Local prototype
            <p>
              Source-led review.
              <br />
              Simulated approvals.
            </p>
            <small>
              Source snapshot
              <br />
              02 October 2026
            </small>
            <Button onClick={() => setReset(true)}>
              <Icon name="reset" />
              Reset prototype workspace
            </Button>
          </div>
        </aside>
        <div className="content">
          <header className="topbar">
            <div className="topbar-context">
              <span className="eyebrow">Operations workbench</span>
              <p>
                {mode === "historical"
                  ? "Historical review · source snapshot"
                  : "Pre-event replay · eligible observations only"}
              </p>
            </div>
            <Select
              label="Asset scenario"
              value={tag}
              onChange={(s) =>
                setQuery({
                  asset: s,
                  incident: "",
                  asOf:
                    mode === "prospective" &&
                    catalog.assets.find((a) => a.tag === s)?.eventDate
                      ? `${catalog.assets.find((a) => a.tag === s)!.eventDate} 00:00:00`
                      : requestedCutoff,
                  episodeAsOf: "",
                })
              }
              options={catalog.assets.map((a) => ({
                value: a.tag,
                label: `${a.tag} · ${a.plant}`,
              }))}
            />
            <Select
              label="Simulated role"
              value={role}
              onChange={setRole}
              options={[
                "Plant manager",
                "Reliability engineer",
                "Maintenance reviewer",
                "Engineering reviewer",
              ].map((s) => ({ value: s, label: s }))}
            />
          </header>
          <main id="main">
            <div className="page-head">
              <div>
                <p className="eyebrow">
                  {mode === "historical"
                    ? "Baseline review"
                    : "Source-local pre-event scope"}
                </p>
                <h1 tabIndex={-1} ref={heading}>
                  {views.find((v) => v.id === view)?.label ?? "Workspace"}
                </h1>
                <p>
                  {view === "overview"
                    ? "From historical exposure to a traceable, reviewed decision."
                    : view === "data"
                      ? "Shared definitions, source relationships and visible quality gaps."
                      : view === "problems"
                        ? "Review historical cases and explain condition priorities."
                        : view === "investigation"
                          ? "Inspect the evidence before deciding what to do."
                          : "Ownership, progress and evidence for each follow-up action."}
                </p>
              </div>
              <Badge tone={mode === "prospective" ? "warning" : "neutral"}>
                {mode === "prospective"
                  ? "Pre-event replay"
                  : "Historical review"}
              </Badge>
            </div>
            <div className="scope-bar" aria-label="Active source scope">
              <strong>{selected.tag}</strong>
              <span>{selected.name}</span>
              <span>
                {mode === "historical" && !requestedCutoff
                  ? selected.hourlyWindow
                  : `Observation cutoff: ${asOf}`}
              </span>
              <span>Timezone unknown</span>
              {safeBundle && <span>Review reference: {safeBundle.asOf}</span>}
            </div>
            {mode === "prospective" && (
              <Notice>
                Historical summaries are hidden. The condition queue,
                Investigation and actions from this same pre-event review are
                available; completed reports and register retrieval are
                excluded.
              </Notice>
            )}
            <div className="workspace-status" role="status" aria-live="polite">
              {message}
            </div>
            {error ? (
              <Notice tone="error">
                {error}{" "}
                <Button
                  onClick={() => {
                    setError("");
                    setLoading(true);
                    setAttempt((v) => v + 1);
                  }}
                >
                  Retry scope
                </Button>
              </Notice>
            ) : loading || !safeBundle ? (
              <div className="loading-state" role="status">
                Loading verified source scope…
              </div>
            ) : mode === "prospective" &&
              !["investigation", "problems", "actions"].includes(view) ? (
              <Button onClick={() => navigate("investigation")}>
                Open pre-event Investigation
              </Button>
            ) : (
              <div key={workspaceEpoch}>{body[view] ?? body.overview}</div>
            )}
          </main>
          <footer>
            CALIBER Case 2 · Local decision prototype · Source / computed /
            proposed / synthetic states remain distinct
            <Button className="mobile-reset" onClick={() => setReset(true)}>
              Reset prototype workspace
            </Button>
          </footer>
        </div>
      </div>
      {source && (
        <SourceDialog source={source} onClose={() => setSource(null)} />
      )}
      {reset && (
        <Modal
          title="Reset prototype workspace?"
          onClose={() => setReset(false)}
        >
          <p>
            This clears local demo actions, hypothesis reviews, episode
            acknowledgements, proposed KPI owners and history. Original sources
            and historical snapshots are preserved.
          </p>
          <div className="button-row">
            <Button onClick={() => setReset(false)} autoFocus>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                save(
                  () => emptyWorkspace(catalog.version),
                  "Prototype workspace reset.",
                );
                setReset(false);
                setWorkspaceEpoch((v) => v + 1);
              }}
            >
              Reset workspace
            </Button>
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}
