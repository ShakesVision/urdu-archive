# Word List Regeneration (Hindi + Roman)

## Why regenerate?

`Hindi.txt` and `Roman.txt` in `raw/WORD-LISTS/` are legacy (~2018–2019) exports:

- **No wazn column** — Tab1 cannot filter by meter for hi/en scripts.
- **Inconsistent transliteration** — Roman uses ad‑hoc spellings (`aaaarat`, `aab khora`, …).
- **Weak Devanagari coverage** — Hindi list is not aligned with the Urdu master list.
- **No provenance** — hard to audit or improve incrementally.

The Urdu master `UrduLughatWithTaqti.txt` (~92k lines) is the quality anchor:

```text
آ	2
آؤ	22
آئِبِس	212
```

Format: `WORD<TAB>WAZN` where wazn is a string of `1` (short) and `2` (long) syllable slots for عروض search.

---

## Target format (both new files)

```text
word<TAB>wazn
```

| File | Script | Example |
|------|--------|---------|
| `Hindi.txt` | Devanagari | `आग\t212` |
| `Roman.txt` | Latin (roman Urdu) | `aag\t212` |

Rules:

1. One entry per line, UTF‑8, Unix newlines (`\n`).
2. Tab-separated exactly two fields: `word`, `wazn`.
3. `wazn` only contains `1` and `2` (same encoding as Urdu master).
4. Words sorted **alphabetically by Unicode codepoint** within each file (match Urdu sort behaviour).
5. No duplicate words (case-folding rules below).
6. Strip leading/trailing whitespace; no empty lines.

### Roman normalization

