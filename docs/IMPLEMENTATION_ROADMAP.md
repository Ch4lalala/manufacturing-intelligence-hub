# Feasibility, roadmap and remaining inputs

This is a proposed work plan. No development duration, pilot benefit, budget or deployment commitment has been measured. The official booklet page 7 states the preliminary deadline as 4 October 2026, 23:59 WIB. The team must confirm its own working schedule and submission instructions from the committee.

| Phase | Work | Exit evidence | Timing status |
| --- | --- | --- | --- |
| Handoff (this package) | Original source snapshots, extraction, factual audit, product specification, execution prompt, internal guide | Source hashes and package verification pass | Prepared on 2 October 2026 |
| Local prototype | Codex implements five views, five RCA scenarios, retrieval, reviewed actions, utility illustration and provider fallback | Meaningful data/workflow tests, build and inspected screens; live API tested only if configured | Team work before submission; duration not estimated |
| Submission preparation | Team creates English deck/video and verifies prototype access | All three materials available; 7-slide structure, 3-minute demo and combined 10 MB limit checked | Before official deadline; first submission only |
| Domain pilot | Engineers/KPI owners validate source semantics, alert rules and useful action guidance | User observations, source mappings approved and agreed success measurements | Proposed next stage, scheduling/resources not agreed |
| Operational integration | Historian/CMMS/utility inputs, identity, audit and governance | Tested contracts, permissions, time/grain alignment and reviewed IT/OT separation | Proposed after pilot; no production readiness claim |
| Advanced extensions | Scheduling/procurement, validated forecasting or failure models | Input coverage and independent model/process validation | Optional after evidence supports value |

## Production feasibility considerations to explain in the deck

- Technical: historian and maintenance-system data contracts, source lineage, clock alignment and failure handling. The local JSON/localStorage prototype does not prove scalable enterprise integration.
- Operational: engineers validate threshold versions, measurement meaning, action guidance and closure criteria. Maintenance/Operations/KPI-owner roles are proposals until reviewed by the company.
- Data governance: source owners, definition approval, change history, access scope, retention and dataset quality review must be agreed. Conflicting source facts remain visible during review.
- Cybersecurity: server-side API credentials, minimum necessary external AI context, access controls, audit and separation from equipment control. Prototype roles simulate review; production authorization is out of scope.
- Legal/provider use: the company must review data-sharing rights, provider terms, privacy/retention and any applicable policies before sending operational data outside approved systems. No legal-compliance certification is claimed here.
- Organizational: nominate KPI stewards, an engineering reviewer and action owners; validate the workflow with impacted users before expanding.

## Inputs not supplied and how Codex must handle them

| Missing input | Completion path now | Later dependency |
| --- | --- | --- |
| Usable API key and exact available model ID | Finish local app in visible evidence-replay mode; configure privately in `.env.local` | Authorized live test to establish endpoint/model support |
| Utility/emission meters and factors | Default unavailable cards; isolated labeled illustration and reproducible assumption registry | Matched real intervals/output/factor provenance before real KPIs/forecast evaluation |
| Existing dashboard inventory and approved KPI owners | Proposed consolidation matrix and owners marked proposed | Stakeholder inventory and approval before claiming eliminated redundancy |
| Alarm version/effective dates, acknowledgement logs | Source-workbook replay policy with uncertainty; no ignored-alarm/lead-time claim | Operational alarm history review |
| Real staff, stock and job-duration data | Role-based action drafts only | Approved resources and procedures for scheduling/procurement |
| Measured improvement baseline | Pilot measurement plan, no invented results | Actual user/operational evaluation |
| Team name/profile for deck | Team inserts separately; not needed to build the app | Booklet-required team slide |

## Pilot measurement definitions

Measure time from a defined investigation task to locating the correct evidence; citation correctness as valid eligible references divided by references reviewed; useful hypothesis fraction by engineer review; priority agreement against reviewed examples; and verified closure fraction among completed pilot actions. Establish sample selection and baseline first. A target is a proposed goal, a result needs an actual measured study; neither is provided as a fabricated number in this package.
