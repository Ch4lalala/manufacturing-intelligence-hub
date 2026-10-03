---
version: alpha
name: CALIBER Manufacturing Decision Hub
description: An industrial light-mode evidence workbench for plant managers and reliability engineers.
colors:
  navy: "#0f172a"
  canvas: "#f7f9fc"
  surface: "#ffffff"
  ink: "#0f172a"
  muted: "#64748b"
  line: "#e2e8f0"
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-soft: "#eff6ff"
  primary-ink: "#1d4ed8"
  warning: "#854d0e"
  warning-surface: "#fef3c7"
  danger: "#991b1b"
  danger-surface: "#fee2e2"
  success: "#166534"
  success-surface: "#dcfce7"
  neutral-surface: "#f1f5f9"
  neutral-ink: "#475569"
  synthetic: "#6b21a8"
  synthetic-surface: "#f3e8ff"
  focus: "#1d4ed8"
  control-border: "#8291a6"
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
  mono:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
rounded:
  DEFAULT: "16px"
  control: "8px"
spacing:
  section: "20px"
  panel: "20px"
components:
  button:
    minHeight: "38px"
  card:
    borderWidth: "1px"
  dialog:
    maxWidth: "760px"
---

## Overview

English product interface for a student team's local CALIBER walkthrough. Plant managers compare historical exposure and source windows; reliability engineers inspect observations and review linked actions. The visual reference is a condition trend analyzer inside an industrial SaaS workbench: quiet white navigation, compact blue controls, technical readings and an evidence rail. The signature is a visible source-window strip and the observations → signals → hypotheses → review → linked action sequence. These encode real scope and workflow, not decorative telemetry or live monitoring.

This redesign is a system-level change requested by the user, replacing the earlier navy/teal engineering-sheet treatment. The light palette in the current brief takes precedence over the older visual paragraph in SOLUTION_SPEC.md. Domain contracts, source wording and temporal eligibility retain their authority. No external fonts, dependencies, decorative machinery or invented company marks are introduced.

## Colors

Canvas #F7F9FC, surface #FFFFFF, text #0F172A, secondary text #64748B, border #E2E8F0. Royal blue #2563EB denotes primary actions and source series. Dark blue #1D4ED8 is the hover, link-caption and focus color. White on the blue button and muted slate on white/canvas retain readable contrast; control boundaries use #8291A6 because the softer panel border alone is insufficient for field affordance.

Neutral badges/table headings use #475569 on #F1F5F9. Semantic foregrounds are #166534 on #DCFCE7 for success, #991B1B on #FEE2E2 for danger, #854D0E on #FEF3C7 for warning and #6B21A8 on #F3E8FF for synthetic illustration. Every badge retains its textual meaning. Notice icons reinforce the written message. Historical status, prototype activity and synthetic utility values stay distinct. Decorative prototype/source-snapshot sidebar copy is omitted; functional evidence, simulated-role and AI limitations remain in their workflow context.

## Typography

Local system sans stack for body/headings: -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif. No font download or layout shift. Body 14px/1.5; h1 28px, panel heading 17px, operational captions 12px and compact badges 11px. KPI dictionary numeric previews use up to three decimals; exact source values remain in their drawer. Technical tags, numeric columns, metric values and source excerpts use SFMono-Regular, Consolas, Liberation Mono, monospace with tabular figures. Source symbols, units, formulas, dates and locators are preserved; no punctuation normalization. At narrow widths charts have equivalent readings tables and exact inspection text.

## Layout

Persistent white 248px desktop sidebar, 216px below 1200px. CALIBER is a single-line name; 2026 and a small Case 2 badge form the edition row, followed by the secondary subtitle. Reset workspace lives inside a padded footer; on short desktop viewports the sidebar itself scrolls without shrinking navigation. Fluid document main with 28px outer padding and 20px section/panel rhythm. At 1440px charts occupy the larger column, decision/evidence context the smaller one. At 1024px the header's context row spans both controls; compact two-column content remains usable. Below 1100px content columns stack so chart labels remain readable at 1024px. Below 760px navigation becomes a horizontally scrollable top strip, never a fictitious hamburger menu. At 390px fields, long evidence and forms reflow; tables own horizontal scrolling.

