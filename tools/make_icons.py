"""Builds the PWA icons from the game's own art: the hero's front stance (frame 9)
over a hearth glow. Separate 'any' and 'maskable' sets (maskable keeps everything in
the centre 80% safe zone), a 180px Apple touch icon, a monochrome notification badge,
and small pixel icons for the home-screen shortcuts."""
from PIL import Image, ImageDraw
import os, re
H = os.path.join(os.path.dirname(__file__), '..', 'public')
OUT = f'{H}/icons'
os.makedirs(OUT, exist_ok=True)
layers = ['body_male', 'pants_m', 'shoes_m', 'shirt_long_m', 'leather_m', 'head_male', 'eyes', 'hair_messy']
fr = Image.new('RGBA', (64, 64))
for l in layers:
    p = f'{H}/assets/hero/{l}.png'
    if os.path.exists(p):
        fr.alpha_composite(Image.open(p).convert('RGBA').crop((9 * 64, 0, 10 * 64, 64)))
bust = fr.crop((16, 6, 48, 38))  # 32x32 head and shoulders
BG = (23, 18, 15, 255)

def tile(size, content=0.8, rounded=False):
    ic = Image.new('RGBA', (size, size), (0, 0, 0, 0) if rounded else BG)
    d = ImageDraw.Draw(ic)
    if rounded:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=BG)
    c = size / 2
    r = size * 0.42 * content / 0.8
    d.ellipse((c - r, size * 0.56 - r, c + r, size * 0.56 + r), fill=(58, 40, 26, 255))
    d.ellipse((c - r * .7, size * 0.62 - r * .7, c + r * .7, size * 0.62 + r * .7), fill=(120, 66, 28, 255))
    k = max(1, int(size * content / 32))
    b = bust.resize((32 * k, 32 * k), Image.NEAREST)
    bottom = size - (size * (1 - content) / 2 if content < 0.8 else size / 40)
    ic.alpha_composite(b, ((size - 32 * k) // 2, int(bottom - 32 * k)))
    return ic

for size in (192, 512):
    tile(size, 0.8, rounded=True).save(f'{OUT}/icon-{size}.png', optimize=True)          # purpose: any
    tile(size, 0.62).convert('RGB').save(f'{OUT}/maskable-{size}.png', optimize=True)     # purpose: maskable
tile(180, 0.74).convert('RGB').save(f'{OUT}/apple-touch-icon.png', optimize=True)
tile(32, 0.8, rounded=True).save(f'{OUT}/favicon-32.png', optimize=True)

# pixel icons, read from the UI's own icon set
src = open(os.path.join(os.path.dirname(__file__), '..', 'src', 'ui', 'icons.tsx')).read()
PAL = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) + (255,) for k, v in re.findall(r"(\w): '(#[0-9a-f]{6})'", src)}
GRID = {m.group(1): re.findall(r"'([^']{8})'", m.group(2)) for m in re.finditer(r"\n  (\w+): \[([^\]]+)\]", src)}

def pix(name, size, bg=True, mono=None):
    g = GRID[name]
    im = Image.new('RGBA', (size, size), BG if bg else (0, 0, 0, 0))
    if bg:
        im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse((0, 0, size - 1, size - 1), fill=(42, 33, 27, 255))
    k = int(size * 0.62 / 8)
    off = (size - 8 * k) // 2
    d = ImageDraw.Draw(im)
    for y, row in enumerate(g):
        for x, ch in enumerate(row):
            if ch == '.' or ch not in PAL: continue
            col = mono if mono else PAL[ch]
            if mono and ch == 'K': continue
            d.rectangle((off + x * k, off + y * k, off + (x + 1) * k - 1, off + (y + 1) * k - 1), fill=col)
    return im

for name, file in [('flame', 'sc-next'), ('clock', 'sc-focus'), ('leaf', 'sc-tiny'), ('book', 'sc-week')]:
    pix(name, 96).save(f'{OUT}/{file}.png', optimize=True)
# Android shows the notification badge as a white silhouette
pix('flame', 96, bg=False, mono=(255, 255, 255, 255)).save(f'{OUT}/badge-96.png', optimize=True)
print('ok')
