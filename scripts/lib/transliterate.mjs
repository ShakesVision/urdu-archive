// Deterministic Urdu (with harakat/taqti) -> Devanagari + Roman transliteration.
//
// Why deterministic instead of AI-batched: UrduLughatWithTaqti.txt is fully
// vocalized (zabar/zer/pesh/sukun/shadda on nearly every letter), which is
// exactly the information an LLM would otherwise have to *guess* at from bare
// Urdu script. A rule-based pass over the diacritics is more accurate and
// 100% reproducible/auditable than batched AI generation, so we use it as
// the primary engine and keep a short curated exception list for the handful
// of extremely common function words whose vocalization is conventionally
// omitted even in "full" Urdu dictionaries (کیا، ہے، وہ ...).
//
// Known, documented lossy collisions in the ASCII Roman output (see
// docs/WORD-LIST-REGENERATION.md "Roman normalization"):
//   t   <- ت ٹ ط        d  <- د ڈ         r  <- ر ڑ
//   s   <- س ث ص         z  <- ذ ز ض ظ
//   kh  <- خ AND کھ (aspirated k)    gh <- غ AND گھ (aspirated g)
//   th  <- تھ AND ٹھ     dh <- دھ AND ڈھ

const ZABAR = "َ"; // fatha - short a
const PESH = "ُ"; // damma - short u
const ZER = "ِ"; // kasra - short i
const SUKUN = "ْ"; // no vowel
const SHADDA = "ّ"; // gemination
const TANWIN_FATH = "ً";
const TANWIN_DAMM = "ٌ";
const TANWIN_KASR = "ٍ";
const DAGGER_ALIF = "ٰ"; // superscript alif - long aa without a following alif
const HAMZA_ABOVE = "ٔ";
const HAMZA_BELOW = "ٕ";

const COMBINING_MARKS = new Set([
  TANWIN_FATH,
  TANWIN_DAMM,
  TANWIN_KASR,
  ZABAR,
  PESH,
  ZER,
  SHADDA,
  SUKUN,
  HAMZA_ABOVE,
  HAMZA_BELOW,
  "ٖ",
  "ٗ",
  "٘",
  DAGGER_ALIF,
]);

// Characters with no phonetic value we strip before processing.
const IGNORE_RE = /[ؐؒـ‌‪-‮ﷺﷲ~]/g;

const NORMALIZE_MAP = {
  ك: "ک", // Arabic kaf -> Urdu keheh
  ه: "ہ", // Arabic/Persian heh -> Urdu goal heh
};

// Plain consonants: [devanagari base, roman base]
const CONSONANTS = {
  ب: ["ब", "b"],
  پ: ["प", "p"],
  ت: ["त", "t"],
  ٹ: ["ट", "t"],
  ث: ["स", "s"],
  ج: ["ज", "j"],
  چ: ["च", "ch"],
  ح: ["ह", "h"],
  خ: ["ख़", "kh"],
  د: ["द", "d"],
  ڈ: ["ड", "d"],
  ذ: ["ज़", "z"],
  ر: ["र", "r"],
  ڑ: ["ड़", "r"],
  ز: ["ज़", "z"],
  ژ: ["ज़", "zh"],
  س: ["स", "s"],
  ش: ["श", "sh"],
  ص: ["स", "s"],
  ض: ["ज़", "z"],
  ط: ["त", "t"],
  ظ: ["ज़", "z"],
  غ: ["ग़", "gh"],
  ف: ["फ़", "f"],
  ق: ["क़", "q"],
  ک: ["क", "k"],
  گ: ["ग", "g"],
  ل: ["ल", "l"],
  م: ["म", "m"],
  ن: ["न", "n"],
  ہ: ["ह", "h"],
  ۃ: ["ह", "h"],
};

