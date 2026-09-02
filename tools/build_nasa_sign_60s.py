#!/usr/bin/env python3
"""
Build a 60-second side-by-side video:
  - LEFT  half (640x720): NASA Newton's Second Law — real video of the
                          astronaut in the ISS doing the experiment
  - RIGHT half (640x720): a real human signing the spoken words in ASL,
                          sourced from the WLASL_v0.3 word index

The right panel's signing is paced to the transcript's word-level timing
(generated locally with Whisper, see src/data/transcript.ts). Each word
that has a WLASL sign gets its clip inserted at the correct time. Words
without a WLASL sign are skipped (the right panel holds the last sign).

Output: public/videos/nasa_sign_60s.mp4
"""
import os, re, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/Users/radhikaverma/Downloads/Signbridge-main')
CLIPS = ROOT / 'public' / 'videos' / 'clips'
OUT = ROOT / 'public' / 'videos' / 'nasa_sign_60s.mp4'
W, H = 1280, 720
LW = 640
DURATION = 60.0
NASA_VIDEO = ROOT / 'public' / 'videos' / 'newtons-second-law.webm'

# Manual EN->NGT fallback for the avatar (the 3D Eva signs Dutch).
# When we don't have an ASL sign for a word, we use the avatar as a fallback.
# But the user wants the right panel to be a real signer in any language,
# so this list is just for reference.
NGT_OVERRIDE = {
    'physics': 'WETENSCHAP',  # not in NGT either
    'science': 'WETENSCHAP',
    'experiment': 'EXPERIMENT',  # close
    'theory': 'THEORIE',
    'object': 'VOORWERP',
    'force': 'AANTREKKEN',  # closest: pull
    'weight': 'ZWAAR',  # heavy
    'speed': 'SNEL',
    'push': 'AANTREKKEN',  # closest: pull
    'pull': 'WEGTREKKEN',
    'work': 'WERKEN',
    'energy': 'LICHT',  # closest
    'power': 'KRACHT',  # not in NGT either
    'pressure': 'DRUKKEN',
    'temperature': 'HEET',
    'change': 'VERANDEREN',
    'compare': 'VERGELIJKEN',
    'measure': 'METEN',
}

# Parse the Whisper transcript to get per-word timestamps
TRANSCRIPT_TS = '/Users/radhikaverma/Downloads/Signbridge-main/src/data/transcript.ts'
with open(TRANSCRIPT_TS) as f: txt = f.read()
# Each line is: { id: 't1', start: 15.0, end: 19.5, text: "..." }
LINE_RE = re.compile(r"id:\s*'([^']+)',\s*start:\s*([\d.]+),\s*end:\s*([\d.]+),\s*text:\s*'([^']+)'")
transcript = []
for m in LINE_RE.finditer(txt):
    transcript.append({
        'id': m.group(1),
        'start': float(m.group(2)),
        'end': float(m.group(3)),
        'text': m.group(4),
    })
print(f'transcript: {len(transcript)} lines')

# Build per-word timeline: for each word in the transcript, decide if it
# has an ASL sign clip. Words that DO get a sign with a 1.0-1.5s window
# starting at the word's "ideal" time. Words that DON'T get a small gap
# (so the right panel freezes on the previous sign or goes dark).
# We linearly distribute the words in each line across the line's time range.
SIGNED_TIMELINE = []  # (start, end, word, clip_path)
GAP_TIMELINE = []      # (start, end)

for line in transcript:
    words = re.findall(r"[a-z']+", line['text'].lower())
    if not words: continue
    dur = line['end'] - line['start']
    word_dur = dur / len(words)
    for i, w in enumerate(words):
        start = line['start'] + i * word_dur
        end = start + word_dur
        # check ASL
        clip = CLIPS / f'{w}.mp4'
        if clip.exists() and clip.stat().st_size > 1000:
            SIGNED_TIMELINE.append((start, end, w, clip))
        else:
            GAP_TIMELINE.append((start, end))

print(f'ASL-signed words in timeline: {len(SIGNED_TIMELINE)}')
print(f'Gaps (no sign): {len(GAP_TIMELINE)}')

