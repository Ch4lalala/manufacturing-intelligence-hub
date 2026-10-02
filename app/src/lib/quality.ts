import type { Asset, Quality } from "./types";
export function qualityFor(a: Asset): Quality[] {
  const loc = (sheet: string, cell: string) => ({
    file: a.info_source.file,
    sheet,
    cell,
  });
  const common: Quality[] = [
    {
      id: "DQ06",
      title: "Availability uses a source convention",
      detail:
        "Period Hours = 26 × 7 × 24 = 4368 h, although the first-to-last weekly timestamp spans 25 weeks. Planned operation was not supplied; source availability is not independently validated.",
      locators: [loc("Performance Summary", "A6:C7")],
    },
    {
      id: "DQ07",
      title: "PM compliance is source-stated",
      detail:
        "92% appears in all five workbooks. PM completed/scheduled work logs are unavailable; this is not recomputed compliance.",
      locators: [loc("Performance Summary", "A14:C14")],
    },
    {
      id: "DQ08",
      title: "Generic design-life metadata",
      detail:
        "Generic bearing/seal design-life wording is preserved as source metadata, including for the exchanger. It does not establish a technical design basis or remaining life.",
      locators: [loc("Equipment Info", "A11:B11")],
    },
    {
      id: "DQ11",
      title: "Weekly classifications are not notifications",
      detail:
        "ALARM/TRIP are formula-classified weekly readings. Delivery, acknowledgement logs and historical threshold effective dates are unavailable. Counts are not ignored alerts or verified lead time.",
      locators: [loc("Condition History", "G2:G27")],
    },
    {
      id: "DQ13",
      title: "Repair and CAPA have separate statuses",
      detail:
        "Post-repair remarks and report action plans have different meanings. Historical action snapshots are read-only, and dates do not establish actual overdue status today.",
      locators: [
        loc("Condition History", "A22:H27"),
        { file: a.report.file, slide: 9 },
      ],
    },
  ];
  if (a.tag === "KO-3201")
    common.unshift(
      {
        id: "DQ01",
        title: "Vibration comparison blocked",
        detail:
          "Hourly PI metadata is MM/S; weekly radial vibration is micron. No conversion, shared threshold or direct comparison is allowed pending engineering verification.",
        locators: [
          { file: a.production[0].source.file, sheet: "PI Tag", cell: "D4" },
          loc("Condition History", "C1"),
        ],
      },
      {
        id: "DQ02",
        title: "Oil samples and vibration chronology disagree",
        detail:
          "Weekly 22-Apr: 71.674 micron and 1372.791 ppm; 29-Apr: 76.5 micron and 1530 ppm. RCA later 29-Apr inspection: 1800 ppm, with a different vibration chronology. Sampling comparability remains unknown.",
        locators: [
          loc("Condition History", "A21:H22"),
          { file: a.report.file, slide: 3 },
          { file: a.report.file, slide: 6 },
        ],
      },
      {
        id: "DQ03",
        title: "Alarm policy version needs review",
        detail:
          "Workbook alarm 45 micron; RCA slide 7 says prior alert 60 micron; slide 10 recommends tightening to 45. Effective dates unknown. Replay uses source-workbook policy only.",
        locators: [
          loc("Equipment Info", "D5"),
          { file: a.report.file, slide: 7 },
          { file: a.report.file, slide: 10 },
        ],
      },
    );
  if (a.tag === "HE-3301")
    common.unshift({
      id: "DQ04",
      title: "Asset OFF does not mean plant shutdown",
      detail:
        "13 hourly OFF samples retain PLANT_RATE 12.094–12.397 T/H. RCA reports 12 h downtime and partial rate loss. Sample count, asset downtime and plant impact remain separate.",
      locators: [
        { file: a.production[0].source.file, sheet: "Sheet2", cell: "A2:H721" },
        { file: a.report.file, slide: 4 },
      ],
    });
  if (a.tag === "PM-4405B")
    common.unshift({
      id: "DQ05",
      title: "Standby supply has conflicting evidence",
      detail:
        "Hourly OFF records have PLANT_RATE 0–0.104 T/H (equiv.). RCA slides 3/4 say standby supply was maintained at reduced margin. Both sources remain visible; continuity and total shutdown are unverified.",
      locators: [
        { file: a.production[0].source.file, sheet: "Sheet2", cell: "A2:H721" },
        { file: a.report.file, slide: 3 },
        { file: a.report.file, slide: 4 },
      ],
    });
  if (a.tag === "PU-2101B")
    common.unshift({
      id: "DQ14",
      title: "Flush alarm statements conflict",
      detail:
        "RCA slide 3 describes a low-flow alarm; slide 7 says no trip/alarm on loss of flush. The control and event history need review.",
      locators: [
        { file: a.report.file, slide: 3 },
        { file: a.report.file, slide: 7 },
      ],
    });
  return common;
}
