# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, deployed to GitHub Pages from `main` via `.github/workflows/static.yml` (uploads the whole repo). Custom domain carlchecrallah.com. Third-party libraries load from a CDN.

## Users

- **Brands and agencies** commissioning motion design, branding and art direction: they skim the work, judge craft quickly and look for a way to get in touch.
- **Studios and recruiters** evaluating Carl for freelance or full-time roles: they want range, proof of craft and a clear profile.

Fans of CHEUX (Carl's music project) are a secondary audience served by the Music page.

## Product Purpose

The portfolio of Carl Checrallah. It shows his brand, motion and video work, and the software and audio tools he builds himself with AI (Claude Code). Success means a client or recruiter leaves convinced of his craft and contacts him.

## Positioning

Motion designer who builds: a motion designer and art director first, who also ships his own working software (desktop apps, an After Effects AI panel, VST3 synths and instruments). The tools are real, tested and installable, not concepts.

## Operating Context

Visitors arrive from Behance, LinkedIn, a CV (PDF with the site link) or Instagram, often on mobile. They skim quickly. Visitors can switch between English and French; the choice is stored in localStorage under `lang`.

## Capabilities and Constraints

- Pages: intro (landing), projects (brand and motion work), AI tools (new), contact, cheux (music). `index.html` redirects to `intro.html`; keep the existing URLs working.
- Bilingual EN/FR via `data-i18n` keys.
- Heavy media: `assets/intro` (~112 MB of clips), `assets/videos` (~43 MB). Videos autoplay muted and play/pause on visibility.
- Some AI tools can be shared on request (contact Carl); none have public download links yet.

## Brand Commitments

- Names: Carl Checrallah (designer); CHEUX (music artist, with its own logo `assets/svg/cheux_logo.svg` and avatar).
- Portrait `assets/intro/WEBSITE_PORTRAIT.png`, avatar `assets/images/avatar.jpg`, favicon `assets/images/FAVICON.png`.
- Contact: carlchekralla@gmail.com, +33 6 12 20 86 08, Behance carlchecrallah3, LinkedIn, Discord community invite.
- Title: "Motion Designer – Art Director" (FR: "Motion Designer – Directeur Artistique").

## Evidence on Hand

- Brand and motion projects with Behance links: Zaqa, Melon Heads "Woman Of My Dreams", Chunkys brand guidelines, NAMANARIII, AVENOV (3D motion), Farouj, Pitchy, Portfolio 2025, a Vimeo reel. Media in `assets/images`, `assets/videos` and `assets/intro`.
- AI-built tools (from their READMEs and logs):
  - washwish: local push-to-talk dictation for Windows (Electron + whisper.cpp) with a voice-reactive liquid-metal orb.
  - rilinote: a node-based note canvas with a live WebSocket backend and an MCP server so Claude can create and connect notes.
  - Claude for After Effects: a CEP panel where Claude builds comps, layers, keyframes and effects.
  - Lirica Autotune: a real-time pitch-correction VST3 (YIN detection, PSOLA shifting, Flex-Tune, MIDI).
  - JANE-01: a Juno-106-inspired polysynth VST3 with 128 patches, an effects section and a Windows installer.
  - Metalcore Drums: a VST3 with 27 pads, 758 samples and 77 original MIDI grooves.
  - Metalcore Guitar: a sample-based VST3 using 3,114 samples, passes pluginval at strictness 10, ~3.6% CPU.
- No testimonials, client quotes or metrics beyond these. Do not invent any.

## Product Principles

1. The work leads; the interface frames it.
2. Show proof, not claims: real media, real specs, real tools.
3. One identity across design, motion, music and code.
4. Every page ends with a path to contact.