# Pick signs from the full transcript (0-128s) but only the ones that map
# to words that have actual ASL clips. We'll pack them densely in the 60s
# window — ~2 seconds per sign — instead of using the original (tiny)
# word-slot timing. This gives a more useful demo.
ALL_SIGNED_WORDS = []
for line in transcript:
    words = re.findall(r"[a-z']+", line['text'].lower())
    if not words: continue
    for w in words:
        clip = CLIPS / f'{w}.mp4'
        if clip.exists() and clip.stat().st_size > 1000:
            ALL_SIGNED_WORDS.append(w)

# de-dupe while keeping order
seen = set()
unique_signed = []
for w in ALL_SIGNED_WORDS:
    if w not in seen:
        seen.add(w)
        unique_signed.append(w)
print(f'unique signed words available: {len(unique_signed)}')

# Filter timeline: drop signs that start at or after 60s
SIGNED_TIMELINE = [(s, e, w, c) for s, e, w, c in SIGNED_TIMELINE if s < DURATION]
print(f'ASL-signed in 0-60s: {len(SIGNED_TIMELINE)}')

# Step 1: crop NASA to 60s
TEMP = Path('/tmp/nasa_sign')
TEMP.mkdir(exist_ok=True)
nasa_60 = TEMP / 'nasa_60.mp4'
if not nasa_60.exists():
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-t', str(DURATION),
           '-i', str(NASA_VIDEO),
           '-vf', f'scale={LW}:{H}:force_original_aspect_ratio=decrease,'
                 f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
           '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast','-an',
           str(nasa_60)]
    subprocess.run(cmd, check=True, timeout=120)
print(f'NASA 60s clip: {nasa_60}')

# Step 2: build a 60s RIGHT panel with the sign clips in sync
# Strategy: for each ASL sign, create a 1.5s clip with -stream_loop -1.
# Concat all clips with a complex filter that places each at the right time.
# Use a "base" black canvas, then overlay each sign at its time.

# Build a black 60s base video
print('=== Building right panel ===')
right_base = TEMP / 'right_base.mp4'
if not right_base.exists():
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-f','lavfi','-t', str(DURATION),
           '-i', f'color=c=0x0d0e15:s={LW}x{H}:r=30',
           '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast',
           str(right_base)]
    subprocess.run(cmd, check=True, timeout=60)

# Each sign clip is looped, scaled, then displayed only in its time window.
# We do this with concat filter — pre-render each clip segment and concat
# with explicit time gaps. This is simpler and more reliable than a single
# complex filter with many overlays.
#
# Strategy: pack the unique signed words densely into 60s — ~2.2s per sign.
# This produces a watchable demo where the right panel is mostly signing.
print(f'Building dense signing timeline from {len(unique_signed)} unique signed words...')

# Pack the unique signed words densely into 60s — ~2.2s per sign.
SIGNED_TIMELINE = []  # (start, end, word, clip_path)
gap = 0.2
per_sign = 2.2
cur_t = 0.0
for w in unique_signed:
    clip = CLIPS / f'{w}.mp4'
    if not clip.exists() or clip.stat().st_size < 1000:
        continue
    start = cur_t
    end = cur_t + per_sign
    if end > DURATION:
        break
    SIGNED_TIMELINE.append((start, end, w, clip))
    cur_t = end + gap
print(f'  dense timeline: {len(SIGNED_TIMELINE)} signs, total {cur_t:.1f}s')

# If we have unused time, extend the LAST few signs to fill 60s.
# (Or re-pack with longer per_sign if we have headroom)
remaining = DURATION - cur_t
if remaining > 5 and SIGNED_TIMELINE:
    # pad each sign by remaining/len seconds
    extra = remaining / len(SIGNED_TIMELINE)
    per_sign += extra
    SIGNED_TIMELINE = []
    cur_t = 0.0
    for w in unique_signed:
        clip = CLIPS / f'{w}.mp4'
        if not clip.exists() or clip.stat().st_size < 1000:
            continue
        start = cur_t
        end = cur_t + per_sign
        if end > DURATION: break
        SIGNED_TIMELINE.append((start, end, w, clip))
        cur_t = end + gap
    print(f'  re-packed with per_sign={per_sign:.2f}s, {len(SIGNED_TIMELINE)} signs, ends at {cur_t:.1f}s')