// Consonant + ھ (do-chashmi he) aspirate pairs: [devanagari, roman]
const ASPIRATES = {
  ک: ["ख", "kh"],
  گ: ["घ", "gh"],
  چ: ["छ", "chh"],
  ج: ["झ", "jh"],
  ت: ["थ", "th"],
  ٹ: ["ठ", "th"],
  د: ["ध", "dh"],
  ڈ: ["ढ", "dh"],
  پ: ["फ", "ph"],
  ب: ["भ", "bh"],
};
// Non-standard aspirate clusters (rare: rh, lh, mh, nh, vh, yh)
const GENERIC_ASPIRATE = { devTail: "्ह", romTail: "h" };

// ع (ayn) is phonetically silent/glottal in Urdu but orthographically takes
// short-vowel diacritics like a consonant, so we fold it in with the hamza
// family: emit whatever vowel it carries, emit nothing if bare.
const VOWEL_LETTERS = new Set(["ا", "آ", "و", "ی", "ے", "ئ", "ؤ", "أ", "ء", "ع"]);

// Independent (word-initial / post-hamza) vowel forms, keyed by short-vowel kind.
const INDEP_SHORT = { a: ["अ", "a"], i: ["इ", "i"], u: ["उ", "u"], none: ["अ", "a"] };
const INDEP_LONG = { aa: ["आ", "aa"], ii: ["ई", "ii"], uu: ["ऊ", "uu"], ai: ["ऐ", "ai"], au: ["औ", "au"] };

// Matras applied to a consonant, keyed by long-vowel kind.
const MATRA_LONG = { aa: ["ा", "aa"], ii: ["ी", "ii"], uu: ["ू", "uu"], ai: ["ै", "ai"], au: ["ौ", "au"], o: ["ो", "o"], e: ["े", "e"] };
const MATRA_SHORT = { a: ["", "a"], i: ["ि", "i"], u: ["ु", "u"] };

// A tiny curated exception list for ultra-common function words whose
// vocalization is conventionally omitted even in "fully vocalized" Urdu
// dictionaries, so the general algorithm cannot recover the right reading.
// Matched against the raw Urdu field (first variant, pre-normalization).
export const EXCEPTIONS = {
  ہے: ["है", "hai"],
  شے: ["शय", "shai"],
  یہ: ["यह", "yeh"],
  وہ: ["वह", "voh"],
  کیا: null, // resolved dynamically from wazn length (see resolveKyaException)
  کوئی: ["कोई", "koi"],
  نہیں: ["नहीं", "nahin"],
  کچھ: ["कुछ", "kuchh"],
};

function resolveKyaException(wazn) {
  // کیا is written identically for "kya" (what, 1 syllable) and "kiya" (did,
  // 2 syllables); wazn (syllable count) disambiguates.
  if (wazn && wazn.length <= 1) return ["क्या", "kya"];
  return ["किया", "kiya"];
}

// خوش (khush, "happy/good") is a common poetic prefix conventionally spelled
// with a bare و even though the vowel is short, not long (khush, not khoosh
// or khaush) -- an irregular spelling the general algorithm can't recover.
// Only خ+و are overridden; the ش is left for the normal engine so it can
// still pick up whatever vowel letter (ی etc.) follows it.
const PREFIX_OVERRIDES = [{ match: /^خوش/, dev: "खु", rom: "khu", consume: 2 }];

function stripAndNormalize(rawWord) {
  let word = rawWord.split("/")[0].trim();
  word = word.replace(IGNORE_RE, "");
  word = word.replace(/[كه]/g, (c) => NORMALIZE_MAP[c] || c);
  return word;
}

function clusterize(word) {
  const clusters = [];
  for (const ch of word) {
    if (COMBINING_MARKS.has(ch)) {
      if (clusters.length) clusters[clusters.length - 1].marks.add(ch);
      // else: stray leading combining mark, drop it
    } else {
      clusters.push({ base: ch, marks: new Set() });
    }
  }
  return clusters;
}

function shortKindOf(marks) {
  if (marks.has(ZABAR)) return "a";
  if (marks.has(ZER)) return "i";
  if (marks.has(PESH)) return "u";
  return "none";
}

