#!/usr/bin/env python3
"""
Build the side-by-side video with:
  - LEFT half  (640x720):  real human signing in ASL (from WLASL clips)
  - RIGHT half (640x720): the 3D Eva avatar signing the SAME words in NGT

Paired by gloss word. Each segment shows the word twice — once in ASL
(real human), once in NGT (avatar). Timing is matched per-word so both
sides sign in sync.

Inputs:
  - ../public/videos/clips/{word}.mp4  (ASL clips from WLASL_v0.3)
  - /Users/radhikaverma/asl_avatar_prototype/media/avatar_ngt.webm (avatar)
  - We need the avatar's WebM segmented by gloss — the avatar video has
    11 signs over 28s, so each sign gets ~2.5s.
"""
import os, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/Users/radhikaverma/Downloads/Signbridge-main')
CLIPS = ROOT / 'public' / 'videos' / 'clips'
OUT  = ROOT / 'public' / 'videos' / 'asl_ngt_sidebyside.mp4'

W, H = 1280, 720
LW = 640

# (start_s_in_avatar_video, end_s_in_avatar_video, English label, ASL gloss name, NGT gloss name)
# Avatar video timeline (from render_avatar_video.js LESSON):
#   0-3: GOED, 3-6: LICHAAM, 6-9: KIJKEN, 9-12: HART, 12-15: HERSENEN,
#   15-18: BLOED, 18-21: GROEIEN, 21-24: LEVEN, 24-27: DRINKEN,
#   27-30: BLAUW, 30-33: GROEN
# Total recorded: 28s, but the actual signs occupy 0-28s (last 2 are GROEN's tail).
SEGMENTS = [
    ( 0.0,  3.0, 'good / hello',       'good',    'GOED'),
    ( 3.0,  6.0, 'this is your body',   'body',    'LICHAAM'),
    ( 6.0,  9.0, 'look inside',         'body',    'KIJKEN'),
    ( 9.0, 12.0, 'your heart beats',    'heart',   'HART'),
    (12.0, 15.0, 'your brain learns',   'brain',   'HERSENEN'),
    (15.0, 18.0, 'blood flows through', 'blood',   'BLOED'),
    (18.0, 21.0, 'you grow and live',   'grow',    'GROEIEN'),
    (21.0, 24.0, 'you drink water',     'drink',   'DRINKEN'),
    (24.0, 27.0, 'colors of life',      'blue',    'BLAUW'),
    (27.0, 30.0, 'thank you',           'good',    'GROEN'),
]
assert abs(sum(b-a for a,b,_,_,_ in SEGMENTS) - 30.0) < 0.5
print(f'total: {sum(b-a for a,b,_,_,_ in SEGMENTS)}s')

AVATAR_VIDEO = '/Users/radhikaverma/asl_avatar_prototype/media/avatar_ngt.mp4'
TEMP = CLIPS / 'scenes'
TEMP.mkdir(parents=True, exist_ok=True)

# Step 1: extract per-segment avatar clips
print('=== Step 1: extract per-segment avatar clips ===')
for i, (s, e, _, _, _) in enumerate(SEGMENTS):
    out = TEMP / f'ngt_{i:02d}.mp4'
    if out.exists() and out.stat().st_size > 1000:
        continue
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-ss', f'{s}', '-to', f'{e}', '-i', AVATAR_VIDEO,
           '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           str(out)]
    subprocess.run(cmd, check=True, timeout=30)
    print(f'  {out.name}: {e-s:.1f}s')

# Step 2: PIL render left slides
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

BG_LEFT  = (250, 246, 236)
INK      = (34, 31, 27)
MUTED    = (90, 85, 75)
ACCENT_LEFT  = (94, 106, 210)   # blue/purple for "ASL"
ACCENT_RIGHT = (16, 122, 87)    # green for "NGT"

def render_left_slide(text, lang='ASL', gloss=''):
    img = Image.new('RGB', (LW, H), BG_LEFT)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, LW, 50), fill=(28, 30, 38))
    f_e = load_font(11, bold=True)
    d.text((20, 18), f'LEFT — real human signer', fill=(245, 240, 230), font=f_e)
    d.text((LW-100, 18), 'ASL', fill=ACCENT_LEFT, font=f_e)
    d.line((0, 50, LW, 50), fill=(60, 62, 80))
    f_h = load_font(34, bold=True)
    bbox = d.textbbox((0,0), text, font=f_h)
    tw = bbox[2]-bbox[0]
    if tw > LW - 60:
        words = text.split()
        line, lines = '', [text]
        for w in words:
            test = (line + ' ' + w).strip()
            if d.textbbox((0,0), test, font=f_h)[2] > LW - 60:
                lines.append(line); line = w
            else:
                line = test
        if line: lines.append(line)
        y = 80
        for ln in lines[:4]:
            tw = d.textbbox((0,0), ln, font=f_h)[2]
            d.text(((LW-tw)//2, y), ln, fill=INK, font=f_h)
            y += 46
    else:
        d.text(((LW-tw)//2, 230), text, fill=INK, font=f_h)
    f_g = load_font(18, bold=True)
    gloss_label = gloss.upper()
    bbox = d.textbbox((0,0), gloss_label, font=f_g)
    d.text(((LW-(bbox[2]-bbox[0]))//2, H-90), gloss_label, fill=ACCENT_LEFT, font=f_g)
    return img

# Step 3: build each side-by-side segment
print('=== Step 2: build side-by-side segments ===')
ACCENTS = {
    'good':   'Hello / affirmation',
    'body':   'Your physical self',
    'heart':  'Pumps blood',
    'brain':  'Controls the body',
    'blood':  'Carries oxygen',
    'grow':   'Living thing',
    'drink':  'Stay hydrated',
    'blue':   'Colors of life',
}
for i, (s, e, label, asl_gloss, ngt_gloss) in enumerate(SEGMENTS):
    seg_dur = e - s
    asl_clip = CLIPS / f'{asl_gloss}.mp4'
    ngt_clip = TEMP / f'ngt_{i:02d}.mp4'
    if not asl_clip.exists():
        print(f'  seg {i}: NO ASL clip for {asl_gloss}')
        continue
    if not ngt_clip.exists():
        print(f'  seg {i}: NO NGT clip')
        continue
    slide_png = TEMP / f'slide_{i:02d}.png'
    render_left_slide(label, gloss=asl_gloss).save(slide_png)
    seg_out = TEMP / f'seg_{i:02d}.mp4'
    # Build a 1280x720 video: 640x720 left = ASL real person, 640x720 right = NGT avatar
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-stream_loop','-1','-i', str(asl_clip),
           '-i', str(ngt_clip),
           '-filter_complex',
           f'[0:v]scale={LW}:{H}:force_original_aspect_ratio=decrease,'
           f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[asl];'
           f'[1:v]scale={LW}:{H}:force_original_aspect_ratio=decrease,'
           f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[ngt];'
           f'[asl][ngt]hstack=inputs=2,format=yuv420p[outv]',
           '-map','[outv]','-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast','-t',str(seg_dur), str(seg_out)]
    subprocess.run(cmd, check=True, timeout=60)
    print(f'  seg {i}: {label!r} ({seg_dur}s)')

# Step 4: concat all segments
print('=== Step 3: concat ===')
segs = sorted(TEMP.glob('seg_*.mp4'),
              key=lambda p: int(p.stem.split('_')[1]))
list_path = TEMP / 'concat.txt'
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