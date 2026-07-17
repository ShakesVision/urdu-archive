#!/usr/bin/env node
// Extract a flat, sorted, deduped Devanagari headword list from the
// LibreOffice hi_IN Hunspell dictionary (raw/WORD-LISTS/hindi-hunspell/).
// Source: GNU Aspell Hindi Word List (janabhaaratii project, 2005),
// converted to Hunspell/UTF-8 by Laszlo Nemeth for LibreOffice/OpenOffice.
// License: GPL (see raw/WORD-LISTS/hindi-hunspell/Copyright).
//
// This ships base headwords only (Hunspell affix flags like /sT, /M are
// stripped, not expanded) -- expanding them via hi_IN.aff would add many
// more inflected surface forms but is left as a future enhancement.
//
// Usage: node scripts/extract-hindi-hunspell.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const srcPath = resolve("raw", "WORD-LISTS", "hindi-hunspell", "hi_IN.dic");
const outPath = resolve("raw", "WORD-LISTS", "PureHindi.txt");

const text = readFileSync(srcPath, "utf8");
const lines = text.split("\n").slice(1); // first line is just the entry count

// Devanagari block + combining marks + ZWJ/ZWNJ for conjuncts, plus hyphen
// and space for compound entries (हाल-चाल, डाक-तार); source underscores
// (रुँदने_वाला) mark compound-word spaces and are normalized to spaces.
const DEVANAGARI_ONLY = /^[ऀ-ॿ‌‍ -]+$/;

const words = new Set();
let rejected = 0;

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  const word = line.split("/")[0].replace(/_/g, " ").trim().normalize("NFC");
  if (!word || !DEVANAGARI_ONLY.test(word)) {
    rejected++;
    continue;
  }
  words.add(word);
}

const sorted = [...words].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
writeFileSync(outPath, sorted.join("\n") + "\n", "utf8");

console.log(`Source stems:   ${lines.length}`);
console.log(`Rejected:       ${rejected} (non-Devanagari after flag-stripping)`);
console.log(`Unique words:   ${sorted.length}`);
console.log(`Wrote:          ${outPath}`);
