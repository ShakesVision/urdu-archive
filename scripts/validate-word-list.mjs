#!/usr/bin/env node
/**
 * Validate a Qaafiyah word list TSV: word<TAB>wazn
 * Usage: node scripts/validate-word-list.mjs raw/WORD-LISTS/Hindi.txt
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/validate-word-list.mjs <file.txt>");
  process.exit(1);
}

const text = readFileSync(path, "utf8");
const lines = text.split(/\n/);
const errors = [];
const words = new Map();
let valid = 0;

const isRoman = /roman/i.test(basename(path));
const isHindi = /hindi/i.test(basename(path));

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  const raw = lines[i];
  if (!raw.trim()) continue;

  if (raw.includes("\r")) {
    errors.push(`L${lineNum}: CRLF line ending`);
  }

  const tabIdx = raw.indexOf("\t");
  if (tabIdx < 0) {
    errors.push(`L${lineNum}: missing TAB (legacy single-column format?) — ${raw.slice(0, 40)}`);
    continue;
  }

  const word = raw.slice(0, tabIdx).trim();
  const wazn = raw.slice(tabIdx + 1).trim();

  if (!word) errors.push(`L${lineNum}: empty word`);
  if (!wazn) errors.push(`L${lineNum}: empty wazn`);
  if (wazn && !/^[12]+$/.test(wazn)) {
    errors.push(`L${lineNum}: invalid wazn "${wazn}" (expected 1/2 only)`);
  }
  if (raw.indexOf("\t", tabIdx + 1) >= 0) {
    errors.push(`L${lineNum}: multiple TABs`);
  }

  if (isRoman && /[A-Z\u0600-\u06FF\u0900-\u097F]/.test(word)) {
    errors.push(`L${lineNum}: Roman file contains non-Latin script in word "${word}"`);
  }
  if (isHindi && /[A-Za-z\u0600-\u06FF]/.test(word)) {
    errors.push(`L${lineNum}: Hindi file contains non-Devanagari in word "${word}"`);
  }

  const key = isRoman ? word.toLowerCase() : word;
  if (words.has(key)) {
    errors.push(`L${lineNum}: duplicate word "${word}" (first at L${words.get(key)})`);
  } else {
    words.set(key, lineNum);
  }

  valid++;
}

console.log(`File: ${path}`);
console.log(`Lines with content: ${valid}`);
console.log(`Unique words: ${words.size}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.slice(0, 50).forEach((e) => console.error("  " + e));
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
  process.exit(1);
}

console.log("OK — format valid");
