export type Mode = "historical" | "prospective";
export type Kind = "source" | "computed" | "proposed" | "synthetic";
export type Locator = {
  file: string;
  sheet?: string;
  cell?: string;
  slide?: number;
  shape?: number;
};
export type Evidence = {
  id: string;
  locator: Locator;
  excerpt: string;
  kind: Kind;
  time: string | null;
  availability: string | null;
  category: "weekly" | "hourly" | "report" | "metadata" | "incident";
  unit?: string;
};
export type Incident = {
  id: string;
  serial: number;
  rawAR: string;
  ar: string | null;
  tag: string;
  plant: string;
  date: string;
  title: string;
  status: string;
  risk: number | null;
  equipment: string;
  component: string;
  mechanism: string;
  downtime: number;
  actual: number;
  potential: number;
  total: number;
  due: string;
  source: Locator;
  raw: Record<string, string | number | null>;
};
export type Condition = {
  row: number;
  week: number;
  date: string;
  measurements: number[];
  status: string;
  status_formula: string;
  remark: string | null;
  source: Locator;
};
export type Production = {
  values: Record<string, string | number>;
  source: Locator;
};
export type Block = {
  shape_id: number;
  type: string;
  text?: string;
  rows?: (string | number | null)[][];
};
export type Deck = {
  file: string;
  slides: { slide: number; blocks: Block[]; source: Locator }[];
};
export type Summary = {
  name: string;
  value: string | number;
  formula: string | number;
  basis: string | number;
  source: Locator;
};
export type Asset = {
  tag: string;
  name: string;
  plant: string;
  plant_text: string;
  class: string;
  criticality_source: string;
  ar: string;
  eventDate: string;
  linked_incident_id: string;
  info_source: Locator;
  thresholds: { parameter: string; limits_text: string; source: Locator }[];
  condition_headers: string[];
  production_metadata: {
    Name: string;
    Description: string;
    engunits: string;
  }[];
  conditions: Condition[];
  production: Production[];
  report: Deck;
  summary: Summary[];
};
export type AssetMeta = Omit<
  Asset,
  "conditions" | "production" | "report" | "summary"
> & { hourlyWindow: string; weeklyWindow: string; reportFile: string };
export type SourceFile = { path: string; bytes: number; sha256: string };
export type Catalog = {
  version: string;
  assets: AssetMeta[];
  incidents: Incident[];
  inventory: SourceFile[];
  integrity: {
    originalsChecked: number;
    baselineFiles: number;
    verifiedOn: string;
    packageDiscrepancies: {
      file: string;
      expectedHash: string;
      actualHash: string;
      expectedBytes: number;
      actualBytes: number;
    }[];
  };
};
export type Quality = {
  id: string;
  title: string;
  detail: string;
  locators: Locator[];
};
export type Episode = {
  id: string;
  tag: string;
  plant: string;
  severity: "ALARM" | "TRIP";
  first: string;
  last: string;
  samples: string[];
  criticality: string;
  risk: number | null;
  reason: string;
  conditions: string[];
};
export type Retrieval = {
  incident: Incident;
  score: number;
  matched: string[];
  hasReport: boolean;
};
export type Bundle = {
  version: string;
  asset: AssetMeta;
  mode: Mode;
  asOf: string;
  observationCutoff: string | null;
  similarIncidents: Retrieval[];
  conditions: Condition[];
  production: Production[];
  summary: Summary[];
  incident: Incident | null;
  report: Deck | null;
  evidence: Evidence[];
  quality: Quality[];
  episodes: Episode[];
  exclusions: string[];
};
export type Hypothesis = {
  id: string;
  title: string;
  evidenceIds: string[];
  counterEvidenceIds: string[];
  missingChecks: string[];
  strength: "supported" | "plausible" | "insufficient";
  kind: "Historical RCA finding" | "Hypothesis";
  mechanism: string;
  explanation: string;
  strengthReason: string;
  signalIds: string[];
  knowledgeBasis: "Engineering inference" | "Historical source finding";
};
export type ActionDraft = {
  hypothesisId: string;
  type: "evidence_review" | "engineering_review" | "historical_review";
  title: string;
  guidance: string;
  evidenceIds: string[];
  proposedOwnerRole: string;
  approvalRequired: true;
};
export type Fact = {
  id: string;
  asset: string;
  field: string;
  value: string | number;
  unit: string;
  time: string | null;
  kind: "source" | "computed";
  evidenceIds: string[];
  inputs: string[];
  formula: string | null;
};
export type FactReference = Pick<Fact, "asset" | "value" | "unit" | "time"> & {
  factId: string;
};
export type Signal = {
  id: string;
  type: "weekly_breach" | "weekly_trend" | "hourly_state" | "hourly_change";
  parameter: string;
  severity: "ALARM" | "TRIP" | "Review";
  rule: string;
  evidenceIds: string[];
  factIds: string[];
  mechanisms: string[];
};
export type SignalSummary = {
  state: "no_observations" | "insufficient_anomaly" | "anomaly";
  weekly: number;
  hourly: number;
  signals: Signal[];
  facts: Fact[];
  policy: string[];
};
export type Analysis = {
  caseId: string;
  mode: Mode;
  asOf: string;
  summary: string;
  hypotheses: Hypothesis[];
  actions: ActionDraft[];
  limitations: string[];
  execution: "replay" | "live";
  liveState: "not_requested" | "blocked" | "failed" | "validated";
  signals: SignalSummary;
  observations: FactReference[];
  message: string;
  stages: { title: string; result: string }[];
};
export type ActionState =
  | "Draft"
  | "Approved"
  | "In Progress"
  | "Pending Verification"
  | "Closed"
  | "Rejected"
  | "Cancelled";
export type Change = { at: string; actor: string; description: string };
export type WorkspaceAction = ActionDraft & {
  id: string;
  caseId: string;
  analysisMode?: Mode;
  analysisAsOf?: string;
  hypothesisId: string;
  hypothesisTitle: string;
  priorityReason: string;
  dependencies: string;
  owner: string;
  due: string;
  state: ActionState;
  completionEvidence: string;
  reviewer: string;
  history: Change[];
  sources: Evidence[];
};
export type Workspace = {
  version: string;
  actions: WorkspaceAction[];
  owners: Record<string, string>;
  reviews: Record<string, "Accepted" | "Rejected">;
  episodes: Record<string, "Acknowledged" | "Grouped" | "Open">;
  history: Change[];
};
