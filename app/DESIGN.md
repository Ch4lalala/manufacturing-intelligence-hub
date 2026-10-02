---
version: alpha
name: CALIBER Manufacturing Decision Hub
description: A source-led operations workbench for plant managers and reliability engineers.
colors:
  navy: "#142b3b"
  canvas: "#f1f5f7"
  surface: "#ffffff"
  ink: "#162c3b"
  muted: "#506472"
  line: "#c9d5dd"
  primary: "#09676b"
  warning: "#875100"
  danger: "#b22e3f"
  success: "#226143"
  focus: "#166fc1"
typography:
  sans:
    fontFamily: "Arial, Helvetica, sans-serif"
  display:
    fontFamily: "Arial Narrow, Arial, sans-serif"
  mono:
    fontFamily: "SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "8px"
  control: "5px"
spacing:
  section: "24px"
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

Product register. English local student prototype for the competition team, viewed on laptop/desktop. The visual reference is an engineering review sheet: explicit sampling grain, marked revisions, aligned numeric columns and a compact evidence rail. The signature is the evidence rail beside a trend and investigation, connecting the observation to the source and then to a reviewed action. No fictional logos or plant artwork.

Tokens above map by name to `src/app/globals.css` custom properties; shared primitives in `src/components/ui.tsx` and charts in `chart.tsx` consume those properties. Token changes update this document and the stylesheet together. No external fonts are needed for the offline walkthrough.

## Colors

Navy navigation, white panels on a cool canvas, teal primary actions. Warning, danger and success always have textual labels. Muted text remains readable against white. Chart lines use primary; alarm/trip thresholds use warning/danger and explicit labels. Global scrollbar thumb uses muted, track canvas, hover primary; forced-colors uses system colors.

## Typography

Arial body at 14px with 1.5 line height. Restrained condensed heading stack, technical captions and tabular figures in the mono stack. Sentence case, no promotional slogans. Source excerpts retain source text. Dates stay source-local with timezone unknown.

## Layout

224px sidebar, fluid main area, 24px section gaps and 20px panel padding. Two-column content becomes one column under 1050px; sidebar becomes top navigation below 760px. Tables own horizontal overflow. Forms grow naturally in the document. No page clipping to fit a table.

## Elevation & Depth

Flat panels with 1px borders. Only modal source/action dialogs have shadow. No decorative gradients.

## Shapes

8px panels, 5px controls, status badges with border and text. Charts use thin grid rules and explicit unit captions.

## Components

Shared button, search, select, field, SecretField, modal, notice, badge, panel, source trigger and paginator. Demo access uses the existing evidence panel and field/button tokens, with masked passcode, Show/Hide and persistent errors. Signal/fact cards reuse quality-card and table styles; each hypothesis owns its reviewed action controls. No palette/layout change in the repair. Native selects and native dates accept operating-system popups. Modal uses native dialog focus isolation, Escape, focus restoration and scrollable content. Buttons show hover, keyboard focus, active, disabled and busy states. Sources render exact excerpts plus full locators. Busy geometry is stable; async failures preserve previous safe inputs and offer retry.

Motion is limited to 120ms control feedback and removed for reduced motion. Charts have textual summaries, observation tables and source access. Search has clear; tables paginate. Severity is never conveyed by color alone.

## Do's and Don'ts

Do keep the register scope and selected asset window visibly separate. Do show source/computed/proposed/synthetic labels. Do keep all five views visually consistent. Do not turn conflicting measurements into one series. Do not add machinery art or invented improvement statistics.
