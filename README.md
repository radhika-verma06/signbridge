# SignBridge — Proof of Concept

> "Learning shouldn't depend on how you hear."

**Live demo:** https://radhika-verma06.github.io/signbridge/

SignBridge is an early-stage accessibility/education concept for Deaf and
Auslan-first learners. It is **not** a claim to have solved English-to-Auslan
translation, and it is **not** a replacement for human Auslan interpreters.

This build demonstrates one real, controlled lesson end to end: a real NASA
video, a real transcript, a concept-resolution engine, and genuine
Auslan-derived signing motion for a small vocabulary — wired into Interpret,
Explain, Ask, and Visualise.

## Running it locally

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`).
Everything needed for a presentation works from this one command — no API
key, no Python, no external services at runtime.

To build a static production bundle:

```bash
npm run build
npm run preview
```

## What's real, and how it was made

| Layer | Source | Method |
|---|---|---|
| Lecture video | `public/videos/newtons-second-law.webm` | NASA/ISS "STEMonstrations: Newton's Second Law of Motion" — a real recorded lesson, played with a genuine HTML5 `<video>` element as the master clock. |
| Transcript | `src/data/transcript.ts` | Generated **locally** with [OpenAI Whisper](https://github.com/openai/whisper) ("small" model, word-level timestamps), run against this video's own audio track (decoded via PyAV, no cloud STT). No timestamp was hand-invented. |
| Concept resolution | `src/data/concepts.ts`, `src/services/lessonContext.ts` | A controlled vocabulary of Newton's-Second-Law concepts, each matched against transcript text by several paraphrase patterns (not a single keyword swap) — e.g. "mass", "massive", and "how much stuff" all resolve to the `mass` concept. |
| Auslan signing | `public/signs/auslan/*.json` + `lexicon.json` | Real Auslan motion for **12 concepts**, sourced from [MM-WLAuslan](https://github.com/UQ-CVLab/MM-WLAuslan-Dataset) (CC BY-NC-SA 4.0), pose-extracted **locally** with MediaPipe Holistic (body + face + both hands) from the dataset's own studio-recorded clips. Nothing here is hand-animated or invented — see "How pose extraction works" below. |
| Explain / Ask | `src/services/learningAIProvider.ts` | Deterministic local logic (2+ explanation variants per major concept, pattern-matched answers) behind a `LearningAIProvider` interface, so the demo works fully offline. |
| Live Translate | `src/services/glossEngine.ts`, `src/services/proceduralSigns.ts` | Type English, watch the signer perform it. Three-tier resolution, labelled per token: **Auslan-derived** (real MM-WLAuslan motion for lesson-lexicon words like *force*), **gloss sign** (procedurally synthesised keyframes for an ASL-derived everyday lexicon — greetings, pronouns, WH-questions — ported from the genai-asl-avatar-generator demo engine), and **fingerspelling** (held letter handshapes for unknown words). Grammar rules (pronoun indexing, WH-movement, time-topic-comment, copula omission) are applied visibly. Gloss-sign motion is synthesised from sign descriptions, not captured human motion, and is not validated Auslan. |

## Auslan data source, licence, and attribution

- **Dataset:** MM-WLAuslan (Multi-View Multi-Modal Word-Level Australian Sign
  Language Recognition Dataset), UQ-CVLab, The University of Queensland.
  Paper: https://arxiv.org/abs/2410.19488
- **Licence:** CC BY-NC-SA 4.0, confirmed consistently in both the paper and
  the current dataset page (see `licenceVerifiedFrom` in `lexicon.json`).
  Non-commercial use with attribution; any redistributed derivative must
  carry the same licence.
- **Provenance:** recorded by the dataset team in a studio with recruited
  Auslan experts, deaf signers, and volunteers, with recorded signer consent
  — not sourced from broadcast TV, which materially reduces third-party
  rights risk compared to some other Auslan corpora.
- **Why not Auslan-Daily:** its own NeurIPS paper states **CC BY-NC-ND 4.0**
  (No-Derivatives), which conflicts with the current dataset website's
  claimed CC BY 4.0. Since the underlying video is sourced from broadcast TV
  ("Sally and Possum", "ABC News with Auslan") that the dataset authors don't
  solely own, the paper's more restrictive term was treated as authoritative,
  and Auslan-Daily was not used for this build.
- Full attribution per sign (dataset, clip ID, licence, extraction method)
  lives in `public/signs/auslan/lexicon.json` — kept separate from UI code
  on purpose.

## How pose extraction works

1. One short (~2–5 second) clip per concept was located in MM-WLAuslan's
   gloss dictionary and downloaded via a **partial remote-zip read** (HTTP
   Range requests against the dataset's ~14.5GB archive) — only the needed
   clip's bytes were ever transferred.
2. [MediaPipe Holistic](https://github.com/google/mediapipe) (0.10.21) ran
   locally on each clip, extracting body pose (33 points), face mesh
   (subsampled), and both hands (21 points each) per frame.
3. The result was saved via the [`pose-format`](https://github.com/sign-language-processing/pose)
   library (the same format used by the
   [`spoken-to-signed-translation`](https://github.com/sign-language-processing/spoken-to-signed-translation)
   pipeline this project's feasibility work was built on), then converted to
   a compact browser-ready JSON (`public/signs/auslan/<concept>.json`) — no
   Python or MediaPipe is needed at runtime, only a static fetch.

## How the signer works

`src/components/SignerRenderer.tsx` is a canvas-based, anatomically
proportioned 2D character (filled head/torso/limbs, tapered capsule finger
joints) driven **directly** by the real per-frame landmark coordinates above
— nothing is hand-keyframed. Adjacent recorded frames are linearly
interpolated for smooth playback at 0.75×/1×. It deliberately does not
attempt a photorealistic 3D avatar (see Limitations).

## Which concepts are supported

12 real Auslan-derived signs: **acceleration, equation (=), push, move,
increase, decrease, more, same, fast, slow, decelerate, object**.

**Force** and **mass** are *not* signed, on purpose: no confident
physics-register Auslan sign was found in the source dictionary for either
(only the general "coercion/force" and "pile/church-mass" senses exist).
Rather than guess, the app falls back to captions-only for these two
concepts — see `SignedLearningPanel`'s "Signed support isn't available for
this concept yet" state.

## Validation status

**Every** sign in `lexicon.json` carries
`"validationStatus": "AUSLAN-DERIVED - NOT YET HUMAN VALIDATED"`. No sign
here has been checked by a fluent Auslan signer or linguist. Several entries
also carry a `linguisticCaveat` field noting a specific ambiguity (e.g. the
"decrease" sign's primary dictionary sense is "small", not "decrease").
Multi-sign sequences, where shown, are individual concept signs played in
sequence — not a claim of grammatically correct Auslan sentence structure.

## How to add another Auslan concept

1. Find a candidate gloss in MM-WLAuslan's `Dictionary_Mapping.pt` (or
   another source with a clear, checked licence).
2. Get one sample clip ID from that split's label JSON, and extract it with
   `remote_zip_extract.py` (partial zip read — see the feasibility
   experiment for the full script).
3. Run `extract_pose.py <clip>.mp4 <concept>.pose` to get a MediaPipe
   Holistic `.pose` file.
4. Add an entry to `build_public_lexicon.py`'s `PLAN` list and rerun it to
   produce `public/signs/auslan/<concept>.json` and update `lexicon.json`.
5. Add the concept to `ConceptId` in `src/types.ts` and give it matchers in
   `src/data/concepts.ts`.
6. Leave `validationStatus` as `"AUSLAN-DERIVED - NOT YET HUMAN VALIDATED"`
   until a fluent Auslan signer has actually checked it.

## Limitations

- Signed vocabulary is intentionally small (12 concepts) — breadth was
  deliberately traded for correctness (see "Do not fake Auslan sentences"
  in the project brief this was built against).
- No sign has been human-validated.
- The signer is a stylised 2D character, not a 3D avatar — see the prior
  feasibility report for why (pose data ≠ rig-ready animation formats like
  BVH/glTF/BML without further conversion work).
- Explain/Ask are deterministic, not a live language model.
- The concept-resolution engine is pattern-based, not a full NLP pipeline —
  it's tuned to this one lesson's language.

## Future path: swapping in a real sign-production model

Every piece of the signing pipeline sits behind a small interface:
`SignProvider` (`src/services/signRendererProvider.ts`) resolves a concept
to pose frames; today it's backed by the hand-built lexicon above. A future
`Text2Sign`, generative model, remote API, or human-video-retrieval provider
can implement the same interface and be swapped in without touching
`SignedLearningPanel`, `SignerRenderer`, or any other UI component.
`LearningAIProvider` is the equivalent seam for Explain/Ask, ready for a real
LLM later.

## Project structure

```
public/
  videos/newtons-second-law.webm     real lesson video
  signs/auslan/                      static pose JSON + lexicon.json (attribution lives here)
src/
  components/                        one component per UI region
  services/                          transcription, lesson context, sign resolution,
                                      Auslan lexicon loading, learning-AI provider
  data/                              transcript + concept/explanation content
  hooks/                             guided demo script, reduced-motion detection
```

## Accessibility notes

Captions default on, semantic headings and landmarks, visible focus rings,
keyboard-operable controls (including the transcript's click-to-seek), ARIA
labels and `aria-live` regions on dynamic content (captions, interpret
result, chat log, acceleration readout), no information conveyed by colour
alone, large touch targets, and `prefers-reduced-motion` is respected
throughout — including freezing the signer's animation.

## Guided demo

Click **"Run guided demo"** in the header for a scripted, ~35-second,
fully offline walkthrough that drives the real interface: play the real
video → jump to the force/mass demonstration → Interpret → Explain →
Ask a follow-up → Visualise force and mass changing acceleration live.

## Honesty note

SignBridge currently demonstrates a controlled learning workflow. Signed
content uses genuine Auslan-derived motion sourced from a licensed dataset,
but has not been validated by a fluent Auslan signer, and is not a
replacement for human Auslan interpreters. See "About this prototype" in
the app for the same summary in-product.
