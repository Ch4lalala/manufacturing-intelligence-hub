# UX Contract

English product interface, WCAG 2.2 AA target. Source timestamps have unknown timezone and stay unchanged. Local workspace history uses explicit UTC ISO timestamps. Demo-session access gates optional provider calls only; no enterprise authentication. Role choices are simulations.

## Business-context sources

| Scope                         | Authority                                        | UI consequence                                                                            |
| ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Data and temporal eligibility | ../docs/DATA_RULES.md; ../docs/DATA_CONTRACTS.md | Separate grains, show conflicts; exclude current RCA and future facts in prospective view |
| Review and closure            | ../docs/SOLUTION_SPEC.md section 3               | Approve, progress, submit evidence, reviewer-confirm closure                              |
| Persistence and retention     | ../docs/SOLUTION_SPEC.md section 5               | Local workspace only, version mismatch reset, explicit reset confirmation                 |
| External analysis             | ../docs/SOLUTION_SPEC.md section 5               | Explicit live request, cancellation, safe replay fallback                                 |
| Product language              | Official booklet p9                              | English copy                                                                              |

## Canonical UI Map

| Capability     | Canonical owner                               | Source of truth          | Allowed variants                                            | Verification           |
| -------------- | --------------------------------------------- | ------------------------ | ----------------------------------------------------------- | ---------------------- |
| Select/Listbox | src/components/ui.tsx Select                  | DESIGN.md                | authored combobox; hidden native value adapter              | browser keyboard       |
| Date           | src/components/ui.tsx Field                   | source-local date policy | native date; platform popup accepted                        | browser form           |
| Form           | src/components/actions.tsx; domain validation | solution spec            | create/edit                                                 | workflow tests         |
| Scrollbar      | src/app/globals.css                           | DESIGN.md                | global                                                      | browser computed style |
| Toast          | src/components/hub.tsx live region            | this contract            | success/error                                               | browser                |
| CRUD           | src/lib/actions.ts; workspace hook            | solution spec            | local action state transitions, owner edit, confirmed reset | domain/browser tests   |

Table selection and bulk mutation are not applicable. Charts and paginated source tables are read-oriented. SecretField is owned by src/components/ui.tsx; session transport/retry by demo-access.tsx and access validation by live-access.ts. SignalPanel owns typed observation/source-fact drawers. All use existing panels, typography and control tokens.

## Navigation and dataset state

Five views and selected asset use URL query parameters. Register filters, sort, page and query use URL state and survive Back. Prospective mode permits Problem Tank condition episodes, Investigation and actions from the same asset/cutoff review. Executive Overview, Data Map and historical register are disabled with explicit reasons to prevent rendering outcome summaries during replay. Tank → Investigation carries asset, mode and exact source-local cutoff. Weekly date-only eligibility uses end-of-day; real calendar/time validation is shared. Historical cutoff limits observations only, with retrospective report context labeled separately. Mode changes cancel in-flight requests, clear analyses and source dialogs. No current report, future condition remarks, risk labels or register aggregates enter prospective rendering/analysis.

## Action Tracker metric evidence scope

`src/lib/actions.ts` owns `actionTrackerMetrics`: the action list's base dataset, card values and Definition & local evidence drawer all use this shared review scope. Prospective eligibility requires analysisMode exactly prospective, caseId equal to the active asset and analysisAsOf equal to the active source-local cutoff. Missing legacy scope metadata is excluded in prospective and retained in historical review. Reading metrics/drawers never migrates, resets or changes persisted workspace records.

Historical card totals cover all local workspace actions across assets/review scopes, preserving the existing behavior. Action state/asset list filters affect the list only, not card totals or drawer datasets. Each drawer explains its specific card:

- Local action drafts: every eligible action, across all workflow states (including Closed/Rejected/Cancelled).
- Pending verification: only eligible actions in Pending Verification.
- Verified local closures: only eligible Closed actions with reviewer and completion evidence, using the existing metric predicate.
- Acknowledged local episodes: only Acknowledged episode IDs in historical review. Grouped/Open IDs and actions are excluded from this drawer. Prospective count is zero with empty actions/episodes because workspace acknowledgements lack asset/mode/cutoff provenance.

Drawer metadata explains the review scope and list-filter distinction. Historical actions, other assets/cutoffs, legacy actions and their reviewer/completion text cannot enter prospective metric evidence. The shared SourceDialog, approval/closure transitions, persistence and source data are retained; its visual tokens follow the system redesign. Regression tests open every metric drawer, including zero-result, mixed-scope, filtered-list and narrow/keyboard states.

## Forms, overlays and feedback

Fields have labels. Demo passcodes use shared SecretField: masked by default, accessible Show/Hide toggle, current-password autocomplete, associated persistent errors and retry. Passcodes are cleared on success and never persisted in workspace. Signed HttpOnly session is distinct from role simulation; rate/day/concurrency restrictions run on the server before provider fetch. Direct mode explicitly enables live for visitors using only server provider config, without login/Redis/application quotas. Gateway shows availability text and the existing live button, with no passcode/lock controls. Protected public live requires explicit opt-in, exact HTTPS origins and shared Redis login/quota/concurrency/revocation backing; outages fail closed. A 401/403/503 analysis response disables live access and reloads the owning gateway status, preserving analysis scope/workspace. Expired/revoked sessions show the same passcode form; storage failure shows explicit status retry. Provider keys are never entered in that form. Analysis states explicitly distinguish not requested, blocked, attempted/failed and validated. Normal-only evidence has no inferred mechanism/action draft. Each hypothesis has its own supporting/counter evidence and linked drafts; acceptance is bound to content.

