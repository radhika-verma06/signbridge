#!/usr/bin/env python3
"""
Build side-by-side lesson videos for SignBridge.

Each lesson is composed of multiple segments. For each segment we:
  1. Render a PIL slide with the lesson title + the spoken English word.
  2. Pull a real human ASL signing clip from the WLASL_v0.3 word index
     (bundled with the SignAvatars repo).
  3. hstack them 640+640 = 1280 wide.

The clip is looped with `ffmpeg -stream_loop -1` so the signer appears
to repeat the sign throughout the segment.

Run:  /usr/bin/python3 tools/build_sidebyside.py
"""
import os, json, urllib.request, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/Users/radhikaverma/Downloads/Signbridge-main')
CLIPS = ROOT / 'public' / 'videos' / 'clips'
CLIPS.mkdir(parents=True, exist_ok=True)
OUT_DIR = ROOT / 'public' / 'videos'

W, H = 1280, 720
LW = 640

# Each LESSON is a list of (start_s, end_s, slide_text, gloss_word_or_None).
# end-start sums to ~60s per lesson. 'gloss_word' may be None for intro/outro
# scenes that show a title card only.
LESSONS = {
    'inside_you': [
        ( 0.0,  5.5, "Hello",                                 'good'),
        ( 5.5, 11.0, "This is your body",                     'body'),
        (11.0, 17.0, "Look inside your body",                 'body'),
        (17.0, 23.0, "Your heart beats",                      'heart'),
        (23.0, 29.5, "Your brain learns",                     'brain'),
        (29.5, 36.0, "Blood flows through you",               'blood'),
        (36.0, 41.5, "You grow and live",                     'grow'),
        (41.5, 47.0, "You drink water",                       'drink'),
        (47.0, 52.5, "Earth, sun, moon",                      'earth'),
        (52.5, 57.0, "Blue and green",                        'blue'),
        (57.0, 60.0, "Thank you",                             'good'),
    ],
    'how_you_move': [
        ( 0.0,  3.5, "How you move",                          None),
        ( 3.5,  8.0, "You see with your eyes",               'see'),
        ( 8.0, 12.5, "You hear with your ears",               'hear'),
        (12.5, 17.5, "You think with your brain",             'think'),
        (17.5, 22.5, "You feel with your skin",               'feel'),
        (22.5, 27.5, "You speak with your mouth",             'speak'),
        (27.5, 31.5, "You listen to learn",                   'listen'),
        (31.5, 35.5, "You walk on your legs",                 'walk'),
        (35.5, 39.0, "You run for fun",                       'run'),
        (39.0, 42.5, "You eat food",                          'eat'),
        (42.5, 46.0, "You drink water",                       'drink'),
        (46.0, 49.5, "You sleep to rest",                     'sleep'),
        (49.5, 53.0, "You breathe all day",                   'breathe'),
        (53.0, 57.0, "Your body is amazing",                  'good'),
    ],
}

# ====== 1. word -> URL map ======
print('Loading WLASL word index...')
with open('/tmp/wlasl_map.json') as f:
    wlasl = json.load(f)
WORD_URLS = {}
for entry in wlasl:
    g = entry['gloss']
    chosen = None
    for inst in entry.get('instances', []):
        u = inst['url']
        if 'aslbrick' in u: chosen = u; break
    if not chosen:
        for inst in entry.get('instances', []):
            u = inst['url']
            if 'signstock' in u or 'spreadthesign' in u: chosen = u; break
    if not chosen:
        for inst in entry.get('instances', []):
            u = inst['url']
            if 'asldeafined' in u or 'startasl' in u or 's3-us-west' in u: chosen = u; break
    if chosen: WORD_URLS[g] = chosen

# ====== 2. download clips (across all lessons) ======
all_words = sorted({w for lesson in LESSONS.values()
                    for _, _, _, w in lesson if w})
print(f'All lessons use {len(all_words)} unique words')
for w in all_words:
    out = CLIPS / f'{w}.mp4'
    if out.exists() and out.stat().st_size > 1000: continue
    url = WORD_URLS.get(w)
    if not url: print(f'  ✗ {w}: no WLASL source'); continue
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as r: data = r.read()
        with open(out, 'wb') as f: f.write(data)
        print(f'  ✓ {w}: {len(data):,} bytes')
    except Exception as e: print(f'  ✗ {w}: {e}')

# ====== 3. PIL text overlays ======
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
GREEN    = (16, 122, 87)

