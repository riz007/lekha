# Lekha.js – Advanced Typographic Bengali Engine

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://riz007.github.io/lekha/)

Lekha.js is a modern, headless Bengali typing engine built with **Nuxt 4** and **TipTap**. It is designed to solve legacy issues with Bengali Unicode rendering, cursor management, and cluster-safe editing.

Lekha.js is a fundamental rethink of Bengali typing on the web, designed and implemented by **[riz007](https://github.com/riz007)**. While it utilizes the core logic and mappings from the classic **bnwebtools** project, the modern architecture, state-based engine, and rich-text integration are original innovations.

## 🚀 Technical Innovations by riz007

Lekha.js introduces several unique architectural advancements compared to legacy tools:

### 1. State-Based Syllabic DFA Engine
Legacy tools rely on global regex replacements. Lekha.js uses a **Deterministic Finite Automaton (DFA)** state machine that tracks the active syllable currently being typed. This ensures $O(1)$ performance and 100% predictable reordering.

### 2. Defensive Sequential Reordering (The "Amader" Fix)
Solves the common "Over-Reordering" bug. Once a word is finished (Space/Enter), its order is "locked" in the document, preventing subsequent typing from breaking previous words.

### 3. Smart Grapheme Cluster Management
Uses the modern `Intl.Segmenter` API to treat Bengali conjuncts (Juktakkhor) as atomic units. Deletion removes the entire cluster instead of leaving typographically invalid "dangling Hasants."

### 4. Automatic "Smooth" Joiner Logic
Automatically injects contextual **ZWJ (Zero Width Joiners)** for complex clusters like `র‌্য`, ensuring professional-grade visual curvature in modern fonts without manual user intervention.

### 5. TipTap Rich-Text Bridge
The first implementation to bring reliable Bengali typographic reordering to a headless rich-text environment (ProseMirror), allowing seamless **Bold**, *Italic*, and color formatting while typing.

---

## ✨ Comparison at a Glance

| Feature | Legacy Tools (bnwebtools, etc.) | Lekha.js (The Improvement) |
| :--- | :--- | :--- |
| **Engine Logic** | Global Regex Replacement | **State-Based Syllabic DFA** |
| **Editor Type** | Standard Textarea | **TipTap (Rich-Text/ProseMirror)** |
| **Deletion** | One byte at a time | **Smart Grapheme Delete (Cluster-Safe)** |
| **Reordering** | Scans entire document | **Defensive Sequential Buffer** |
| **Joiner Logic** | Manual input | **Automatic Contextual Joiners** |

---

## 🔡 Multi-Layout Support

- **Fixed:** Bijoy, UniJoy, SomewhereIn, Baishakhi.
- **Phonetic:** Avro Phonetic (Integrated via `nodejs-avro-phonetic`).
- **Standard:** Probhat (Unicode).

## 🛠️ Technical Stack

- **Framework:** Nuxt 4
- **Editor:** TipTap (ProseMirror)
- **Styling:** Nuxt UI v4 & Tailwind CSS
- **State:** Pinia

## 🚀 Deployment

This project is automatically deployed to GitHub Pages via Actions.
**Live URL:** [https://riz007.github.io/lekha/](https://riz007.github.io/lekha/)

## 📜 Credits & Acknowledgments

Lekha.js honors the work of the pioneers who built the foundation of Bengali open-source:

- **bnwebtools:** Mappings derived from the [Bangla Unicode Web Tools](http://sourceforge.net/projects/bnwebtools) project by **S M Mahbub Murshed** and **Arup Kamal**.
- **Avro Phonetic:** Transliteration rules created by **Mehdi Hasan Khan** of **OmicronLab**.
- **jsAvroPhonetic:** Community port used for Avro logic.

## ⚖️ License & Credits

**Lekha.js** is an original work designed and implemented by **[riz007](https://github.com/riz007)**.

The modern state-based engine and TipTap integration represent a fresh implementation of Bengali typing logic for the modern web. The project is released under the **MIT License**.

---
Built with ❤️ for the Bengali language.
