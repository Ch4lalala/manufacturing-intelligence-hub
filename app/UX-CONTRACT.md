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
| Select/Listbox | src/components/ui.tsx Select                  | DESIGN.md                | native; platform popup accepted                             | browser keyboard       |
| Date           | src/components/ui.tsx Field                   | source-local date policy | native date; platform popup accepted                        | browser form           |
| Form           | src/components/actions.tsx; domain validation | solution spec            | create/edit                                                 | workflow tests         |
| Scrollbar      | src/app/globals.css                           | DESIGN.md                | global                                                      | browser computed style |
| Toast          | src/components/hub.tsx live region            | this contract            | success/error                                               | browser                |
| CRUD           | src/lib/actions.ts; workspace hook            | solution spec            | local action state transitions, owner edit, confirmed reset | domain/browser tests   |

Table selection and bulk mutation are not applicable. Charts and paginated source tables are read-oriented. SecretField is owned by src/components/ui.tsx; session transport/retry by demo-access.tsx and access validation by live-access.ts. SignalPanel owns typed observation/source-fact drawers. All use existing panels, typography and control tokens.

## Navigation and dataset state

Five views and selected asset use URL query parameters. Register filters, sort, page and query use URL state and survive Back. Prospective mode permits Problem Tank condition episodes, Investigation and actions from the same asset/cutoff review. Executive Overview, Data Map and historical register are disabled with explicit reasons to prevent rendering outcome summaries during replay. Tank → Investigation carries asset, mode and exact source-local cutoff. Weekly date-only eligibility uses end-of-day; real calendar/time validation is shared. Historical cutoff limits observations only, with retrospective report context labeled separately. Mode changes cancel in-flight requests, clear analyses and source dialogs. No current report, future condition remarks, risk labels or register aggregates enter prospective rendering/analysis.

## Forms, overlays and feedback

Fields have labels. Demo passcodes use shared SecretField: masked by default, accessible Show/Hide toggle, current-password autocomplete, associated persistent errors and retry. Passcodes are cleared on success and never persisted in workspace. Signed HttpOnly session is distinct from role simulation; rate/day/concurrency restrictions run on the server before provider fetch. No public live mode without shared quota backing. Analysis states explicitly distinguish not requested, blocked, attempted/failed and validated. Normal-only evidence has no inferred mechanism/action draft. Each hypothesis has its own supporting/counter evidence and linked drafts; acceptance is bound to content.

Fields have labels. Forms use noValidate; validation errors are persistent text, associated with inputs, focus the first invalid field and preserve inputs. Action drafts are saved locally as edited, so navigation does not lose them. Source and reset dialogs use shared native-dialog primitive with accessible title, inert background, Escape and focus restoration; reset focuses Cancel first. No browser alert/confirm/prompt.

Search is immediate/local, has Clear and no remote race. Native selects/date controls retain native semantics; operating-system popup appearance is accepted. Tables use native table, horizontal overflow and 20 rows per page. Filter changes reset page. Empty results include reset filters. Shared notice/live region reports saved/failed state.

## Async and persistence

Read requests use AbortController and timeout; superseded responses cannot replace the selected case. Analysis is explicit, bounded, cancelable and duplicate clicks are blocked. Failures identify replay availability. Storage exceptions leave a visible memory-only warning. Invalid or stale dataset-version workspace is reset with a visible notice. Multi-tab changes warn and load latest state; no claim of concurrent enterprise editing. Reset removes local actions, hypothesis reviews, episode acknowledgements, owner edits and history, leaving supplied sources unchanged.

## Verification

Run lint/typecheck/domain tests/build and Playwright workflow/accessibility tests. Inspect five screens at 1440px, 1024px and narrow viewport, source dialog, empty search, error fallback, temporal mode and KO closure loop. DESIGN token ownership is stylesheet; documentation mirrors it. Status/README record actual results and untested domain/live API gates.
