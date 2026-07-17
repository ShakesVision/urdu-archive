# Resources Archive for Urdu and Related Languages

This repository contains a collection of dictionaries for Urdu and other languages.

---

## Source Contributions

**Awaz-e-dost** shared a collection of files, including dictionaries and other resources, available [here](https://www.dropbox.com/s/62kofb6kidzkqej/GoldenDict.zip?dl=1) through his [blog](https://awaz-e-dost.blogspot.com/2015/03/blog-post_28.html). The archive contains multiple reference files, as well as a portable version of GoldenDict (v1.0.1) for desktop.

For Android, I found a free version that works without ads and includes classic resources. If you need access, you can contact me via Telegram: `@shakesvision`. A possible source is [this page](http://goldendict.mobi/downloads/android/paid/GoldenDict-1.6.8-Android-4.4+-paid.apk), as referenced [here](https://www.urduweb.org/mehfil/threads/%D8%A7%DB%8C%D9%86%DA%88%D8%B1%D8%A7%D8%A6%DB%8C%DA%88-%DA%A9%DB%92-%D9%84%DB%8C%DB%92-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C%D8%B2%DB%8C-%D8%A7%D8%B1%D8%AF%D9%88-%D8%A7%D9%88%D8%B1-%D8%A7%D8%B1%D8%AF%D9%88-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C-%D9%84%D8%BA%D8%AA.84718/post-2179419).

This collection serves as a reference for both desktop and mobile use and includes many of the classic resources that have been shared and maintained over the years.

* **Muhammad Umar / Farooq** provided the UDB dictionary after scraping. It is included in this repo but his original repository can be found [here](https://github.com/inshapardaz/data).


## Important Urdu Mehfil Discussions

The following threads contain discussions related to these dictionaries:

1. [Golden Dictionaries for Urdu](https://www.urduweb.org/mehfil/threads/%DA%AF%D9%88%D9%84%DA%88%D9%86-%DA%88%DA%A9%D8%B4%D9%86%D8%B1%DB%8C-%D8%A8%D9%85%D8%B9-%D8%AF%D9%88-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C%D8%B2%DB%8C-%D8%A7%D8%B1%D8%AF%D9%88-%D9%84%D8%BA%D8%A7%D8%AA.81010/)
2. [Urdu Lughat Kabeer in Golden Dictionaries](https://www.urduweb.org/mehfil/threads/%D8%A7%D8%B1%D8%AF%D9%88-%D9%84%D8%BA%D8%AA-%DA%A9%D8%A8%DB%8C%D8%B1-%DA%A9%DB%8C-%DA%AF%D9%88%D9%84%DA%88%D9%86-%DA%88%DA%A9%D8%B4%D9%86%D8%B1%DB%8C-%DA%A9%DB%92-%D9%84%DB%8C%DB%92-%D8%AA%DB%8C%D8%A7%D8%B1%DB%8C.100202/)
3. [Urdu-English dictionaries on UrduWeb](https://www.urduweb.org/mehfil/threads/%D8%A7%DB%8C%D9%86%DA%88%D8%B1%D8%A7%D8%A6%DB%8C%DA%88-%DA%A9%DB%92-%D9%84%DB%8C%DB%92-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C%D8%B2%DB%8C-%D8%A7%D8%B1%D8%AF%D9%88-%D8%A7%D9%88%D8%B1-%D8%A7%D8%B1%D8%AF%D9%88-%D8%A7%D9%86%DA%AF%D8%B1%DB%8C-%D9%84%D8%BA%D8%AA.84718)

---

## Dictionary Formats

| Format                    | Used by             |
| ------------------------- | ------------------- |
| StarDict (`ifo idx dict`) | GoldenDict, Linux   |
| DSL                       | ABBYY Lingvo        |
| MDict (`mdx mdd`)         | Mobile dictionaries |


## How to use and prepare them

Besides storing the dictionary files here, we’ve collected all the necessary tools and instructions in one place.

Under the **`TOOLS`** folder, we’ve included **dictzip** (with an `.exe` you can put in any folder and add to your `PATH`) and its source code. On Linux, dictzip is straightforward to use; on Windows, we used this [port](https://github.com/KaseyJenkins/dictzip-win64/releases/tag/v1.0.0).

We also came across [stardict.js](https://github.com/tuxor1337/stardict.js) before building our own web implementation.

### Convert DSL → StarDict

To convert a DSL file for GoldenDict, use **PyGlossary** (`pip install pyglossary`):

```bash
pyglossary UrduLughat.dsl UrduLughat.ifo
```

Output:

```text
UrduLughat.dict
UrduLughat.idx
UrduLughat.ifo
```

The `.dict` is usable but large. Compress it for efficiency:

```bash
dictzip -k UrduLughat.dict
```

The `-k` flag keeps the original file. After compressing, you can safely delete the `.dsl` and `.dict` files — the `.dict.dz` versions are enough.

## Additional Lists

* `raw/WORD-LISTS/PureHindi.txt` — 207,559 native Hindi headwords extracted from the
  LibreOffice `hi_IN` Hunspell dictionary (GPL, janabhaaratii project). Unlike
  `Hindi.txt` (a Devanagari transliteration of the Urdu master list), this one
  covers tatsam/tadbhav Sanskrit-origin words with no Urdu equivalent. See
  `raw/WORD-LISTS/hindi-hunspell/README.md` for provenance and license details.

Several useful lists are included as part of **uTools**:

* [uTools replacer lists](https://github.com/ShakesVision/uTools-public/tree/master/replacer-lists)

  * `all-urdu-numbers.txt`
  * `english-urdu-keyboard-map.txt`
  * `urdu-typos.txt`

* A **complete Urdu word list without tarakeeb** was compiled by Chacha Jaan, *Ustaad-e-mohtaram* Aijaz Ubaid (Alif Ain):

  * [Blog post](http://muftkutub.blogspot.com/2023/06/blog-post.html)
  * [Direct download](https://drive.google.com/file/d/0B1vEpFWrEBSHVW1taFE1ZjVPclE)
  * Reference thread: [UrduWeb Mehfil](https://www.urduweb.org/mehfil/threads/%D8%A7%D8%B1%D8%AF%D9%88-%D9%BE%D8%B1%D9%88%D9%81-%D8%B1%DB%8C%DA%88%D8%B1-%D8%B3%D9%88%D9%81%D9%B9-%D9%88%DB%8C%D8%A6%D8%B1-%D8%A7%D9%88%D8%B1-%D9%88%D8%B1%DA%88-%D9%BE%D9%84%DA%AF-%D8%A7%D9%86%DA%8C-%D8%A7%D8%B1%D8%AF%D9%88-%DA%A9%D9%85%D9%BE%D9%88%D8%B2%D9%86%DA%AF-%D8%A7%D9%88%D8%B1-%D9%BE%D8%B1%D9%88%D9%81-%D8%B1%DB%8C%DA%88%D9%86%DA%AF-%DA%A9%DB%8C-%D8%A7%DB%8C%DA%A9-%D8%B9%D9%85%D8%AF%DB%81-%DA%A9%D8%A7%D9%88%D8%B4.96237/post-2235467)

* A detailed guide of Aijaz Ubaid explaining his proofreading process: [here](https://www.urduweb.org/mehfil/threads/%D9%85%DB%8C%DA%BA-%DA%A9%D8%B3-%D8%B7%D8%B1%D8%AD-%D9%BE%D8%B1%D9%88%D9%81-%D8%B1%DB%8C%DA%88%D9%86%DA%AF-%DA%A9%D8%B1%D8%AA%D8%A7-%DB%81%D9%88%DA%BA%D8%9F2-0.89438)

* **Software for proofreading & word plugin** continuing this work:

  * Created by M. Azeemuddin
  * [Current release](https://github.com/azeemdin/urduproofreader/raw/master/current%20release/UrduProofReader.exe)

* `pairlst.txt` in this repo is a list of common misreadings fixed by Google OCR:

  * [Google Doc reference](https://docs.google.com/document/d/1EYEWNQ0LMmicDBGwrUnrpxyBbsVYDzbXjbrtPmpITSw/edit?tab=t.0)
  * [Discussion thread](https://www.urduweb.org/mehfil/threads/%D8%A7%D8%B1%D8%AF%D9%88-%D9%BE%D8%B1%D9%88%D9%81-%D8%B1%DB%8C%DA%88%D8%B1-%D8%B3%D9%88%D9%81%D9%B9-%D9%88%DB%8C%D8%A6%D8%B1-%D8%A7%D9%88%D8%B1-%D9%88%D8%B1%DA%88-%D9%BE%D9%84%DA%AF-%D8%A7%D9%86%DA%8C-%D8%A7%D8%B1%D8%AF%D9%88-%DA%A9%D9%85%D9%BE%D9%88%D8%B2%D9%86%DA%AF-%D8%A7%D9%88%D8%B1-%D9%BE%D8%B1%D9%88%D9%81-%D8%B1%DB%8C%DA%88%D9%86%DA%AF-%DA%A9%DB%8C-%D8%A7%DB%8C%DA%A9-%D8%B9%D9%85%D8%AF%DB%81-%DA%A9%D8%A7%D9%88%D8%B4.96237/post-1906519)

---

## Corpus

* **Urdu Mehfil corpus**

  * Originally shared by Brother Sauud (Ibne Sayeed), though there were privacy concerns.
  * Available via [Lancaster University Website](https://cqpweb.lancs.ac.uk/) as referenced [here](https://www.urduweb.org/mehfil/threads/%DA%A9%D8%AB%DB%8C%D8%B1-%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D8%B9%D9%85%D8%A7%D9%84-%D8%A7%D9%84%D9%81%D8%A7%D8%B8-%DA%A9%DB%8C-%D9%81%DB%81%D8%B1%D8%B3%D8%AA-%D8%A8%D9%85%D8%B9%DB%81-%D9%85%D8%B9%DB%8C%D8%A7%D8%B1%DB%8C-%D8%AA%D9%84%D9%81%D8%B8.120269/post-2526981)

* The repo also includes other important corpus and reference materials.

## Github profiles of Mehfilians
In case you want to keep checking what these wonderful people are doing, here are some of the github profiles:
1. https://github.com/shakesvision (me)
2. https://github.com/urduweb
3. https://github.com/ibnesayeed
4. https://github.com/azeemdin
5. https://github.com/inshapardaz
6. https://github.com/Rana1889
7. https://github.com/sayedzeeshan
8. https://github.com/saadatm