- Lowercase a–z only in the word field (preserve spaces if multi-word entries exist).
- Use a **single** romanization scheme (recommend: [ALA-LC roman Urdu](https://www.loc.gov/catdir/cpso/romanization/urdu.pdf) with these poetry-app tweaks):
  - `ain` → apostrophe or digraph consistently (`'` or `ʿ` — pick one and document).
  - Retroflex: `ṭ`, `ḍ`, `ṛ` **or** ASCII fallbacks `t`, `d`, `r` with a documented table — **be consistent**.
  - Schwa / ezāfe: omit or mark uniformly; do not mix `aa`/`a` randomly.

### Hindi normalization

- Devanagari letters + combining marks only (NFC normalized).
- Do **not** strip nukta variants if they distinguish dictionary entries.
- Transliterate from **Urdu surface form**, not from the old Hindi list.

---

## Pipeline (recommended order)

### Phase 0 — Freeze legacy

```bash
cd raw/WORD-LISTS
cp Hindi.txt legacy/Hindi.2019.txt
cp Roman.txt legacy/Roman.2019.txt
```

Keep legacy files in git for diffing and rollback. Ship new files as `Hindi.txt` / `Roman.txt` only after validation passes.

### Phase 1 — Hindi from Urdu master (do this first)

**Input:** `UrduLughatWithTaqti.txt`  
**Output:** `Hindi.txt` (devanagari + same wazn)

For each line `urdu_word\twazn`:

1. Copy `wazn` unchanged (it describes meter pattern for the poetic word).
2. Produce `hindi_word` by Urdu→Devanagari transliteration preserving pronunciation used in Urdu poetry.
3. Skip if transliteration is ambiguous — flag for human/second pass rather than guessing.
4. If multiple Urdu words collapse to one Hindi form, keep the **most common poetic spelling** and log collisions.

**Why Hindi first?** Devanagari is script-stable; Roman can be derived from Hindi+Urdu with fewer ambiguities than from the old Roman file.

### Phase 2 — Roman from Urdu + Hindi

**Inputs:** Urdu master + validated `Hindi.txt`  
**Output:** `Roman.txt`

For each Urdu line:

1. Copy `wazn` unchanged.
2. Romanize using the documented scheme (prefer generating from Urdu, use Hindi as cross-check for vowel length).
3. End rhyme search uses **suffix match** on the roman word — ensure final syllables are stable (e.g. `āshiq` vs `ashiq` — pick one rule for long vowels in rhyme position).

### Phase 3 — Validate & hash

```bash
node scripts/validate-word-list.mjs raw/WORD-LISTS/Hindi.txt
node scripts/validate-word-list.mjs raw/WORD-LISTS/Roman.txt
node scripts/hash-word-lists.mjs
```

Update `raw/WORD-LISTS/manifest.json` and qaafiyah-public `word-lists-manifest.json`.

---

## AI-assisted workflow (Claude / GPT)

**Do not** ask the model to output 90k lines in one chat. Use **batched generation + merge**:

| Batch size | 500–2000 lines per request |
| Review | Human spot-check 5% per batch |
| Tooling | `validate-word-list.mjs` after every merge |

### Master prompt (paste into Claude Projects with Urdu file attached)

```markdown
You are building a qaafiyah (Urdu/Hindi poetry rhyme) word list for the Qaafiyah Expert app.

## Source of truth
I will give you lines from UrduLughatWithTaqti.txt:
  URDU_WORD<TAB>WAZN
WAZN is a string of 1 (short) and 2 (long) syllables for aruuz — copy it EXACTLY to the output.

## Task (Phase: HINDI)
For each input line, output ONE line:
  HINDI_DEVANAGARI<TAB>WAZN

Transliteration rules:
- Urdu → Devanagari for standard literary Hindi/Urdu poetic pronunciation.
- Preserve gemination, nukta, and ezafe where audible in mushaira Urdu.
- Do not translate meaning; transliterate the word form only.
- If unsure, output: # UNCERTAIN: URDU_WORD — do not invent.

## Quality checks (you must self-check before answering)
- Every line has exactly one TAB.
- WAZN field matches input character-for-character.
- No Latin letters in word field.
- No duplicate Hindi words in the batch.
- NFC Unicode normalization.

## Output
Plain text only. No markdown fences. No commentary except # UNCERTAIN lines.

## Batch
[Paste 500 lines here]
```

### Roman prompt (second pass)

Same structure; replace task with:

```markdown
## Task (Phase: ROMAN)
Output: ROMAN_WORD<TAB>WAZN

Romanization scheme: [paste your chosen table]
- Lowercase a-z and spaces only.
- Long vowels: aa, ii, uu OR diacritics — use scheme consistently.
- Copy WAZN exactly from input.
Cross-check: Hindi line is HINDI<TAB>WAZN for reference.
```

### Review prompts (after each batch)

```markdown
Here are 50 random lines from the merged Hindi.txt candidate.
Compare each to the Urdu source line I provide.
List: wrong transliteration, missing nukta, wazn mismatch, duplicate, non-poetic spelling.
Suggest corrected lines only.
```

---

## Acceptance criteria

| Check | Threshold |
|-------|-----------|
| Line count vs Urdu | ≥ 95% coverage (some Urdu-only forms may skip) |
| `validate-word-list.mjs` | 0 errors |
| Wazn charset | 100% valid `1`/`2` only |
| Duplicate words | 0 |
| Manual rhyme test | 20 random qaafiyah searches match mushaira expectations |
| App regression | Tab1 hi/en search + wazn chips work like Urdu |

---

## Who should run this?

| Approach | When |
|----------|------|
| **AI batches + your review** | Recommended — best quality/cost balance |
| **Fully manual** | Not feasible at 90k scale |
| **Fully automated without review** | Not recommended — propagates transliteration errors |

The app team should **not** ship AI output without running the validator and spot-checking batches. Expect 2–4 weeks of batched generation + review for production quality.

---

## App follow-up (qaafiyahSrc)

When `Hindi.txt` / `Roman.txt` ship with wazn:

1. Bump manifest hashes in `urdu-archive` and `qaafiyah-public`.
2. Users re-download via `WordListSyncService` (or clear dict cache).
3. Enable wazn filter chips in Tab1 for `hi` and `en` (today only Urdu shows وزن chips; letter-count chips are used for Roman/Hindi).


```text
raw/WORD-LISTS/
  UrduLughatWithTaqti.txt   # unchanged master
  Hindi.txt                 # NEW: devanagari + wazn
  Roman.txt                 # NEW: roman + wazn
  Farsi.txt                 # future: same treatment
  legacy/
    Hindi.2019.txt
    Roman.2019.txt
  manifest.json
```
