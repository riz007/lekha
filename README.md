# Lekha.js – Advanced Typographic Bengali Engine

Lekha.js is a modern, headless Bengali typing engine built with **Nuxt 4** and **TipTap**. It is designed to solve legacy issues with Bengali Unicode rendering, cursor management, and cluster-safe editing.

Lekha.js is an evolutionary upgrade of the classic **Bangla Unicode Web Tools (bnwebtools)** project, bringing its robust logic into the modern web ecosystem.

## ✨ Features

- **🚀 State-Based Syllabic Engine:** Uses Deterministic Finite Automata (DFA) for $O(1)$ key mapping and transformation.
- **🔡 Multi-Layout Support:**
  - **Fixed:** Bijoy, UniJoy, SomewhereIn, Baishakhi.
  - **Phonetic:** Avro Phonetic (Integrated via `nodejs-avro-phonetic`).
  - **Standard:** Probhat (Unicode).
- **🛡️ Smart Grapheme Management:** Uses `Intl.Segmenter` to prevent "dangling Hasants" and ensures atomic deletion of Bengali conjuncts (Juktakkhor).
- **🪄 Unicode Reordering:** Automatic "Pre-base Vowel" transformation (e.g., typing `ে` before `ক` results in the correct `কে` sequence).
- **💡 Predictive Ghost Text:** Floating suggestions for common conjuncts and phonetic completions.
- **📋 Cross-Platform Safe Copy:**
  - **Unicode Sanitize:** Strips/adds ZWJ/ZWNJ for modern app compatibility.
  - **Unicode-to-Bijoy:** Instant conversion for legacy software (Photoshop, Illustrator, Word).

## 🛠️ Technical Stack

- **Framework:** [Nuxt 4](https://nuxt.com/)
- **Editor:** [TipTap](https://tiptap.dev/) (Headless ProseMirror wrapper)
- **Styling:** [Nuxt UI v4](https://ui.nuxt.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State:** [Pinia](https://pinia.vuejs.org/)
- **Logic:** Custom Bengali Typographic Engine (`app/utils/bengali.ts`)

## 🚦 Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

### Build & Generate (Static)

```bash
# Generate static site for deployment
npm run generate
```

## 🚀 Deployment (GitHub Pages)

This project is configured for automated deployment to GitHub Pages.

1.  Push your code to the `main` branch.
2.  The GitHub Action in `.github/workflows/deploy.yml` will automatically build and deploy.
3.  Ensure your repository settings are set to serve from the `gh-pages` branch.

**Note:** If your repository name is not `lekhajs`, update the `NUXT_APP_BASE_URL` in `.github/workflows/deploy.yml` and `nuxt.config.ts`.

## 📜 Credits & Acknowledgments

Lekha.js is built upon the foundational work of the Bengali open-source community:

- **bnwebtools:** Logic and mappings derived from the [Bangla Unicode Web Tools](http://sourceforge.net/projects/bnwebtools) project, created by **S M Mahbub Murshed** and **Arup Kamal**.
- **Avro Phonetic:** Phonetic transliteration system and rules created by **Mehdi Hasan Khan** of **OmicronLab**.
- **jsAvroPhonetic:** Modern JavaScript implementation of Avro logic, used via the `nodejs-avro-phonetic` community port.
- **SolaimanLipi:** The default font recommendation for optimal rendering.

## ⚖️ License

Lekha.js is released under the **MIT License**. Original logic from `bnwebtools` is utilized under the spirit of its GPL origins, refactored for modern web standards.

---
Built with ❤️ for the Bengali language.