def render_left_slide(text, sub=''):
    img = Image.new('RGB', (LW, H), BG_LEFT)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, LW, 50), fill=(28, 30, 38))
    f_e = load_font(11, bold=True)
    d.text((20, 18), 'LESSON · INSIDE YOU', fill=(245, 240, 230), font=f_e)
    d.text((LW-100, 18), 'CAPTIONED', fill=(160, 113, 255), font=f_e)
    d.line((0, 50, LW, 50), fill=(60, 62, 80))
    f_h = load_font(36, bold=True)
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
        y = 90
        for ln in lines[:3]:
            tw = d.textbbox((0,0), ln, font=f_h)[2]
            d.text(((LW-tw)//2, y), ln, fill=INK, font=f_h)
            y += 50
    else:
        d.text(((LW-tw)//2, 250), text, fill=INK, font=f_h)
    if sub:
        f_a = load_font(18, bold=True)
        ab = d.textbbox((0,0), sub, font=f_a)
        d.text(((LW-ab[2]+ab[0])//2, H-110), sub, fill=GREEN, font=f_a)
    return img

# ====== 4. Build each lesson ======
def find_clip(word):
    p = CLIPS / f'{word}.mp4'
    if p.exists() and p.stat().st_size > 1000: return p
    return None

def build_segment(lesson_name, idx, start, end, text, word, accent):
    seg_dur = end - start
    seg_out = CLIPS / f'{lesson_name}_{idx:02d}.mp4'
    clip = find_clip(word) if word else None
    if word and not clip:
        print(f'  {lesson_name}/{idx}: NO clip for {word}, substituting caption')
        clip = None
    if not clip:
        # intro/outro: caption only
        cap_png = CLIPS / f'caption_{lesson_name}_{idx:02d}.png'
        render_left_slide(text, sub=accent).save(cap_png)
        cmd = ['ffmpeg','-y','-loglevel','error',
               '-loop','1','-t',str(seg_dur),'-i', str(cap_png),
               '-f','lavfi','-t',str(seg_dur),'-i','color=c=0x101121:s=640x720',
               '-filter_complex',
               f'[0:v]format=yuv420p[left];'
               f'[1:v]format=yuv420p[right];'
               f'[left][right]hstack=inputs=2,format=yuv420p[outv]',
               '-map','[outv]','-c:v','libx264','-pix_fmt','yuv420p','-r','30',
               '-preset','ultrafast','-t',str(seg_dur), str(seg_out)]
        subprocess.run(cmd, check=True, timeout=60)
        return seg_out
    slide_png = CLIPS / f'slide_{lesson_name}_{idx:02d}.png'
    render_left_slide(text, sub=accent).save(slide_png)
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
    print(f'  {lesson_name}/{idx}: {text!r} ({word})')
    return seg_out

def concat_segs(lesson_name, segs, output):
    list_path = CLIPS / f'concat_{lesson_name}.txt'
    with open(list_path, 'w') as f:
        for s in segs: f.write(f"file '{s.name}'\n")
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-f','concat','-safe','0','-i', str(list_path),
           '-c:v','libx264','-crf','22','-preset','fast',
           '-pix_fmt','yuv420p','-r','30','-movflags','+faststart',
           str(output)]
    subprocess.run(cmd, check=True, timeout=120)
    d = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', str(output)],
                       capture_output=True, text=True).stdout.strip()
    print(f'wrote {output.name}  duration: {d}s  size: {os.path.getsize(output):,} bytes')

ACCENTS = {
    'inside_you': {
        'good':'Lesson 01', 'body':'Human body', 'heart':'Pumps blood',
        'brain':'Controls body', 'blood':'Oxygen carrier', 'grow':'Living thing',
        'drink':'Stay hydrated', 'earth':'Our home', 'blue':'Colors of life',
    },
    'how_you_move': {
        'see':  'Eyes take in light',
        'hear': 'Ears detect sound',
        'think':'Brain processes',
        'feel': 'Skin senses touch',
        'speak':'Mouth forms words',
        'listen':'Ears attend',
        'walk': 'Legs carry you',
        'run':  'Heart pumps faster',
        'eat':  'Body takes in fuel',
        'drink': 'Body takes in water',
        'sleep':'Body restores',
        'breathe':'Lungs exchange air',
        'good': 'You are amazing',
    },
}

for lesson_name, segments in LESSONS.items():
    print(f'\n=== Building {lesson_name} ===')
    segs = []
    for i, (start, end, text, word) in enumerate(segments):
        accent = ACCENTS[lesson_name].get(word, '')
        out = build_segment(lesson_name, i, start, end, text, word, accent)
        segs.append(out)
    output = OUT_DIR / f'{lesson_name}.mp4'
    concat_segs(lesson_name, segs, output)