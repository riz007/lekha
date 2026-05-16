# Lekha.js — Bengali Typing Engine for the Modern Web

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://riz007.github.io/lekha/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

Lekha.js is a headless Bengali typing engine built on **TipTap v3 / ProseMirror**, designed and implemented by **[riz007](https://github.com/riz007)**. It solves a problem no existing open-source tool addresses: reliable, typographically correct Bengali input inside a real rich-text editor — across every major browser, including Android Chrome and Windows Chrome with virtual keyboards.

---

## What Makes It Different

### Rich-Text, Not a Textarea

Every legacy Bengali typing tool (Avro, Bijoy, bnwebtools) was built for `<textarea>` or `<input>` elements. Lekha.js is the first to bring a full Bengali typing engine into **ProseMirror**, making bold, italic, color, and other rich-text formatting work naturally alongside Bengali input.

### Cross-Browser Input Architecture

The hardest part of Bengali typing on the web is that browsers handle keyboard input inconsistently:

- **Desktop Chrome** fires `beforeinput` even after `keydown.preventDefault()` (Input Events Level 2 spec), which causes double-character insertion in naive implementations.
- **Android Chrome / virtual keyboards** fire `keydown` with `key: 'Unidentified'`, so `keydown` alone cannot capture the character — `beforeinput` must be the primary handler.
- **Some Android keyboards** (Samsung, certain Gboard modes) use non-standard `inputType` values like `insertFromMobile` that bypass `beforeinput` entirely and reach ProseMirror's `handleTextInput` instead.
- **Windows Chrome** with touch input routes through the same virtual keyboard path as Android.

Lekha.js handles all four paths with a layered event pipeline (`handleKeyDown` → `beforeinput` → `handleTextInput` fallback) and a `processedByPlugin` flag that prevents double-processing while ensuring the fallback path is always available.

### Typographic Rule Engine

The engine applies six phonetic/orthographic rules automatically, in real-time, as the user types:

| Rule | Description |
|:--|:--|
| **Pre-Kar Swap** | i-kar (ি), e-kar (ে), and oi-kar (ৈ) visually precede their consonant but are typed after it in Bijoy. The engine buffers the kar and swaps it with the next consonant automatically. |
| **Hasant → Vowel** | Typing a vowel-form (kar) after hasant (্) converts the combination to the independent vowel (e.g. ্ + া = আ). |
| **Standalone অ + া = আ** | Prevents the typographically invalid two-codepoint sequence; replaces it with the correct single vowel. |
| **e-kar + aa-kar = o-kar** | ে + া is automatically composed into ো, matching how the characters appear in print. |
| **Reph Back-Swap** | র্ (reph) belongs before the consonant cluster it modifies. The engine inserts it and then moves it backward over the preceding cluster automatically. |
| **র‍্য ZWJ Injection** | র + ্য inserts a Zero Width Joiner (র‍্য) to produce the smooth curve seen in professional typography rather than the broken form. |

### Smart Grapheme Cluster Deletion

Backspace in legacy tools removes one Unicode code point at a time, leaving orphaned hasants and broken conjuncts. Lekha.js uses **`Intl.Segmenter`** (with a regex fallback) to treat an entire conjunct cluster as a single atomic unit — one backspace removes the whole thing cleanly.

### Avro Phonetic — Full Cursor-Aware Re-Parse

Avro Phonetic support uses `nodejs-avro-phonetic` as the parser, loaded asynchronously to avoid blocking render. The roman-to-Bengali mapping is re-parsed on every keystroke against the entire roman buffer, with a `mapUnicodeCursorToRomanCursor` function that maps the Unicode cursor position back to the correct roman offset — so mid-word editing and cursor repositioning work correctly.

### One-Click Bijoy Copy

The editor toolbar includes a direct **Bijoy copy** button that converts Unicode Bengali to legacy Bijoy encoding on the fly, so text pasted into older design software (Adobe Illustrator, older Word versions) renders correctly without any external tool.

---

## Keyboard Layouts

| Layout | Type | Description |
|:--|:--|:--|
| **Bijoy** | Fixed | The dominant layout in Bangladesh. Standard Bijoy 52 key mapping. |
| **UniJoy** | Fixed | Bijoy base with Unicode-standard composite vowel extensions. |
| **SomewhereIn** | Fixed | Popular alternative fixed layout. |
| **Baishakhi** | Fixed | Regional variant, Bijoy-compatible mapping. |
| **Probhat** | Fixed | OpenBangla/Ekushey Unicode-standard layout. |
| **Avro Phonetic** | Phonetic | Type Bengali phonetically in Roman script. Full Avro ruleset via `nodejs-avro-phonetic`. |

---

## What's New

### v2 — Cross-Browser Fixes (May 2026)

- **Android Chrome typing now works.** Virtual keyboard input goes through a three-layer event pipeline. The new `processedByPlugin` fallback in `handleTextInput` ensures characters reach the engine even when `beforeinput.preventDefault()` is ignored by the browser or when the keyboard uses a non-standard `inputType`.
- **Windows Chrome virtual keyboard fixed.** The same fallback path covers touch-screen Windows devices where input routes through the virtual keyboard pipeline rather than physical key events.
- **Avro parser race condition eliminated.** The parser is now loaded once and cached; subsequent keystrokes no longer race against an in-flight dynamic import.
- **Avro mid-word editing.** Unicode cursor position is now correctly mapped back to the roman buffer offset, so editing inside a previously typed word re-parses correctly.

---

## Tech Stack

| Layer | Technology |
|:--|:--|
| Framework | Nuxt 4 |
| Editor | TipTap v3 (ProseMirror) |
| UI | Nuxt UI v4 + Tailwind CSS v4 |
| State | Pinia |
| Phonetic Parser | `nodejs-avro-phonetic` |
| Grapheme Segmentation | `Intl.Segmenter` (bn locale) |

---

## Live Demo

[https://riz007.github.io/lekha/](https://riz007.github.io/lekha/)

Deployed automatically to GitHub Pages on every push to `main`.

---

## Credits

- **bnwebtools** — Key mappings derived from the [Bangla Unicode Web Tools](http://sourceforge.net/projects/bnwebtools) project by S M Mahbub Murshed and Arup Kamal.
- **Avro Phonetic** — Transliteration rules by Mehdi Hasan Khan of OmicronLab.
- **nodejs-avro-phonetic** — Community JS port of the Avro phonetic engine.

---

## License

MIT — see [LICENSE.md](LICENSE.md).

Built with ❤️ for the Bengali language.
