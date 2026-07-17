import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const baseDir = resolve("raw", "WORD-LISTS");
const files = [
  "UrduLughatWithTaqti.txt",
  "Hindi.txt",
  "Farsi.txt",
  "Roman.txt",
  "pairlst.txt",
  "PureHindi.txt",
];

const manifest = {
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  files: {},
};

files.forEach((name) => {
  const path = resolve(baseDir, name);
  const data = readFileSync(path);
  const hash = createHash("sha256").update(data).digest("hex").toUpperCase();
  manifest.files[name] = { sha256: hash, size: data.length };
});

const manifestPath = resolve(baseDir, "manifest.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${manifestPath}`);
