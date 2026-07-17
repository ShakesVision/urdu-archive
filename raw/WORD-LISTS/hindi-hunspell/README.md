# Hindi Hunspell source (for PureHindi.txt)

Source of `raw/WORD-LISTS/PureHindi.txt`: the **GNU Aspell Hindi Word List**
(जनभारती / janabhaaratii project, 2005), converted to Hunspell/UTF-8 format
by László Németh for LibreOffice/OpenOffice. This is the same `hi_IN`
spell-check dictionary shipped inside LibreOffice and Firefox.

- Upstream: <https://github.com/LibreOffice/dictionaries/tree/master/hi_IN>
- Original word list: <http://www.janabhaaratii.org.in>
- License: **GPL** (see `Copyright` in this folder for the exact terms).
  `COPYING` here is the full GPLv2 text as shipped upstream.

## Why this list, and why alongside `Hindi.txt`

`Hindi.txt` (in the parent folder) is a Devanagari **transliteration of the
Urdu master dictionary** (`UrduLughatWithTaqti.txt`) — it only contains words
that exist in the Urdu/Perso-Arabic lexicon, so it's missing native
tatsam/tadbhav Sanskrit-origin Hindi vocabulary with no Urdu equivalent.
`PureHindi.txt` is an independent, credible Hindi dictionary word list (real
lexicographic headwords, not a corpus/frequency dump) meant to fill that gap.
It carries **no wazn/meter column** — it's registered in
`qaafiyah-public/word-lists-manifest.json` as a `curatedLists` entry
(`hasWazn: false`), not as a replacement for the built-in `hi` dictionary.

## How it was produced

`scripts/extract-hindi-hunspell.mjs` reads `hi_IN.dic` (207,694 stems),
strips Hunspell affix flags (e.g. `/sT`, `/M` — inflection-rule markers, not
expanded here), drops ~130 OCR-artifact entries (stray `.`/`?`/`...`), keeps
Devanagari-only content (hyphenated/compound entries and `_`-joined phrases
normalized to spaces), dedupes, and sorts by Unicode codepoint. Result: 207,559 unique words in `PureHindi.txt`.

Affix-rule expansion (`hi_IN.aff`) would add many more inflected surface
forms; left as a future enhancement, not done here.
