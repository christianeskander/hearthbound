"""Builds the PWA icons from the game's own hero layers (front stance, frame 9)."""
from PIL import Image, ImageDraw
import os
H = os.path.join(os.path.dirname(__file__), '..', 'public')
layers = ['body_male', 'pants_m', 'shoes_m', 'shirt_long_m', 'leather_m', 'head_male', 'eyes', 'hair_messy']
fr = Image.new('RGBA', (64, 64))
for l in layers:
    p = f'{H}/assets/hero/{l}.png'
    if os.path.exists(p):
        im = Image.open(p).convert('RGBA')
        fr.alpha_composite(im.crop((9 * 64, 0, 10 * 64, 64)))
bust = fr.crop((16, 6, 48, 38))  # 32x32 head and shoulders
for size in (192, 512):
    ic = Image.new('RGBA', (size, size), (23, 18, 15, 255))
    d = ImageDraw.Draw(ic)
    r = size * 0.42
    d.ellipse((size / 2 - r, size * 0.56 - r, size / 2 + r, size * 0.56 + r), fill=(58, 40, 26, 255))
    d.ellipse((size / 2 - r * .7, size * 0.62 - r * .7, size / 2 + r * .7, size * 0.62 + r * .7), fill=(120, 66, 28, 255))
    k = int(size * 0.8 / 32)
    b = bust.resize((32 * k, 32 * k), Image.NEAREST)
    ic.alpha_composite(b, ((size - 32 * k) // 2, size - 32 * k - size // 40))
    ic.convert('RGB').save(f'{H}/icons/icon-{size}.png', optimize=True)
print('ok')