/**
 * Convert one Urdu (harakat-annotated) word to { devanagari, roman, uncertain }.
 * `wazn` (syllable-weight string) is passed through only to disambiguate a
 * few exception words (see resolveKyaException); it is never recomputed.
 */
export function convertWord(rawWord, wazn) {
  if (EXCEPTIONS.hasOwnProperty(rawWord) && rawWord !== "کیا") {
    const [d, r] = EXCEPTIONS[rawWord];
    return { devanagari: d, roman: r, uncertain: false };
  }
  if (rawWord === "کیا") {
    const [d, r] = resolveKyaException(wazn);
    return { devanagari: d, roman: r, uncertain: false };
  }

  const word = stripAndNormalize(rawWord);
  if (!word) return { devanagari: "", roman: "", uncertain: true };

  for (const p of PREFIX_OVERRIDES) {
    if (p.match.test(word)) {
      const rest = convertClusters(word.slice(p.consume));
      return {
        devanagari: p.dev + rest.devanagari,
        roman: p.rom + rest.roman,
        uncertain: rest.uncertain,
      };
    }
  }

  return convertClusters(word);
}

function convertClusters(word) {
  const clusters = clusterize(word);
  let dev = "";
  let rom = "";
  let uncertain = false;

  // Open consonant awaiting a vowel decision.
  let pending = null; // { dev, rom, aspirated }

  const isVowelLetter = (c) => c && VOWEL_LETTERS.has(c.base);
  const isGlideTrigger = (c) => c && (c.base === "ا" || c.base === "آ" || c.base === "و" || c.base === "ی" || c.base === "ئ" || c.base === "ؤ" || c.base === "أ");

  function closePendingBare(isFinal) {
    // Consonant got no following vowel-letter; resolve from its own marks.
    if (!pending) return;
    const marks = pending.marks;
    const kind = shortKindOf(marks);
    if (marks.has(TANWIN_FATH) || marks.has(TANWIN_DAMM) || marks.has(TANWIN_KASR)) {
      // "-an/un/in" nunation ending, e.g. فوراً -> fauran
      dev += pending.dev + "न";
      rom += pending.rom + "an";
    } else if (marks.has(SUKUN) || (isFinal && (kind === "none" || kind === "a"))) {
      // Word-final schwa deletion (Hindi/Urdu drop the final short "a"
      // whether or not the source explicitly marked sukun) or an explicit
      // mid-word sukun (consonant cluster boundary -> virama).
      if (isFinal) {
        dev += pending.dev;
        rom += pending.rom;
      } else {
        dev += pending.dev + "्";
        rom += pending.rom;
      }
    } else {
      const [m, r] = MATRA_SHORT[kind === "none" ? "a" : kind];
      dev += pending.dev + m;
      rom += pending.rom + r;
    }
    pending = null;
  }

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    let next = clusters[i + 1] || null;
    let marks = c.marks;
    const isLast = i === clusters.length - 1;

    if (c.base === "ھ") {
      // Consumed proactively by the preceding consonant's aspirate check
      // below; a standalone ھ here means it had no consonant to attach to.
      uncertain = true;
      continue;
    }

    if (c.base === "ں") {
      // Nasalization: attaches to whatever vowel was just closed.
      if (pending) closePendingBare(isLast);
      dev += "ं";
      rom += "n";
      continue;
    }

    if (c.base === "ّ") {
      // Shouldn't reach here (shadda is a combining mark), ignore stray.
      continue;
    }

    if (CONSONANTS[c.base]) {
      // Flush any previously pending bare consonant first.
      if (pending) closePendingBare(false);

      // Best-effort signal for the -āna vs -anda ambiguity below: was
      // whatever precedes this consonant already a resolved long vowel
      // (alif, or a ی/و that merged into ii/uu), rather than a consonant
      // cluster (e.g. sukun'd ن in "-nd-")?
      const precededByBareAlif =
        i > 0 && (clusters[i - 1].base === "ا" || clusters[i - 1].base === "ی" || clusters[i - 1].base === "و");
      let [dBase, rBase] = CONSONANTS[c.base];
      let effectiveMarks = marks;
      if (next && next.base === "ھ") {
        const pair = ASPIRATES[c.base];
        if (pair) {
          [dBase, rBase] = pair;
        } else {
          dBase = dBase + GENERIC_ASPIRATE.devTail;
          rBase = rBase + GENERIC_ASPIRATE.romTail;
        }
        // ھ itself normally carries no vowel mark, but fold in any stray
        // mark just in case a source variant places it there.
        if (next.marks.size) effectiveMarks = new Set([...marks, ...next.marks]);
        i++; // consume the ھ cluster
        next = clusters[i + 1] || null; // recompute lookahead past the ھ
      }
      marks = effectiveMarks;

      pending = { dev: dBase, rom: rBase, urduBase: c.base, marks, aspirated: false };

      if (marks.has(SHADDA)) {
        // Gemination: emit consonant + virama, then continue with a fresh
        // copy of the same consonant carrying the real vowel.
        dev += dBase + "्";
        rom += rBase;
        // pending continues to represent the *second* copy of the consonant.
      }

      if (marks.has(DAGGER_ALIF)) {
        // Superscript alif == long aa without a following alif letter.
        dev += dBase + "ा";
        rom += rBase + "aa";
        pending = null;
        continue;
      }

      if (next && next.base === "ہ" && next.marks.size === 0 && !clusters[i + 2]) {
        // Word-final bare goal-heh is a silent Persian ending marker, but it
        // is genuinely ambiguous between two suffix families that are
        // spelled identically in this corpus:
        //   -anda (زندہ zinda, بندہ banda): consonant right before this one
        //     is part of an "-nd-" cluster (sukun'd نْ) -> short "-a".
        //   -āna (زمانہ zamaana, بہانہ bahaana, آئینہ aaina): this consonant
        //     is directly preceded by a bare alif -> long "-aa".
        if (precededByBareAlif) {
          dev += dBase + "ा";
          rom += rBase + "aa";
        } else {
          dev += dBase;
          rom += rBase + "a";
        }
        pending = null;
        i++; // consume the ہ
        continue;
      }

      // Look ahead: does a vowel letter follow?
      if (isVowelLetter(next)) {
        const followFollow = clusters[i + 2] || null;
        // Only a following alif/madda forces glide-consonant treatment
        // (کیا/دیا -iya, ہوا -uwa); ی or و followed by ANOTHER vowel letter
        // that isn't alif (e.g. دیوانہ's ی followed by و) should still
        // lengthen normally and let that next letter start its own syllable.
        const nextIsGlide = followFollow && (followFollow.base === "ا" || followFollow.base === "آ") && (next.base === "و" || next.base === "ی" || next.base === "ئ" || next.base === "ؤ");

        if (next.base === "ا" || next.base === "آ") {
          // alif (with or without madda) directly after a consonant = long aa,
          // regardless of the short-vowel mark on the consonant (the mark is
          // conventionally omitted before a following alif).
          dev += dBase + "ा";
          rom += rBase + "aa";
          pending = null;
          i++; // consume the alif
          continue;
        }

        if ((next.base === "ی" || next.base === "ئ") && nextIsGlide) {
          // ی/ئ followed by yet another vowel letter acts as a glide
          // consonant (य), not a lengthener; the preceding short vowel
          // stays short. The vowel letter after the glide (almost always
          // alif, e.g. کیا/دیا/لیا -iya endings) attaches to the glide
          // itself, not as a fresh independent vowel.
          closePendingBare(false);
          pending = null;
          const glideAfter = clusters[i + 2] || null;
          if (glideAfter && (glideAfter.base === "ا" || glideAfter.base === "آ")) {
            dev += "य" + "ा";
            rom += "y" + "aa";
            i += 2; // consume ی/ئ and the alif
          } else {
            dev += "य";
            rom += "y";
            i++; // consume ی/ئ itself; its own vowel (if any) resolves next loop
          }
          continue;
        }

        if ((next.base === "و" || next.base === "ؤ") && nextIsGlide) {
          closePendingBare(false);
          pending = null;
          const glideAfter = clusters[i + 2] || null;
          if (glideAfter && (glideAfter.base === "ا" || glideAfter.base === "آ")) {
            dev += "व" + "ा";
            rom += "v" + "aa";
            i += 2;
          } else {
            dev += "व";
            rom += "v";
            i++;
          }
          continue;
        }

        if (next.base === "ی") {
          const kind = shortKindOf(marks);
          if (kind === "a") {
            dev += dBase + MATRA_LONG.ai[0];
            rom += rBase + MATRA_LONG.ai[1];
          } else {
            // zer+ی (or unmarked+ی) = long ii
            dev += dBase + MATRA_LONG.ii[0];
            rom += rBase + MATRA_LONG.ii[1];
          }
          pending = null;
          i++;
          continue;
        }

        if (next.base === "ے") {
          const kind = shortKindOf(marks);
          if (kind === "a") {
            dev += dBase + MATRA_LONG.ai[0];
            rom += rBase + MATRA_LONG.ai[1];
          } else {
            dev += dBase + MATRA_LONG.e[0];
            rom += rBase + MATRA_LONG.e[1];
          }
          pending = null;
          i++;
          continue;
        }

        if (next.base === "و") {
          const kind = shortKindOf(marks);
          if (kind === "u") {
            dev += dBase + MATRA_LONG.uu[0];
            rom += rBase + MATRA_LONG.uu[1];
          } else if (kind === "a") {
            // zabar+و = au diphthong (مَوت -> maut)
            dev += dBase + MATRA_LONG.au[0];
            rom += rBase + MATRA_LONG.au[1];
          } else {
            // unmarked+و: far more often the "-o" grammatical ending
            // (لڑکو، دوستو، یارو) than an "au" diphthong, so default to o.
            dev += dBase + MATRA_LONG.o[0];
            rom += rBase + MATRA_LONG.o[1];
          }
          pending = null;
          i++;
          continue;
        }

        if (next.base === "ئ") {
          // Bare hamza-ye seat with no glide-trigger after it: treat as ii.
          dev += dBase + MATRA_LONG.ii[0];
          rom += rBase + MATRA_LONG.ii[1];
          pending = null;
          i++;
          continue;
        }

        if (next.base === "ؤ") {
          dev += dBase + MATRA_LONG.uu[0];
          rom += rBase + MATRA_LONG.uu[1];
          pending = null;
          i++;
          continue;
        }

        if (next.base === "ء" || next.base === "أ" || next.base === "ع") {
          // Glottal separator: close this consonant's own vowel, then let
          // the hamza/ayn be handled as an independent vowel on the next pass.
          closePendingBare(false);
          pending = null;
          continue;
        }
      }
      continue;
    }

    if (VOWEL_LETTERS.has(c.base)) {
      // Any pending consonant with no vowel-letter follow-up (e.g. this
      // vowel letter is itself standalone/word-initial) must be closed.
      if (pending) closePendingBare(false);
      pending = null;

      if (c.base === "آ") {
        dev += INDEP_LONG.aa[0];
        rom += INDEP_LONG.aa[1];
        continue;
      }
      if (c.base === "ا") {
        const kind = shortKindOf(marks);
        const nextIsVowel = isVowelLetter(next);
        if (nextIsVowel && next.base === "ی") {
          dev += INDEP_LONG.ai[0];
          rom += INDEP_LONG.ai[1];
          i++;
          continue;
        }
        if (nextIsVowel && next.base === "و") {
          dev += INDEP_LONG.au[0];
          rom += INDEP_LONG.au[1];
          i++;
          continue;
        }
        if (kind === "i" && next && next.base === "ی") {
          dev += INDEP_LONG.ii[0];
          rom += INDEP_LONG.ii[1];
          i++;
          continue;
        }
        if (kind === "u" && next && next.base === "و") {
          dev += INDEP_LONG.uu[0];
          rom += INDEP_LONG.uu[1];
          i++;
          continue;
        }
        const [d, r] = INDEP_SHORT[kind];
        dev += d;
        rom += r;
        continue;
      }
      if (c.base === "ء" || c.base === "أ" || c.base === "ئ" || c.base === "ؤ" || c.base === "ع") {
        const kind = shortKindOf(marks);
        const nextIsVowel = isVowelLetter(next);
        if (kind === "none" && next && next.base === "ا" && next.marks.size === 0) {
          // Silent glottal onset (ع/ء/أ) directly followed by a bare alif
          // behaves exactly like آ (madda): overwhelmingly the case for
          // ع-initial words in this corpus (عائد, عابد, ...).
          dev += INDEP_LONG.aa[0];
          rom += INDEP_LONG.aa[1];
          i++; // consume the alif
          continue;
        }
        if (kind === "i" && next && next.base === "ی" && !isGlideTrigger(clusters[i + 2])) {
          // hamza-seat carrying zer, directly followed by a bare ی with
          // nothing further after it, lengthens to ii (آئِینَہ -> aaina),
          // same as a consonant's zer+ی.
          dev += INDEP_LONG.ii[0];
          rom += INDEP_LONG.ii[1];
          i++;
          continue;
        }
        if (kind === "u" && next && next.base === "و" && !isGlideTrigger(clusters[i + 2])) {
          dev += INDEP_LONG.uu[0];
          rom += INDEP_LONG.uu[1];
          i++;
          continue;
        }
        if (kind !== "none") {
          // Preceded by nothing or another vowel letter (never a real
          // consonant -- that case is handled inside the CONSONANTS branch's
          // own glide look-ahead), so this is a hiatus-break: just the bare
          // vowel, no inserted य/व glide consonant (آئِنْدَہ -> aainda, not
          // aayinda).
          const [d, r] = INDEP_SHORT[kind];
          dev += d;
          rom += r;
        } else if (!nextIsVowel) {
          // Bare hamza with nothing to attach to: treat as silent.
        }
        continue;
      }
      if (c.base === "ی") {
        // Word-initial or otherwise unattached choti ye -> consonant y,
        // merging with a following alif (یار -> yaar) exactly like a real
        // consonant would.
        if (next && (next.base === "ا" || next.base === "آ")) {
          dev += "य" + "ा";
          rom += "y" + "aa";
          i++;
          continue;
        }
        const kind = shortKindOf(marks);
        dev += "य" + MATRA_SHORT[kind === "none" ? "i" : kind][0];
        rom += "y" + MATRA_SHORT[kind === "none" ? "i" : kind][1];
        continue;
      }
      if (c.base === "ے") {
        dev += MATRA_LONG.e[0].replace("े", "ए");
        rom += "e";
        continue;
      }
      if (c.base === "و") {
        // Unattached wao -> consonant v, merging with a following alif
        // (دیوانہ's و+ا -> vaa) like a real consonant would.
        if (next && (next.base === "ا" || next.base === "آ")) {
          dev += "व" + "ा";
          rom += "v" + "aa";
          i++;
          continue;
        }
        const kind = shortKindOf(marks);
        dev += "व" + MATRA_SHORT[kind === "none" ? "a" : kind][0];
        rom += "v" + MATRA_SHORT[kind === "none" ? "a" : kind][1];
        continue;
      }
      continue;
    }

    // Unknown base character.
    uncertain = true;
  }

  if (pending) closePendingBare(true);

  if (!dev || !rom) uncertain = true;
  return { devanagari: dev, roman: rom, uncertain };
}
