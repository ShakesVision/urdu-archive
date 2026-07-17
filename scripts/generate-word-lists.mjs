#!/usr/bin/env node
// Regenerate raw/WORD-LISTS/Hindi.txt and Roman.txt (word<TAB>wazn) from the
// vocalized Urdu master list, per docs/WORD-LIST-REGENERATION.md.
//
// Usage: node scripts/generate-word-lists.mjs
//
// Ships two artifacts beyond the word lists themselves:
//   raw/WORD-LISTS/review-needed.txt  -- words the engine flagged uncertain
//     (unknown characters / empty output) and therefore EXCLUDED from the
//     shipped lists.
//   raw/WORD-LISTS/low-confidence.txt -- words that ARE shipped, but whose
//     source Urdu line was sparsely vocalized (few or no harakat), so the
//     reading is a best-effort guess worth a human pass later.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { convertWord } from "./lib/transliterate.mjs";

const baseDir = resolve("raw", "WORD-LISTS");
const srcPath = resolve(baseDir, "UrduLughatWithTaqti.txt");

const MARKS = new Set(["ً", "ٌ", "ٍ", "َ", "ُ", "ِ", "ّ", "ْ", "ٔ", "ٕ", "ٖ", "ٗ", "٘", "ٰ"]);

function markDensity(word) {
  let bases = 0;
  let marks = 0;
  for (const ch of word) {
    if (MARKS.has(ch)) marks++;
    else bases++;
  }
  return bases ? marks / bases : 0;
}

const text = readFileSync(srcPath, "utf8");
const lines = text.split("\n");

const hindiMap = new Map(); // devanagari word -> { wazn, source }
const romanMap = new Map(); // roman word -> { wazn, source }
const uncertain = [];
const lowConfidence = [];
let hindiCollisions = 0;
let romanCollisions = 0;
let total = 0;

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  const tabIdx = line.indexOf("\t");
  if (tabIdx < 0) continue;
  const urduWord = line.slice(0, tabIdx).trim();
  const wazn = line.slice(tabIdx + 1).trim();
  if (!urduWord || !wazn) continue;
  total++;

  const { devanagari, roman, uncertain: isUncertain } = convertWord(urduWord, wazn);

  if (isUncertain || !devanagari || !roman) {
    uncertain.push(`${urduWord}\t${wazn}`);
    continue;
  }

  const dev = devanagari.normalize("NFC");
  const rom = roman.normalize("NFC");

  if (markDensity(urduWord.split("/")[0]) < 0.15) {
    lowConfidence.push(`${urduWord}\t${wazn}\t${dev}\t${rom}`);
  }

  if (hindiMap.has(dev)) {
    hindiCollisions++;
  } else {
    hindiMap.set(dev, wazn);
  }

  if (romanMap.has(rom)) {
    romanCollisions++;
  } else {
    romanMap.set(rom, wazn);
  }
}

function writeSorted(map, path) {
  const words = [...map.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const body = words.map((w) => `${w}\t${map.get(w)}`).join("\n") + "\n";
  writeFileSync(path, body, "utf8");
  return words.length;
}

const hindiCount = writeSorted(hindiMap, resolve(baseDir, "Hindi.txt"));
const romanCount = writeSorted(romanMap, resolve(baseDir, "Roman.txt"));

writeFileSync(
  resolve(baseDir, "review-needed.txt"),
  "# Urdu\\twazn entries excluded from Hindi.txt/Roman.txt: unknown characters or empty conversion output.\n" +
    "# Re-run scripts/generate-word-lists.mjs after extending scripts/lib/transliterate.mjs.\n" +
    uncertain.join("\n") +
    (uncertain.length ? "\n" : ""),
  "utf8"
);

writeFileSync(
  resolve(baseDir, "low-confidence.txt"),
  "# Shipped entries whose source Urdu line had sparse diacritics (<15% marks/letters).\n" +
    "# Format: urdu\\twazn\\thindi\\troman -- spot-check these first in any human review pass.\n" +
    lowConfidence.join("\n") +
    (lowConfidence.length ? "\n" : ""),
  "utf8"
);

console.log(`Source lines:        ${total}`);
console.log(`Hindi.txt entries:    ${hindiCount} (${hindiCollisions} collisions collapsed)`);
console.log(`Roman.txt entries:    ${romanCount} (${romanCollisions} collisions collapsed)`);
console.log(`Excluded (uncertain): ${uncertain.length}`);
console.log(`Low-confidence flags: ${lowConfidence.length}`);
console.log(`Hindi coverage:       ${((hindiCount / total) * 100).toFixed(1)}%`);
console.log(`Roman coverage:       ${((romanCount / total) * 100).toFixed(1)}%`);
