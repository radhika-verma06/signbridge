#!/usr/bin/env python3
"""
Build a 1-min SIDE-BY-SIDE video:
  - LEFT half  (640x720):  actual STEM educational content (slides w/ narration)
  - RIGHT half (640x720):  real human ASL signing for the topic words

This is the layout the user wants — "left video plays, right ASL plays".
Output: media/sidebyside.mp4
"""
import os, json, urllib.request, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/Users/radhikaverma/asl_avatar_prototype')
CLIPS = ROOT / 'media' / 'clips'
OUT  = ROOT / 'media' / 'sidebyside.mp4'

W, H = 1280, 720
LW = 640   # left panel width

# Lesson timeline: (start_s, end_s, text_overlay_left, english_word_for_right)
# Each tuple = one ASL clip on the right, with synchronized text on the left
LESSON = [
    ( 0.0,  5.5, "Hello",                'good'),
    ( 5.5, 11.0, "This is your body",     'body'),
    (11.0, 17.0, "Look inside your body", 'body'),
    (17.0, 23.0, "Your heart beats",      'heart'),
    (23.0, 29.5, "Your brain learns",     'brain'),
    (29.5, 36.0, "Blood flows through you", 'blood'),
    (36.0, 41.5, "You grow and live",     'grow'),
    (41.5, 47.0, "You drink water",       'drink'),
    (47.0, 52.5, "Earth, sun, moon",      'earth'),
    (52.5, 57.0, "Blue and green",        'blue'),
    (57.0, 60.0, "Thank you",             'good'),
]
TOTAL = 60.0
assert abs(sum(b-a for a,b,_,_ in LESSON) - TOTAL) < 0.1, \
    f'timeline = {sum(b-a for a,b,_,_ in LESSON)}'
print(f'lesson timeline: {TOTAL}s')

# ====== 1. Render the LEFT-panel slides (educational content) ======
def load_font(sz, bold=False):
    paths = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold
            else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except: pass
    return ImageFont.load_default()

BG_LEFT  = (250, 246, 236)
BG_DARK  = (15, 17, 25)
INK      = (34, 31, 27)
MUTED    = (90, 85, 75)
ACCENT   = (94, 106, 210)
GREEN    = (16, 122, 87)

def render_left_slide(text, accent=None):
    """Render a single left-panel slide (640x720) with educational text."""
    img = Image.new('RGB', (LW, H), BG_LEFT)
    d = ImageDraw.Draw(img)
    # header bar
    d.rectangle((0, 0, LW, 50), fill=(28, 30, 38))
    f_e = load_font(11, bold=True)
    d.text((20, 18), 'LESSON 01 · INSIDE YOU', fill=(245, 240, 230), font=f_e)
    d.text((LW-100, 18), 'CAPTIONED', fill=(160, 113, 255), font=f_e)
    # divider
    d.line((0, 50, LW, 50), fill=(60, 62, 80))
    # big title
    f_h = load_font(36, bold=True)
    bbox = d.textbbox((0,0), text, font=f_h)
    tw = bbox[2]-bbox[0]
    # word-wrap
    if tw > LW - 60:
        words = text.split()
        line, lines = '', [text]
        for w in words:
            test = (line + ' ' + w).strip()
            if d.textbbox((0,0), test, font=f_h)[2] > LW - 60:
                lines.append(line)
                line = w
            else:
                line = test
        if line: lines.append(line)
        y = 90
        for ln in lines[:3]:
            tw = d.textbbox((0,0), ln, font=f_h)[2]
            d.text(((LW-tw)//2, y), ln, fill=INK, font=f_h)
            y += 50
    else:
        d.text(((LW-tw)//2, 250), text, fill=INK, font=f_h)
    # accent line
    if accent:
        f_a = load_font(18, bold=True)
        ab = d.textbbox((0,0), accent, font=f_a)
        d.text(((LW-ab[2]+ab[0])//2, H-110), accent, fill=GREEN, font=f_a)
    # decorative anatomy diagrams (very simple shapes)
    return img

# ====== 2. For each lesson segment: build a left slide + right ASL clip ======
def find_clip(word):
    path = CLIPS / f'{word}.mp4'
    if path.exists() and path.stat().st_size > 1000:
        return path
    return None

def build_segment(idx, start, end, text, word):
    seg_dur = end - start
    seg_out = CLIPS / f'seg_{idx:02d}.mp4'
    clip = find_clip(word)
    if not clip:
        print(f'  seg {idx}: NO clip for {word}, skipping')
        return None
    # 1. render left slide PNG
    accent = {
        'good':  'Lesson 01',
        'body':  'Human body',
        'heart': 'Pumps blood',
        'brain': 'Controls body',
        'blood': 'Oxygen carrier',
        'grow':  'Living thing',
        'drink': 'Stay hydrated',
        'earth': 'Our home',
        'blue':  'Colors of life',
    }.get(word, '')
    slide_png = CLIPS / f'slide_{idx:02d}.png'
    render_left_slide(text, accent).save(slide_png)
    # 2. ffmpeg: scale ASL clip to right half (640x720), scale slide to left half (640x720),
    #    hstack them. We use -stream_loop -1 on the clip input to loop it
    #    indefinitely — so the signer repeats the sign throughout the entire
    #    segment instead of freezing on the last frame after ~2 seconds.
    #    `-t seg_dur` at the output caps the total duration to one segment.
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-i', str(slide_png),
           '-stream_loop','-1','-i', str(clip),
           '-filter_complex',
           f'[0:v]scale={LW}:{H}:force_original_aspect_ratio=decrease,'
           f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[left];'
           f'[1:v]scale={LW}:{H}:force_original_aspect_ratio=decrease,'
           f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[right];'
           f'[left][right]hstack=inputs=2,format=yuv420p[outv]',
           '-map','[outv]','-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast','-t', str(seg_dur), str(seg_out)]
    subprocess.run(cmd, check=True, timeout=60)
    print(f'  seg {idx}: {text!r} ({seg_dur}s, clip={word})')
    return seg_out

print('=== Building 11 segments ===')
segs = []
for i, (start, end, text, word) in enumerate(LESSON):
    out = build_segment(i, start, end, text, word)
    if out: segs.append(out)

# ====== 3. Concat ======
print()
print('=== Concatenating ===')
list_path = CLIPS / 'concat.txt'
with open(list_path, 'w') as f:
    for s in segs: f.write(f"file '{s.name}'\n")
cmd = ['ffmpeg','-y','-loglevel','error',
       '-f','concat','-safe','0','-i', str(list_path),
       '-c:v','libx264','-crf','22','-preset','fast',
       '-pix_fmt','yuv420p','-r','30','-movflags','+faststart',
       str(OUT)]
subprocess.run(cmd, check=True, timeout=120)
d = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', str(OUT)],
                   capture_output=True, text=True).stdout.strip()
print(f'wrote {OUT}  duration: {d}s  size: {os.path.getsize(OUT):,} bytes')