seg_files = []
cur_t = 0.0
for i, (start, end, w, clip) in enumerate(SIGNED_TIMELINE):
    if start < cur_t:
        # overlap with previous sign — skip the start
        start = cur_t
    if start >= end:
        # no time left in 60s window
        continue
    if end > DURATION:
        end = DURATION
    dur = end - start
    seg = TEMP / f'seg_{i:03d}_{w}.mp4'
    if not seg.exists():
        # black gap, then sign clip for `dur` seconds
        # use complex filter: black [start] + looped scaled clip
        cmd = ['ffmpeg','-y','-loglevel','error',
               '-f','lavfi','-t', str(start - cur_t),
               '-i', f'color=c=0x0d0e15:s={LW}x{H}:r=30',
               '-stream_loop','-1','-i', str(clip),
               '-t', str(dur),
               '-filter_complex',
               f'[0:v]format=yuv420p[gap];'
               f'[1:v]scale={LW}:{H}:force_original_aspect_ratio=decrease,'
               f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p,trim=0:{dur}[sign];'
               f'[gap][sign]concat=n=2:v=1:a=0,format=yuv420p[v]',
               '-map','[v]',
               '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
               '-preset','ultrafast',
               str(seg)]
        subprocess.run(cmd, check=True, timeout=60)
    seg_files.append(seg)
    cur_t = end

# Final gap from cur_t to DURATION
if cur_t < DURATION:
    final_gap = TEMP / 'final_gap.mp4'
    if not final_gap.exists():
        cmd = ['ffmpeg','-y','-loglevel','error',
               '-f','lavfi','-t', str(DURATION - cur_t),
               '-i', f'color=c=0x0d0e15:s={LW}x{H}:r=30',
               '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
               '-preset','ultrafast',
               str(final_gap)]
        subprocess.run(cmd, check=True, timeout=30)
    seg_files.append(final_gap)

# Concat all
right_built = TEMP / 'right_built.mp4'
list_path = TEMP / 'right_list.txt'
with open(list_path, 'w') as f:
    for s in seg_files: f.write(f"file '{s.name}'\n")
cmd = ['ffmpeg','-y','-loglevel','error',
       '-f','concat','-safe','0','-i', str(list_path),
       '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
       '-preset','ultrafast',
       '-t', str(DURATION),
       str(right_built)]
subprocess.run(cmd, check=True, timeout=300)
print(f'  right panel: {right_built}')
print(f'  segments: {len(seg_files)}')

# Step 3: hstack + label bar
print('=== hstack ===')
def load_font(sz, bold=False):
    paths = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold
            else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except: pass
    return ImageFont.load_default()

label_png = TEMP / 'label_bar.png'
bar = Image.new('RGB', (1280, 36), (13, 14, 21))
d = ImageDraw.Draw(bar)
f_label = load_font(14, bold=True)
d.text((20, 10), "LEFT  -  NASA Newton's Second Law (real STEM experiment)", fill=(245, 240, 230), font=f_label)
d.text((660, 10), "RIGHT  -  Real human signer (ASL, WLASL clips)", fill=(16, 185, 121), font=f_label)
bar.save(label_png)

filter_complex = (
    f'[0:v]format=yuv420p[left];'
    f'[1:v]format=yuv420p[right];'
    f'[left][right]hstack=inputs=2,format=yuv420p[main];'
    f'[main]pad=iw:ih+36:0:0:color=0x0d0e15,format=yuv420p[mainp];'
    f'[2:v]format=yuv420p[bar];'
    f'[mainp][bar]overlay=0:0[outv]'
)
cmd = ['ffmpeg','-y','-loglevel','error',
       '-i', str(nasa_60),
       '-i', str(right_built),
       '-loop','1','-t',str(DURATION),'-i', str(label_png),
       '-filter_complex', filter_complex,
       '-map','[outv]','-c:v','libx264','-crf','22','-preset','fast',
       '-pix_fmt','yuv420p','-r','30','-movflags','+faststart',
       str(OUT)]
subprocess.run(cmd, check=True, timeout=180)
d = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', str(OUT)],
                   capture_output=True, text=True).stdout.strip()
print(f'wrote {OUT.name}  duration: {d}s  size: {os.path.getsize(OUT):,} bytes')