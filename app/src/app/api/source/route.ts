import fs from "node:fs";
import path from "node:path";
import { raw, incidents } from "@/lib/data";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const file = p.get("file");
  const known = raw.inventory.find((s) => s.path === file);
  if (!known)
    return Response.json(
      { error: "Source is not in the verified catalog." },
      { status: 404 },
    );
  if (p.get("download") === "1") {
    const target = path.resolve(process.cwd(), "..", known.path);
    try {
      return new Response(fs.readFileSync(target), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(known.path))}`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return Response.json(
        {
          error:
            "Original file unavailable. Restore the supplied source at its catalog path.",
        },
        { status: 404 },
      );
    }
  }
  const slide = Number(p.get("slide")),
    shape = Number(p.get("shape"));
  const deck =
    raw.assets.find((a) => a.report.file === file)?.report ??
    (raw.explanation.file === file ? raw.explanation : null);
  if (deck)
    return Response.json({
      excerpt: deck.slides
        .filter((s) => !slide || s.slide === slide)
        .map(
          (s) =>
            `SLIDE ${s.slide}\n${s.blocks
              .filter((b) => !shape || b.shape_id === shape)
              .map(
                (b) =>
                  `Shape ${b.shape_id}: ${b.text ?? JSON.stringify(b.rows)}`,
              )
              .join("\n")}`,
        )
        .join("\n\n"),
    });
  const official = raw.official.find((d) => d.file === file);
  if (official)
    return Response.json({
      excerpt: official.pages
        .map((s) => `PAGE ${s.page}\n${s.text}`)
        .join("\n\n"),
    });
  if (file?.endsWith(".xlsx")) {
    const wb = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "../processed/workbook_extraction.json"),
        "utf8",
      ),
    )[file!];
    const sheet = p.get("sheet"),
      cell = p.get("cell");
    if (wb) {
      const sheets = wb.sheets.filter(
        (s: { name: string }) => !sheet || s.name === sheet,
      );
      const parse = (ref: string) => {
        const m = ref.match(/^([A-Z]+)(\d+)$/);
        if (!m) return null;
        return {
          row: Number(m[2]),
          col: [...m[1]].reduce((s, c) => s * 26 + c.charCodeAt(0) - 64, 0),
        };
      };
      const refs = cell?.split(":");
      const start = refs ? parse(refs[0]) : null,
        end = refs ? parse(refs[1] ?? refs[0]) : null;
      return Response.json({
        excerpt: sheets
          .map(
            (s: { name: string; values: unknown[][]; formulas: unknown }) =>
              `${s.name}\n${s.values
                .map((row, r) => ({ row: r + 1, values: row }))
                .filter(
                  (row) =>
                    !start ||
                    (row.row >= start.row &&
                      row.row <= (end?.row ?? start.row)),
                )
                .map(
                  (row) =>
                    `Row ${row.row}: ${JSON.stringify(start ? row.values.slice(start.col - 1, end?.col) : row.values)}`,
                )
                .join(
                  "\n",
                )}\nSource formulas: ${JSON.stringify(s.formulas ?? {})}`,
          )
          .join("\n\n"),
      });
    }
    const a = raw.assets.find((a) => a.production[0].source.file === file);
    if (a)
      return Response.json({
        excerpt:
          sheet === "PI Tag"
            ? a.production_metadata
                .map((m, i) => `Row ${i + 2}: ${JSON.stringify(m)}`)
                .join("\n")
            : a.production
                .filter(
                  (r) => !cell || r.source.cell === cell || cell === "A2:H721",
                )
                .map((r) => `${r.source.cell}: ${JSON.stringify(r.values)}`)
                .join("\n"),
      });
    return Response.json({
      excerpt: incidents
        .filter((i) => i.source.file === file)
        .map((i) => JSON.stringify(i.raw))
        .join("\n"),
    });
  }
  try {
    return Response.json({
      excerpt: fs.readFileSync(
        path.resolve(process.cwd(), "..", known.path),
        "utf8",
      ),
    });
  } catch {
    return Response.json(
      { error: "Source excerpt unavailable." },
      { status: 404 },
    );
  }
}
