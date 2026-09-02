# Side-by-Side Mode (feature branch)

This branch adds a **second lesson view** to SignBridge: a 1-minute
"side-by-side" video where the educational content plays on the left
half and a real human signing in ASL plays on the right.

The original NASA + Auslan signer layout is preserved as the default
("NASA + Auslan signer" toggle). The new view is a single pre-composed
MP4 (1280x720, 60s) that runs both halves in sync from a single
`<video>` element.

## What changed

| File | What |
|---|---|
| `public/videos/inside_you.mp4` | The pre-composed side-by-side video (~2.8 MB, 60s, h264). |
| `tools/build_sidebyside.py` | Python pipeline that re-generates the video from the WLASL clips. Re-run after editing the lesson timeline. |
| `src/components/SideBySideLesson.tsx` | New React component, modeled on `VideoLesson.tsx` but for the pre-composed MP4. |
| `src/App.tsx` | Added `lessonMode` state, two-button toggle, and conditional render of `VideoLesson + SignedLearningPanel` (default) vs `SideBySideLesson` only (new). |

## How the side-by-side video is built

Each 5-6 second scene in the video is composed of:
- a **left half** (640x720): a PIL-rendered slide with the lesson title
  in the dark "Inside You" style, the spoken English word, and a small
  accent label
- a **right half** (640x720): a real human signing the word in ASL,
  pulled from the WLASL_v0.3 word index (the one bundled with the
  SignAvatars repo)

The signer clips are pulled from these sources, in priority order:
1. aslbrick.org — 1920x1080 HD, ~218 words covered
2. signschool on Azure Blob — 366 words
3. spreadthesign.com — 178 words, 320x240
4. asldeafined.com — 245 words
5. startasl.com on AWS S3 — 171 words

Each clip is `ffmpeg -stream_loop -1`'d to fill the full segment, so
the signer appears to repeat the sign throughout.

## The lesson script (60s, 11 scenes)

| t (s) | Slide text | Right side gloss |
|---|---|---|
| 0.0–5.5 | "Hello" | good |
| 5.5–11.0 | "This is your body" | body |
| 11.0–17.0 | "Look inside your body" | body |
| 17.0–23.0 | "Your heart beats" | heart |
| 23.0–29.5 | "Your brain learns" | brain |
| 29.5–36.0 | "Blood flows through you" | blood |
| 36.0–41.5 | "You grow and live" | grow |
| 41.5–47.0 | "You drink water" | drink |
| 47.0–52.5 | "Earth, sun, moon" | earth |
| 52.5–57.0 | "Blue and green" | blue |
| 57.0–60.0 | "Thank you" | good |

## How to re-run the build

```bash
cd /Users/radhikaverma/Downloads/Signbridge-main
/usr/bin/python3 tools/build_sidebyside.py
```

Re-running after editing the `LESSON` list rebuilds the video with
new timeline / words. The script is idempotent: clips already on disk
are reused.

## Data source attribution

The signer clips are real human ASL signing videos pulled from the
WLASL_v0.3 word index (the SignAvatars repo's bundled JSON).
SignAvatars itself is:
- Zhengdi Yu et al., Imperial College London + Tencent AI Lab
- "SignAvatars: A Large-scale 3D Sign Language Holistic Motion Dataset
  and Benchmark" (ECCV 2024)
- arXiv:2310.20436

We use only the word→video URL index (datasets/word2motion/WLASL_v0.3.json)
to resolve download links, then download from the underlying public
sources (aslbrick, spreadthesign, etc.) which carry their own licenses
(mostly CC BY / CC BY-NC).

## What's NOT changed

- The original Auslan signer pose rendering is unchanged
- The Newton's Second Law lesson content is unchanged
- All Interpret / Explain / Ask / Visualise panels are unchanged
- The transcript data is unchanged
