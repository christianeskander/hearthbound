#!/usr/bin/env python3
"""Hearthbound asset pipeline.

Cuts only the frames the game uses out of the licensed source sheets and writes
small PNG strips into public/assets. Source files are fetched once into a cache
directory OUTSIDE the repo (default /tmp/hb-src); see CREDITS.md for every
source URL, author and licence.

Usage: python3 tools/build_assets.py [--src /tmp/hb-src]
"""
import json, math, os, sys, urllib.request, zipfile, io
from collections import Counter
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets')
SRC = sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else '/tmp/hb-src'
LPC = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/'
OGA = 'https://opengameart.org/sites/default/files/'

def fetch(url, name):
    os.makedirs(SRC, exist_ok=True)
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        print('fetch', url)
        with urllib.request.urlopen(url) as r, open(p, 'wb') as f:
            f.write(r.read())
    return p

def from_zip(zipname, url, member_suffix):
    z = zipfile.ZipFile(fetch(url, zipname))
    for n in z.namelist():
        if n.endswith(member_suffix) and '__MACOSX' not in n:
            return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
    raise KeyError(member_suffix)

def clean(im, hard):
    """Drop any magenta key colour and zero the colour of transparent pixels,
    so nothing can bleed a fringe when scaled. Sprites (hard=True) are made
    strictly 1-bit alpha; painted backdrops keep their soft light layers."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if (r > 240 and g < 16 and b > 240) or a == 0 or (hard and a < 128):
                px[x, y] = (0, 0, 0, 0)
            elif hard:
                px[x, y] = (r, g, b, 255)
    return im

def save(im, rel):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im = clean(im, not rel.startswith('bg/'))
    im.save(p, optimize=True)
    return p

# ---------------------------------------------------------------- hero layers
# LPC walk sheets are 9 cols x 4 rows of 64px: rows = up, left, down, right.
# We keep the right-facing row (stand + 8 walk frames) and append the
# front-facing stand as frame 9 -> 640x64 strip.
HERO = {
    'body_male': 'body/bodies/male', 'body_female': 'body/bodies/female',
    'head_male': 'head/heads/human/male', 'head_female': 'head/heads/human/female',
    'eyes': 'eyes/human/adult/default',
    'hair_plain': 'hair/plain/adult', 'hair_ponytail': 'hair/ponytail/adult/fg',
    'hair_ponytail_bg': 'hair/ponytail/adult/bg', 'hair_bob': 'hair/bob/adult',
    'hair_long': 'hair/long/adult', 'hair_messy': 'hair/messy1/adult',
    'hair_pixie': 'hair/pixie/adult', 'hair_buzz': 'hair/buzzcut/adult',
    'hair_bangs': 'hair/bangs/adult',
    'shirt_long_m': 'torso/clothes/longsleeve/longsleeve/male', 'shirt_long_f': 'torso/clothes/longsleeve/longsleeve/female',
    'shirt_short_m': 'torso/clothes/shortsleeve/shortsleeve/male', 'shirt_short_f': 'torso/clothes/shortsleeve/shortsleeve/female',
    'leather_m': 'torso/armour/leather/male', 'leather_f': 'torso/armour/leather/female',
    'chain_m': 'torso/chainmail/male', 'chain_f': 'torso/chainmail/female',
    'plate_m': 'torso/armour/plate/male', 'plate_f': 'torso/armour/plate/female',
    'belt_m': 'torso/waist/belt_leather/male', 'belt_f': 'torso/waist/belt_leather/female',
    'pants_m': 'legs/pants/male', 'pants_f': 'legs/pants/thin',
    'skirt_f': 'legs/skirts/plain/thin', 'skirt_m': 'legs/skirts/plain/male',
    'greaves_m': 'legs/armour/plate/male', 'greaves_f': 'legs/armour/plate/thin',
    'shoes_m': 'feet/shoes/basic/male', 'shoes_f': 'feet/shoes/basic/thin',
    'boots_m': 'feet/boots/basic/male', 'boots_f': 'feet/boots/basic/thin',
    'sabatons_m': 'feet/armour/plate/male', 'sabatons_f': 'feet/armour/plate/thin',
    'cape_fg': 'cape/solid/fg', 'cape_bg': 'cape/solid/bg',
    'hood': 'hat/cloth/hood/adult', 'cap': 'hat/cloth/leather_cap/adult',
    'cap_feather': 'hat/cloth/leather_cap/feather/adult', 'kettle': 'hat/helmet/kettle/adult',
}

def build_hero():
    for key, path in HERO.items():
        sheet = Image.open(fetch(LPC + path + '/walk.png', 'lpc_' + path.replace('/', '_') + '.png')).convert('RGBA')
        strip = Image.new('RGBA', (640, 64))
        strip.paste(sheet.crop((0, 192, 576, 256)), (0, 0))
        strip.paste(sheet.crop((0, 128, 64, 192)), (576, 0))
        save(strip, 'hero/%s.png' % key)

# ---------------------------------------------------------------- familiars
def cells(sheet, w, h, row, cols, col0=0):
    out = Image.new('RGBA', (w * len(cols), h))
    for i, c in enumerate(cols):
        out.paste(sheet.crop(((col0 + c) * w, row * h, (col0 + c + 1) * w, (row + 1) * h)), (i * w, 0))
    return out

def shrink_frame(frame, f):
    """Pixel-art downscale: each target pixel takes the most common opaque
    source colour in its footprint (slightly favouring dark outline colours),
    so the palette stays exact and edges stay 1-bit."""
    W, H = frame.size
    w, h = max(1, round(W * f)), max(1, round(H * f))
    src = frame.load(); out = Image.new('RGBA', (w, h)); o = out.load()
    for y in range(h):
        for x in range(w):
            x0 = int(x / f); x1 = max(x0 + 1, int(math.ceil((x + 1) / f)))
            y0 = int(y / f); y1 = max(y0 + 1, int(math.ceil((y + 1) / f)))
            cols = [src[i, j] for i in range(x0, min(x1, W)) for j in range(y0, min(y1, H))]
            op = [c for c in cols if c[3] >= 128]
            if len(op) * 2.2 < len(cols):
                continue
            cnt = Counter(c[:3] for c in op)
            o[x, y] = max(cnt.items(), key=lambda kv: kv[1] + (0.6 if sum(kv[0]) < 150 else 0))[0] + (255,)
    return out

def shrink(strip, cell, f):
    """Scale a strip of square cells to true size next to a 47px-tall hero."""
    n = strip.width // cell
    c2 = round(cell * f)
    out = Image.new('RGBA', (c2 * n, c2))
    for i in range(n):
        out.paste(shrink_frame(strip.crop((i * cell, 0, (i + 1) * cell, cell)), f), (i * c2, 0))
    return out

def scale2x(im):
    """Scale2x/EPX: doubles a sprite while rounding its stair-steps, so a
    32px slime can stand at boss size on the same 1x pixel grid as the hero."""
    W, Hh = im.size
    src = im.load(); out = Image.new('RGBA', (W * 2, Hh * 2)); o = out.load()
    g = lambda x, y: src[min(max(x, 0), W - 1), min(max(y, 0), Hh - 1)]
    for y in range(Hh):
        for x in range(W):
            P = g(x, y); A = g(x, y - 1); B = g(x + 1, y); C = g(x - 1, y); D = g(x, y + 1)
            e0 = C if (C == A and C != D and A != B) else P
            e1 = B if (A == B and A != C and B != D) else P
            e2 = C if (D == C and D != B and C != A) else P
            e3 = B if (B == D and B != A and D != C) else P
            o[2 * x, 2 * y] = e0; o[2 * x + 1, 2 * y] = e1; o[2 * x, 2 * y + 1] = e2; o[2 * x + 1, 2 * y + 1] = e3
    return out

# True-size factors (the LPC animals are drawn larger than life next to LPC people).
PET_SCALE = {'soot': 0.75, 'bramble': 0.6, 'pip': 0.5}

def build_pets():
    cat = Image.open(fetch(OGA + 'cat_0.png', 'oga_cat_0.png')).convert('RGBA')
    # 4 coat colours x 4 columns; grey-black coat is columns 12..15.
    save(shrink(cells(cat, 32, 32, 0, [0, 1, 2, 3], 12), 32, PET_SCALE['soot']), 'pets/soot.png')
    dog = Image.open(fetch(OGA + 'dog_2.png', 'oga_dog_2.png')).convert('RGBA')
    save(cells(dog, 32, 32, 0, [0, 1, 2, 3], 4), 'pets/hazel.png')
    animals = OGA + 'lpc_animals_2022_v1.1.zip'
    fox = from_zip('oga_lpc_animals_2022.zip', animals, 'individual creature spritesheets/fox, woods.png')
    save(shrink(cells(fox, 64, 64, 1, [0, 1, 2, 3]), 64, PET_SCALE['bramble']), 'pets/bramble.png')
    mouse = from_zip('oga_lpc_animals_2022.zip', animals, 'individual creature spritesheets/mouse, gray.png')
    save(shrink(cells(mouse, 32, 32, 1, [0, 1, 2]), 32, PET_SCALE['pip']), 'pets/pip.png')
    bird = Image.open(fetch(OGA + 'bird_2_black.png', 'oga_bird_2_black.png')).convert('RGBA')
    fly = cells(bird, 32, 32, 3, [0, 1, 2])
    walk = cells(bird, 32, 32, 7, [0, 1, 2])
    both = Image.new('RGBA', (192, 32)); both.paste(fly, (0, 0)); both.paste(walk, (96, 0))
    save(both, 'pets/inkling.png')
    # bosses
    slime = Image.open(fetch(OGA + 'slime%20spritesheet%20calciumtrice_0.png', 'oga_slime_calciumtrice.png')).convert('RGBA')
    save(scale2x(clean(slime.crop((0, 0, 320, 160)), True)), 'bosses/slime.png')  # green: idle, gesture, walk, attack, death
    rat = from_zip('oga_lpc_animals_2022.zip', animals, 'individual creature spritesheets/giant rat (Sevarihk).png')
    save(cells(rat, 80, 64, 2, list(range(12))), 'bosses/rat.png')  # walk 0-3, attack 4-7, die 8-11

if __name__ == '__main__':
    build_hero()
    build_pets()
    print('ok')

# ---------------------------------------------------------------- locations
# Every layer is written as a horizontally tileable strip exactly H px tall, so
# the hall can place them all at y=0 and only vary the scroll factor.
H = 160

def canvas(w):
    return Image.new('RGBA', (w, H))

def place(img, y, w=None):
    c = canvas(w or img.width)
    c.alpha_composite(img, (0, y))
    return c

def tile_x(img, w):
    out = Image.new('RGBA', (w, img.height))
    for x in range(0, w, img.width):
        out.alpha_composite(img, (x, 0))
    return out

def zipimg(zipname, member):
    z = zipfile.ZipFile(os.path.join(SRC, zipname))
    for n in z.namelist():
        if n.endswith(member) and '__MACOSX' not in n:
            return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
    raise KeyError(member)

def tint(img, rgb, k):
    """Blend opaque pixels toward rgb by k (0..1); keeps alpha untouched."""
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (int(r + (rgb[0] - r) * k), int(g + (rgb[1] - g) * k), int(b + (rgb[2] - b) * k), a)
    return out

def country_ground():
    ts = zipimg('country-platform-files.zip', 'layers/country-platform-tileset.png')
    return ts.crop((48, 104, 96, 160))  # grass verge, road, hedge (56px tall)

def build_locations():
    fetch(OGA + 'parallax_forest_pack.zip', 'parallax_forest_pack.zip')
    fetch(OGA + 'parallax_mountain_pack.zip', 'parallax_mountain_pack.zip')
    fetch(OGA + 'country-platform-files.zip', 'country-platform-files.zip')
    fetch(OGA + 'ocean_view_files.zip', 'ocean_view_files.zip')
    g = country_ground()

    # Old Wood (ansimuz, CC0): native 272x160 layers.
    for n in ['back-trees', 'lights', 'middle-trees', 'front-trees']:
        save(zipimg('parallax_forest_pack.zip', 'parallax-forest-%s.png' % n), 'bg/wood/%s.png' % n)

    # Ridge at dusk (ansimuz, CC0) + the country road tinted to dusk.
    for n in ['bg', 'montain-far', 'mountains', 'trees']:
        save(zipimg('parallax_mountain_pack.zip', 'parallax-mountain-%s.png' % n), 'bg/ridge/%s.png' % n)
    save(place(tint(tile_x(g, 48), (60, 40, 70), 0.55), H - g.height), 'bg/ridge/ground.png')

    # North Road (ansimuz country side, CC0)
    back = zipimg('country-platform-files.zip', 'layers/country-platform-back.png')
    save(back.crop((0, 224 - H, 384, 224)), 'bg/road/back.png')
    forest = zipimg('country-platform-files.zip', 'layers/country-platform-forest.png')
    save(place(forest.crop((0, 85, 160, 224)), H - 139 - 14), 'bg/road/forest.png')
    ts = zipimg('country-platform-files.zip', 'layers/country-platform-tileset.png')
    tree = ts.crop((44, 16, 160, 112))
    trees = canvas(480); trees.alpha_composite(tree, (60, H - g.height - 96 + 14)); trees.alpha_composite(tree, (300, H - g.height - 96 + 14))
    save(trees, 'bg/road/tree.png')
    save(place(g, H - g.height), 'bg/road/ground.png')

    # Coast (ansimuz Warped Ocean View, CC0): sky+sea, clouds, the cliff road.
    od = 'Layers/Day/'
    ob = zipimg('ocean_view_files.zip', od + 'Back.png')
    save(ob.crop((0, 30, 336, 30 + H)), 'bg/coast/back.png')
    om = zipimg('ocean_view_files.zip', od + 'Middle.png')
    save(place(om.crop((0, 105, 144, 240)), 62), 'bg/coast/sea.png')
    oc = zipimg('ocean_view_files.zip', od + 'Clouds.png')
    save(place(oc.crop((0, 0, 320, 102)), -40), 'bg/coast/clouds.png')
    save(place(g, H - g.height), 'bg/coast/ground.png')

    # Inn Yard (ansimuz Gothicvania Town, CC0). The town's own street: sky,
    # far roofs, then houses and yard props on the cobbled ground tile.
    gv = os.path.join(SRC, 'gothicvania')
    if not os.path.isdir(os.path.join(gv, 'props-sliced')):
        z = zipfile.ZipFile(fetch(OGA + 'gothicvania-town-files.zip', 'gothicvania-town-files.zip'))
        base = 'GothicVania-town-files/PNG/environment/'
        want = {'layers/background.png': 'background.png', 'layers/middleground.png': 'middleground.png',
                'layers/sliced-tileset/ground.png': 'sliced-tileset/ground.png'}
        for n in ['well', 'barrel', 'street-lamp', 'wagon', 'crate-stack', 'crate', 'sign']:
            want['props-sliced/%s.png' % n] = 'props-sliced/%s.png' % n
        for member, dest in want.items():
            out = os.path.join(gv, dest); os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'wb').write(z.read(base + member))
    bgi = Image.open(os.path.join(gv, 'background.png')).convert('RGBA')
    save(bgi.crop((0, 40, 384, 40 + H)), 'bg/inn/sky.png')
    mid = Image.open(os.path.join(gv, 'middleground.png')).convert('RGBA')
    save(place(mid.crop((0, 60, 384, 288)), H - 228 + 12), 'bg/inn/town.png')
    ground = Image.open(os.path.join(gv, 'sliced-tileset', 'ground.png')).convert('RGBA').crop((0, 9, 16, 48))
    gy = H - ground.height  # top of cobbles
    def prop(n):
        return Image.open(os.path.join(gv, 'props-sliced', n + '.png')).convert('RGBA')
    street = canvas(640)
    x = 8
    for n, gap in [('well', 46), ('barrel', 4), ('barrel', 52), ('street-lamp', 60), ('wagon', 50), ('crate-stack', 8), ('crate', 70), ('sign', 60)]:
        p = prop(n)
        street.alpha_composite(p, (x, gy + 3 - p.height))
        x += p.width + gap
    street.alpha_composite(tile_x(ground, 640), (0, gy))
    save(street, 'bg/inn/street.png')

if __name__ == '__main__':
    build_locations()

# ---------------------------------------------------------------- v2 foes
def build_bosses_v2():
    """The four v2 foes. Slimes: Calciumtrice (CC-BY 3.0), blue rows 5-9 and red rows
    10-14 of the same sheet as the Slime of Later. Mushroom walker (fly amanita) and the
    black bear: LPC animals 2022, Sevarihk & tapatilorenzo (CC-BY 4.0)."""
    slime = Image.open(fetch(OGA + 'slime%20spritesheet%20calciumtrice_0.png', 'oga_slime_calciumtrice.png')).convert('RGBA')
    save(scale2x(clean(slime.crop((0, 160, 320, 320)), True)), 'bosses/drift.png')  # blue
    save(scale2x(clean(slime.crop((0, 320, 320, 480)), True)), 'bosses/gleam.png')  # red
    animals = OGA + 'lpc_animals_2022_v1.1.zip'
    mush = from_zip('oga_lpc_animals_2022.zip', animals, 'individual creature spritesheets/mushroom walker, fly amanita (Sevarihk).png')
    save(scale2x(clean(cells(mush, 32, 32, 1, [0, 1, 2, 3]), True)), 'bosses/maybe.png')  # walk left, 4 frames, 64px
    bear = from_zip('oga_lpc_animals_2022.zip', animals, 'individual creature spritesheets/bear, black.png')
    walk = cells(clean(bear, True), 64, 64, 2, [0, 1, 2, 3, 4])
    die = cells(clean(bear, True), 64, 64, 10, [0, 1, 2, 3])
    both = Image.new('RGBA', (64 * 9, 64)); both.paste(walk, (0, 0)); both.paste(die, (320, 0))
    save(both, 'bosses/weight.png')  # walk 0-4, lie down 5-8

if __name__ == '__main__':
    build_bosses_v2()