Fields have labels. Forms use noValidate; validation errors are persistent text, associated with inputs, focus the first invalid field and preserve inputs. Action drafts are saved locally as edited, so navigation does not lose them. Source and reset dialogs use shared native-dialog primitive with accessible title, inert background, Escape and focus restoration; reset focuses Cancel first. No browser alert/confirm/prompt.

Search is immediate/local, has Clear and no remote race. Select preserves the existing authored popup, with visible combobox/label, named listbox, option selection and keyboard highlight feedback. Date controls remain native; operating-system date popup appearance is accepted. Tables use native table, horizontal overflow and 20 rows per page. Filter changes reset page. Empty results include reset filters. Shared notice/live region reports saved/failed state.

## Async and persistence

Read requests use AbortController and timeout; superseded responses cannot replace the selected case. Analysis is explicit, bounded, cancelable and duplicate clicks are blocked. Failures identify replay availability. Storage exceptions leave a visible memory-only warning. Invalid or stale dataset-version workspace is reset with a visible notice. Multi-tab changes warn and load latest state; no claim of concurrent enterprise editing. Reset removes local actions, hypothesis reviews, episode acknowledgements, owner edits and history, leaving supplied sources unchanged.

## Industrial light-mode presentation

Shared runtime tokens and primitives own all five views. Asset scenario and Simulated role controls now appear together in the header; their accessible names, control behavior, handlers and URL/persistence rules are retained. The active source scope strip shows the independent source window or cutoff, timezone unknown and review reference. Historical/prospective labels are context, not a live-ingestion indicator. Scope editing remains in Investigation/condition queue. Data Map KPI definitions use native details/summary disclosures; value/status remain visible, and opening a definition reveals the same source trigger and proposed-owner editor. Owner persistence/reset behavior is unchanged.

Overview places selected-source trends and decision context immediately after register KPIs; register status/ranking stays available below. A five-row source catalog shows each asset's independent hourly/weekly windows. Review scenario opens its full historical source window, clearing any prior cutoff; this catalog is available only in historical Overview. No cross-window aggregate is added.

Investigation's ordered observations → signals → hypotheses → review → linked action strip describes the workflow; it does not assert stage completion. Per-hypothesis evidence and missing checks reflow from two columns to one. Shared chart legends label source versus synthetic history/forecast and source-formula threshold direction; inspection/readings/source controls retain their semantics. Reading tables clamp their page when parameter/source scope shrinks.

Dialogs retain focus isolation/restoration and sticky Close, with document scroll locked while open. Long content and confirmation actions remain reachable through dialog scrolling. White sidebar reflows to scrollable top navigation at narrow widths; the active view is scrolled into that navigation strip on route change or viewport resize, with the confirmed Reset workspace button in a padded sidebar footer at all widths. Decorative sidebar prototype/review/snapshot text is removed, while functional warnings stay in the owning view. Short desktop sidebars scroll without navigation/footer overlap. Source excerpt overflow is a named keyboard-focusable region. Date/datetime-local popups remain platform-owned; Select uses the shared authored popup described above. Color is reinforced by text and simple icons; reduced-motion and forced-colors paths are global.

## Verification

Run lint/typecheck/domain tests/build and Playwright workflow/accessibility tests. Inspect five screens at 1440px, 1024px and narrow viewport, source dialog, empty search, error fallback, temporal mode and KO closure loop. DESIGN token ownership is stylesheet; documentation mirrors it. Status/README record actual results and untested domain/live API gates.

## Panel flow and governance refinement

Overview uses independent column stacks: source charts/status distribution/asset-window catalog and decision/discrepancy/reliability/priority context. The catalog follows status immediately in the same column; its table owns any horizontal scrolling. Status counts derive from the same active register filters as the KPIs; bars encode count/total and disappear for an empty scope. Display labels are aliases only; original status keys remain unchanged.

Data Map places Enterprise Data Architecture immediately after Source Library in the same column, opposite KPI Dictionary. Shared governance accordions and quality follow at full width, so expanded governance groups do not lengthen one column alone. Source-list scroll/navigation/search, KPI expansion/source/owner editing and downloads are retained. Source Library and architecture scrolling regions are named and keyboard-focusable. Accordion uses native details/summary with one custom chevron, no duplicate browser marker; Enter/Space toggle and native expanded semantics remain.

Investigation's hourly selector is inside the chart, including empty-observation scopes. Charts and probable review share a continuous column; evidence and discrepancies form a separate column. Similar incidents and report archive stay full-width. Narrow layout follows the same column-group DOM order without visual reordering; all discrepancies remain available, and hypotheses still show their own support, counter-evidence and missing checks. There are no fixed matching card heights or filler panels. See UI_REFINEMENT_REPORT.md for actual regression/render results.