Overview hierarchy: register scope and four source-derived KPIs → independent panel columns (hourly/weekly trends plus status distribution and independent asset-window catalog; decision context/discrepancies/reliability plus priority incidents) → isolated utilities. Natural panel heights and 20px stack spacing avoid cross-column grid-row coupling. Status distribution uses aligned label/bar/count columns, source-status display aliases and filtered proportions; empty scopes show no bars. No simultaneous fleet snapshot is implied. Data Map pairs Source Library → Enterprise Data Architecture with KPI Dictionary, followed by full-width Governance & Integration Roadmap and quality gaps. Governance spans the content width so opening groups does not extend only one column. Existing source-list scrolling is retained, not introduced to equalize column heights. Shared details-based accordions provide icons, chevrons and structured governance text without inventing progress. Investigation uses a semantic ordered review sequence: weekly/hourly charts and probable engineering review flow in one column; supporting evidence and discrepancies flow in the other. Similar retrieval and historical RCA archive retain full-width panels below. Hourly Telemetry is a labelled control in the chart header area, including no-observation states. Column stacks preserve DOM order when narrowing; no CSS order/absolute-position masonry is used. Per-hypothesis supporting/counter evidence and missing checks remain in adjacent columns. Action cards retain their natural-height form and explicit lifecycle.

## Elevation & Depth

Panels/metrics use 1px borders and soft `--panel-shadow: 0 2px 8px #0f172a04, 0 1px 2px #0f172a03`. Modal dialogs use `--dialog-shadow: 0 24px 80px #0f172a30` and a dimmed backdrop. No gradients or decorative separators. The source dialog header remains visible while long content scrolls. Critical warnings remain inline; none depends on hover.

## Shapes

16px card/panel/dialog radius, 8px controls and grouped field surfaces, 6px dense source/badge treatments. Status and source series use simple consistent 1.7px stroked icons from icons.tsx; all decorative icons are hidden from assistive technology. Navigation labels remain visible.

## Components

One canonical Button, Badge, Notice, Panel, Accordion, Search, Select, Field, SecretField, Modal, SourceDialog and Pagination in ui.tsx. No screen-local variants of these primitives. Shared Chart owns source/synthetic legend, light grid, unit/time axes, selected-reading inspection, paginated observation table and source trigger. Alarm/trip comparison signs in Investigation come from the original status formula, matching existing deterministic interpretation; thresholds never cross hourly/weekly units. Native SVG hover titles contain only the associated source point/time; full values are always available in inspection/table text.

Select retains the authored dropdown already present in checkout 16acb7b: its visible trigger has combobox semantics, labelled listbox/options and active-descendant feedback; the hidden native value adapter is not a second user-facing control. Native date and datetime-local behavior remains intentional; operating-system popup language/geometry is accepted. Shared native dialog provides inert background, focus isolation, Escape and restoration. Document scroll locks while a modal is open; the dialog owns overflow and its sticky Close remains reachable. Buttons have shared hover/focus/active/disabled states. Loading uses a compact spinner and stable minimum panel region; busy requests preserve the existing explicit labels. All motion is short feedback (120ms) and removed for reduced motion. Global tokenized scrollbars inherit across every owned scroll surface; forced colors use system colors.

### Runtime ownership and drift checks

Ownership model B: **src/app/globals.css :root is canonical**. DESIGN.md mirrors accepted tokens and explains intent; there is no secondary theme package or generated export. Change CSS once, then update this document in the same changeset.

| Document path                                    | Runtime token                                     | Consumers                                        |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| colors.*                                         | Same-name --* variables                           | Shell, fields, buttons, badges, notices, charts  |
| typography.sans / display / mono                 | --sans / --display / --mono; display aliases sans | Body/headings, equipment tags/numerals, excerpts |
| rounded.DEFAULT / control                        | --radius / --control-radius                       | Cards/dialogs / controls                         |
| spacing.section / panel                          | --section-gap / --panel-padding                   | Shared panel/grid spacing                        |
| Elevation & Depth                                | --panel-shadow / --dialog-shadow                  | Panels/metrics / shared Modal                    |
| colors.control-border / canvas / muted / primary | --scroll-thumb / track / hover / active           | Global standards/WebKit scrollbar baseline       |

Project browser tests assert rendered canvas, primary, panel radius, contrast, all five screens at 1440/1024/390, modal keyboard behavior and source values. The redesign adds a deterministic CSS/document token drift test. DESIGN.md lint and premium strict audit complement runtime verification.

## Do's and Don'ts

Keep register exposure separate from asset windows; losses retain k US$ and actual/potential definitions. Preserve source/computed/proposed/synthetic labels, all source drawers/downloads and conflicts. Keep Action Tracker's shared metric/drawer scope and historical list-filter independence. Keep OFF asset distinct from plant shutdown. Do not introduce OEE, RUL, confidence percentages, FFT/spectrum telemetry, fake fleet availability, staff/stock, savings or a live badge. Utility illustration never enters baseline/AI cases. Public live stays disabled; role and action completion are prototype simulations.
