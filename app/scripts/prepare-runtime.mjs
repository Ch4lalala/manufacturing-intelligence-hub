import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(app),
  target = path.join(app, "runtime");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const raw = JSON.parse(
  fs.readFileSync(path.join(app, "data/normalized.json"), "utf8"),
);
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, "processed/source_inventory.json"), "utf8"),
);
if (
  inventory.length !== 22 ||
  JSON.stringify(raw.inventory) !== JSON.stringify(inventory)
)
  throw Error(
    "Source catalog differs. Review original integrity before preparing runtime.",
  );
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "PACKAGE_MANIFEST.json"), "utf8"),
);
const wbEntry = manifest.files.find(
  (f) => f.path === "processed/workbook_extraction.json",
);
const wb = fs.readFileSync(path.join(root, wbEntry.path));
if (hash(wb) !== wbEntry.sha256)
  throw Error("Workbook excerpt snapshot changed.");
// Validate all bytes before replacing only our generated directory.
const files = inventory.map((s) => {
  if (
    !s.path.startsWith("sources/") ||
    s.path.includes("..") ||
    path.isAbsolute(s.path)
  )
    throw Error("Invalid catalog path.");
  const bytes = fs.readFileSync(path.join(root, s.path));
  if (bytes.length !== s.bytes || hash(bytes) !== s.sha256)
    throw Error("Missing or changed original: " + s.path);
  return { source: s, bytes };
});
fs.rmSync(target, { recursive: true, force: true });
for (const { source, bytes } of files) {
  const dest = path.join(target, source.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
}
fs.writeFileSync(path.join(target, "workbook-excerpts.json"), wb);
fs.writeFileSync(
  path.join(target, "manifest.json"),
  JSON.stringify(
    { originals: inventory, workbookHash: wbEntry.sha256 },
    null,
    2,
  ) + "\n",
);
console.log(
  "Prepared server-only runtime: 22 verified originals and hash-verified workbook excerpts; no environment files copied.",
);
