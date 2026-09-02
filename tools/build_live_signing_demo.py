#!/usr/bin/env python3
"""
Build the 'live signing demo' video:
  - LEFT half  (640x720):  NASA Newton's Second Law — actual video footage
                          (a real person doing the experiment, not slides)
  - RIGHT half (640x720):  3D Eva avatar signing in NGT, looped throughout

This is what the user asked for: a real STEM video on the left doing
something (a NASA astronaut in zero-G pushing a bowling ball), and a
3D avatar on the right that signs in real time.

We crop NASA to the first 30 seconds (the intro/setup section is the most
"action-packed" visual) and loop the avatar's existing recording.
"""
import os, subprocess
from pathlib import Path

ROOT = Path('/Users/radhikaverma/Downloads/Signbridge-main')
OUT = ROOT / 'public' / 'videos' / 'live_signing_demo.mp4'
W, H = 1280, 720
LW = 640

NASA_VIDEO = ROOT / 'public' / 'videos' / 'newtons-second-law.webm'
AVATAR_VIDEO = '/Users/radhikaverma/asl_avatar_prototype/media/avatar_ngt.mp4'
DURATION = 30.0
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

TEMP = Path('/tmp/live_signing_demo')
TEMP.mkdir(parents=True, exist_ok=True)

# 1. Crop NASA to first 30s, scaled to 640x720
print('=== Step 1: crop NASA to 30s, 640x720 ===')
nasa_clip = TEMP / 'nasa_30s.mp4'
if not nasa_clip.exists():
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-t', str(DURATION),
           '-i', str(NASA_VIDEO),
           '-vf', f'scale={LW}:{H}:force_original_aspect_ratio=decrease,'
                 f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
           '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast','-an',
           str(nasa_clip)]
    subprocess.run(cmd, check=True, timeout=120)
print(f'  wrote {nasa_clip}')

# 2. Loop the avatar 30s, scaled to 640x720
print('=== Step 2: loop avatar 30s ===')
avatar_clip = TEMP / 'avatar_30s.mp4'
if not avatar_clip.exists():
    cmd = ['ffmpeg','-y','-loglevel','error',
           '-stream_loop','-1','-i', AVATAR_VIDEO,
           '-t', str(DURATION),
           '-vf', f'scale={LW}:{H}:force_original_aspect_ratio=decrease,'
                 f'pad={LW}:{H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
           '-c:v','libx264','-pix_fmt','yuv420p','-r','30',
           '-preset','ultrafast','-an',
           str(avatar_clip)]
    subprocess.run(cmd, check=True, timeout=120)
print(f'  wrote {avatar_clip}')

# 3. hstack and add a label bar (PIL-rendered because ffmpeg lacks libfreetype)
print('=== Step 3: build side-by-side ===')
from PIL import Image, ImageDraw, ImageFont

# Render a 1280x40 label bar as a PNG
label_png = TEMP / 'label_bar.png'
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

bar = Image.new('RGB', (1280, 40), (13, 14, 21))
d = ImageDraw.Draw(bar)
f_label = load_font(15, bold=True)
d.text((20, 12), "LEFT  -  NASA Newton's Second Law (real STEM experiment)", fill=(245, 240, 230), font=f_label)
d.text((660, 12), "RIGHT  -  3D Eva avatar (NGT signing, looped)", fill=(16, 185, 121), font=f_label)
bar.save(label_png)
print(f'  wrote {label_png}')

# hstack first, then overlay the label bar on top
filter_complex = (
    f'[0:v]format=yuv420p[left];'
    f'[1:v]format=yuv420p[right];'
    f'[left][right]hstack=inputs=2,format=yuv420p[main];'
    f'[main]pad=iw:ih+40:0:0:color=0x0d0e15,format=yuv420p[mainp];'
    f'[2:v]format=yuv420p[bar];'
    f'[mainp][bar]overlay=0:0[outv]'
)
cmd = ['ffmpeg','-y','-loglevel','error',
       '-i', str(nasa_clip),
       '-i', str(avatar_clip),
       '-loop','1','-t',str(DURATION),'-i', str(label_png),
       '-filter_complex', filter_complex,
       '-map','[outv]','-c:v','libx264','-crf','22','-preset','fast',
       '-pix_fmt','yuv420p','-r','30','-movflags','+faststart',
       str(OUT)]
subprocess.run(cmd, check=True, timeout=180)
d = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', str(OUT)],
                   capture_output=True, text=True).stdout.strip()
print(f'wrote {OUT.name}  duration: {d}s  size: {os.path.getsize(OUT):,} bytes')