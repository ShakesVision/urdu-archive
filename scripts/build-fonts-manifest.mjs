/**
 * Scan raw/FONTS (including subfolders) and write manifest.json.
 * Run from repo root: node scripts/build-fonts-manifest.mjs
 */
import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, extname, join, relative, resolve } from "path";

const FONTS_DIR = resolve("raw", "FONTS");
const MANIFEST_PATH = join(FONTS_DIR, "manifest.json");
const EXT_FORMAT = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype",
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanName(filePath) {
  const base = basename(filePath, extname(filePath));
  return base.replace(/[-_]+/g, " ").trim();
}

function walk(dir) {
  const fonts = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      fonts.push(...walk(full));
      continue;
    }
    const ext = extname(entry).toLowerCase();
    const format = EXT_FORMAT[ext];
    if (!format) continue;

    const rel = relative(FONTS_DIR, full).replace(/\\/g, "/");
    const data = readFileSync(full);
    fonts.push({
      id: slugify(rel.replace(ext, "")),
      name: humanName(rel),
      path: rel,
      format,
      size: data.length,
      sha256: createHash("sha256").update(data).digest("hex").toUpperCase(),
    });
  }
  return fonts.sort((a, b) => a.name.localeCompare(b.name, "ur"));
}

let previewText = "شاعری خوش خط نستعلیق — الف ب پ ت";
try {
  const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (existing.previewText) previewText = existing.previewText;
} catch {
  // first run
}

const manifest = {
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  previewText,
  baseUrl:
    "https://cdn.jsdelivr.net/gh/ShakesVision/urdu-archive@master/raw/FONTS",
  fonts: walk(FONTS_DIR),
};

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${MANIFEST_PATH} (${manifest.fonts.length} fonts)`);
