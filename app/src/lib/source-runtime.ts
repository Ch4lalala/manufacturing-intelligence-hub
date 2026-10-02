import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { raw } from "./data";
const hash = (bytes: Buffer) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const failure = (message: string, status = 404) =>
  Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
function runtimeFile(relative: string, root: string) {
  const resolved = fs.realpathSync(path.resolve(root, relative)),
    boundary = fs.realpathSync(root) + path.sep;
  if (!resolved.startsWith(boundary)) throw new Error("Outside runtime");
  return fs.readFileSync(resolved);
}
export function sourceResponse(
  query: URLSearchParams,
  runtimeRoot = path.join(process.cwd(), "runtime"),
): Response {
  const file = query.get("file"),
    known = raw.inventory.find((s) => s.path === file);
  if (!known) return failure("Source is not in the verified catalog.");
  try {
    if (query.get("download") === "1") {
      let bytes: Buffer;
      try {
        bytes = runtimeFile(known.path, runtimeRoot);
      } catch {
        return failure(
          "Original file unavailable in the runtime package. Ask the maintainer to restore its verified copy.",
        );
      }
      if (hash(bytes) !== known.sha256)
        return failure(
          "Original integrity check failed. This file cannot be downloaded as verified.",
          503,
        );
      return new Response(new Uint8Array(bytes).buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(known.path))}`,
          "Cache-Control": "no-store",
        },
      });
    }
    const index = (key: string) => {
      const s = query.get(key);
      if (s === null) return null;
      if (!/^[1-9]\d*$/.test(s)) throw new Error("Invalid locator");
      return Number(s);
    };
    const slide = index("slide"),
      shape = index("shape"),
      page = index("page");
    const deck =
      raw.assets.find((a) => a.report.file === file)?.report ??
      (raw.explanation.file === file ? raw.explanation : null);
    let excerpt: string;
    if (deck) {
      const blocks = deck.slides
        .filter((s) => slide === null || s.slide === slide)
        .map((s) => ({
          slide: s.slide,
          blocks: s.blocks.filter(
            (b) => shape === null || b.shape_id === shape,
          ),
        }))
        .filter((s) => s.blocks.length);
      if (!blocks.length)
        return failure("That slide or shape is not present in this source.");
      excerpt = blocks
        .map(
          (s) =>
            `SLIDE ${s.slide}\n${s.blocks.map((b) => `Shape ${b.shape_id}: ${b.text ?? JSON.stringify(b.rows)}`).join("\n")}`,
        )
        .join("\n\n");
    } else if (file!.endsWith(".xlsx")) {
      const manifest = JSON.parse(
        runtimeFile("manifest.json", runtimeRoot).toString("utf8"),
      );
      const bytes = runtimeFile("workbook-excerpts.json", runtimeRoot);
      if (hash(bytes) !== manifest.workbookHash)
        return failure(
          "Workbook excerpts failed integrity verification. Retry after the runtime package is restored.",
          503,
        );
      const wb = JSON.parse(bytes.toString("utf8"))[file!];
      if (!wb || !Array.isArray(wb.sheets))
        return failure(
          "This workbook is absent from the runtime excerpt package.",
          503,
        );
      const sheet = query.get("sheet");
      const sheets = wb.sheets.filter(
        (s: { name: string }) => !sheet || s.name === sheet,
      );
      if (!sheets.length)
        return failure("That worksheet is not present in this source.");
      const parse = (ref: string) => {
        const m = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(ref);
        if (!m) throw new Error("Invalid cell");
        return {
          row: Number(m[2]),
          col: [...m[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0),
        };
      };
      const range = query.get("cell")?.split(":");
      if (range && range.length > 2) throw new Error("Invalid range");
      const start = range ? parse(range[0]) : null,
        end = range ? parse(range[1] ?? range[0]) : null;
      if (start && end && (start.row > end.row || start.col > end.col))
        throw new Error("Reversed range");
      excerpt = sheets
        .map(
          (s: {
            name: string;
            values: unknown[][];
            formulas: { cell: string; formula: string }[];
          }) => {
            if (start && start.row > s.values.length)
              throw new Error("Outside sheet");
            const rows = s.values
              .map((values, row) => ({ values, row: row + 1 }))
              .filter(
                (r) => !start || (r.row >= start.row && r.row <= end!.row),
              );
            if (start && rows.every((r) => start.col > r.values.length))
              throw new Error("Outside sheet");
            return `${s.name}\n${rows.map((r) => `Row ${r.row}: ${JSON.stringify(start ? r.values.slice(start.col - 1, end!.col) : r.values)}`).join("\n")}\nSource formulas: ${JSON.stringify(s.formulas ?? {})}`;
          },
        )
        .join("\n\n");
    } else {
      const official = raw.official.find((d) => d.file === file);
      if (official) {
        const pages = official.pages.filter(
          (s) => page === null || s.page === page,
        );
        if (!pages.length)
          return failure("That page is not present in this source.");
        excerpt = pages.map((s) => `PAGE ${s.page}\n${s.text}`).join("\n\n");
      } else {
        const bytes = runtimeFile(known.path, runtimeRoot);
        if (hash(bytes) !== known.sha256)
          return failure("Source integrity check failed.", 503);
        excerpt = bytes.toString("utf8");
      }
    }
    return Response.json(
      { excerpt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code;
    return failure(
      missing || error instanceof SyntaxError
        ? "Source package unavailable or corrupt. Retry after its verified runtime files are restored."
        : "Use a valid locator within the selected source.",
      missing || error instanceof SyntaxError ? 503 : 400,
    );
  }
}
