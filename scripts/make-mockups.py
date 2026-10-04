"""Builds the photographic device mockups for the software projects (listing picture and detail-page hero).

Each project's cover screenshot is mapped onto the screen of a real photo with a perspective (homography) transform,
then given the screen's lighting: a brightness/tint match to the room, slight edge falloff, a soft glare, the
photo's focus blur and grain. The result is cropped to 16:10 and written to the project's image folder
(src/assets/images/<slug>/) as `00-mockup.jpg` (referenced by `mockup:` in its index.yaml).

Photos (Unsplash License, free to use; credited in the README) are kept, resized to 2400px wide, in
src/assets/images/mockup-scenes/:
  stocksense-office.jpg  Dillon Shook      https://unsplash.com/photos/xbFX7qCoAqI
  jomlah-cafe.jpg        Alex Knight       https://unsplash.com/photos/j4uuKnN43_M
  fuzzy-study.jpg        Clay Banks        https://unsplash.com/photos/TQYTWfN1b7M
  fixer-hand.jpg         Jakub Zerdzicki   https://unsplash.com/photos/jSQCLQA99Og
  primo-meeting-room.jpg Devin Pickell     https://unsplash.com/photos/1eRS74C-alQ

Screen geometry is measured on those 2400px files (scripts zoomed in on each corner):
  `glass` is the quad of the screen glass (TL, TR, BR, BL; for a lit screen it is the lit area itself; for the phone it
  is the tangent quad of its rounded screen). `display` is the active display inside the glass, in the glass's own
  normalised coordinates (u0, v0, u1, v1), taken from the laptop's published bezel sizes. It is mapped through the
  same homography, so the bezels foreshorten correctly.

Usage: python scripts/make-mockups.py            (all projects)
       python scripts/make-mockups.py stocksense (one)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / 'src' / 'assets' / 'images'  # one subfolder per project
PHOTOS = IMAGES / 'mockup-scenes'
SS = 2  # supersampling factor for the warp and the screen mask

SCENES = {
    # Dark StockSense dashboard on a space-grey 15" MacBook Pro, three-quarter view, bright office by a window.
    'stocksense': dict(
        photo='stocksense-office.jpg',
        glass=[(912.3, 347.0), (1874.6, 378.5), (1745.0, 1189.0), (797.0, 1032.5)],
        # 15" MacBook Pro (2016-19): glass about 347 x 226 mm, display 331.2 x 207 mm, top bezel ~11 mm.
        display=(7.9 / 347, 11 / 226, 339.1 / 347, 218 / 226),
        cover='stocksense/01-dashboard.png', fit='cover',
        gain=0.97, tint=(1.0, 1.0, 1.0), glare=0.07, glare_from='left', blur=0.55, grain=2.2,
        crop=(150, 150, 2310, 1500), grade=dict(brightness=0.86, color=0.9, contrast=1.02),
    ),
    # Light JomLah home page on a 13" MacBook Pro, front view, café counter with an espresso.
    'jomlah': dict(
        photo='jomlah-cafe.jpg',
        glass=[(789.0, 375.5), (1718.5, 378.0), (1720.0, 986.5), (786.0, 988.0)],
        # 13" MacBook Pro (Retina): glass about 312 x 208 mm, display 286.5 x 179 mm, top bezel ~11 mm.
        display=(12.75 / 312, 11 / 208, 299.25 / 312, 190 / 208),
        cover='jomlah/01-home.png', fit='cover',
        gain=0.9, tint=(1.0, 0.985, 0.95), glare=0.06, glare_from='left', blur=0.6, grain=2.6,
        crop=(160, 0, 2240, 1300), grade=dict(brightness=0.9, color=0.92, contrast=1.0),
    ),
    # Fuzzy Logic result chart on an iMac on a study desk at night, lit by a desk lamp.
    'fuzzy-logic': dict(
        photo='fuzzy-study.jpg',
        glass=[(626.6, 367.0), (1778.7, 367.0), (1769.3, 1014.0), (635.3, 1009.0)],
        display=(0, 0, 1, 1), grow=1.2,
        cover='fuzzy-logic/02-calibration.png', fit='contain', pad=0.05,
        gain=0.86, tint=(1.0, 0.97, 0.9), glare=0.035, glare_from='right', blur=0.6, grain=2.4,
        crop=(160, 130, 2240, 1430), grade=dict(brightness=1.0, color=1.0, contrast=1.0),
    ),
    # Fixer home screen on an iPhone held in a hand, in front of plants.
    'fixer': dict(
        photo='fixer-hand.jpg',
        glass=[(1191.2, 379.0), (1596.7, 368.6), (1559.7, 1282.8), (1140.1, 1229.7)],
        display=(0, 0, 1, 1), phone=True, tab_bar=727 / 805,
        cover='fixer/01-home.png', fit='cover',
        gain=0.93, tint=(1.0, 1.0, 1.0), glare=0.05, glare_from='left', blur=0.5, grain=2.4,
        crop=(400, 60, 2400, 1310), grade=dict(brightness=0.86, color=0.88, contrast=1.02),
    ),
    # Primo Pinnacle's home page on a space-grey 15" MacBook Pro, front view, on a white meeting-room table in front
    # of daylit windows. The photo's screen is lit (a blank grey desktop), so `glass` is the lit area itself: edges
    # found at half-maximum between the lit screen and the black border, fitted per side (residual < 0.1px).
    'primo-pinnacle': dict(
        photo='primo-meeting-room.jpg',
        glass=[(692.4, 490.6), (1707.2, 489.0), (1713.3, 1124.3), (688.4, 1126.7)],
        display=(0, 0, 1, 1), grow=1.2,
        cover='primo-pinnacle/01-home.jpg', fit='cover',
        gain=0.95, tint=(1.0, 1.0, 1.0), glare=0.04, glare_from='left', blur=0.5, grain=2.0,
        crop=(318, 250, 2062, 1340), grade=dict(brightness=0.86, color=0.95, contrast=1.03),
    ),
}


def homography(src, dst):
    """3x3 H with dst ~ H @ src for four point pairs."""
    A, b = [], []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    h = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.append(h, 1).reshape(3, 3)


def apply(H, pts):
    p = np.c_[np.array(pts, float), np.ones(len(pts))] @ H.T
    return [tuple(r) for r in p[:, :2] / p[:, 2:]]


def display_quad(sc):
    unit = [(0, 0), (1, 0), (1, 1), (0, 1)]
    H = homography(unit, sc['glass'])
    u0, v0, u1, v1 = sc['display']
    quad = apply(H, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)])
    g = sc.get('grow', 0)
    if g:  # push each corner outward from the centre (covers the lit screen's anti-aliased rim)
        cx, cy = np.mean(quad, axis=0)
        quad = [(x + np.sign(x - cx) * g, y + np.sign(y - cy) * g) for x, y in quad]
    return quad


def status_bar(w, h, bg):
    """An iPhone-style status bar strip (time left, signal/wifi/battery right) for screenshots that have none."""
    bar = Image.new('RGB', (w, h), bg)
    d = ImageDraw.Draw(bar)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/Inter-SemiBold.ttf', int(h * 0.36))
    except OSError:
        try:
            font = ImageFont.truetype('DejaVuSans-Bold.ttf', int(h * 0.34))
        except OSError:
            font = ImageFont.load_default()
    cy = h * 0.55
    d.text((w * 0.14, cy), '9:41', fill='white', font=font, anchor='mm')
    # signal bars
    x = w * 0.74; bw = w * 0.011
    for i in range(4):
        bh = h * (0.12 + 0.06 * i)
        d.rounded_rectangle([x, cy + h * 0.15 - bh, x + bw, cy + h * 0.15], radius=bw / 3, fill='white')
        x += bw * 1.6
    # wifi (three arcs)
    wx, wy = w * 0.83, cy + h * 0.14
    for r in (h * 0.30, h * 0.20, h * 0.10):
        d.pieslice([wx - r, wy - r, wx + r, wy + r], 225, 315, fill='white')
        d.pieslice([wx - r + h * 0.035, wy - r + h * 0.035, wx + r - h * 0.035, wy + r - h * 0.035], 225, 315, fill=bg)
    d.ellipse([wx - h * 0.03, wy - h * 0.06, wx + h * 0.03, wy], fill='white')
    # battery
    bx, by, bw2, bh2 = w * 0.875, cy - h * 0.13, w * 0.07, h * 0.26
    d.rounded_rectangle([bx, by, bx + bw2, by + bh2], radius=bh2 * 0.3, outline=(170, 170, 170), width=max(1, int(h * 0.025)))
    d.rounded_rectangle([bx + h * 0.04, by + h * 0.04, bx + bw2 * 0.8, by + bh2 - h * 0.04], radius=bh2 * 0.2, fill='white')
    d.rounded_rectangle([bx + bw2 + h * 0.02, by + bh2 * 0.32, bx + bw2 + h * 0.055, by + bh2 * 0.68], radius=h * 0.02, fill=(170, 170, 170))
    return bar


def screen_image(sc, aspect, width):
    """The screenshot as it appears on the display: cropped or fitted to the display's aspect, plus lighting."""
    shot = Image.open(IMAGES / sc['cover']).convert('RGB')
    W, H = width, int(round(width / aspect))
    if sc.get('phone'):
        bar_h = int(H * 0.062)
        bg = shot.getpixel((4, 4))
        canvas = Image.new('RGB', (W, H), bg)
        canvas.paste(status_bar(W, bar_h, bg), (0, 0))
        body = shot.resize((W, int(round(shot.height * W / shot.width))), Image.LANCZOS)
        # Home-indicator safe area at the bottom, in the app's tab-bar colour.
        safe_h = int(H * 0.035)
        nav = shot.getpixel((shot.width // 2, shot.height - 3))
        body_h = H - bar_h - safe_h
        if body.height > body_h:  # too tall: keep the tab bar, trim the empty space above it
            tab = int(body.height * sc.get('tab_bar', 0.1))
            body = Image.fromarray(np.vstack([np.asarray(body)[:body_h - tab], np.asarray(body)[-tab:]]))
        canvas.paste(body, (0, bar_h))
        d = ImageDraw.Draw(canvas)
        d.rectangle([0, H - safe_h, W, H], fill=nav)
        d.rounded_rectangle([W * 0.34, H - safe_h * 0.42, W * 0.66, H - safe_h * 0.42 + H * 0.0055], radius=H * 0.003, fill=(235, 235, 235))
        img = canvas
    elif sc['fit'] == 'contain':
        img = Image.new('RGB', (W, H), 'white')
        pad = sc.get('pad', 0)
        s = min(W * (1 - 2 * pad) / shot.width, H * (1 - 2 * pad) / shot.height)
        fitted = shot.resize((int(shot.width * s), int(shot.height * s)), Image.LANCZOS)
        img.paste(fitted, ((W - fitted.width) // 2, (H - fitted.height) // 2))
    else:  # cover, anchored at the top
        s = max(W / shot.width, H / shot.height)
        scaled = shot.resize((int(round(shot.width * s)), int(round(shot.height * s))), Image.LANCZOS)
        x0 = (scaled.width - W) // 2
        img = scaled.crop((x0, 0, x0 + W, H))

    a = np.asarray(img).astype(np.float32) / 255
    a = a * sc['gain'] * np.array(sc['tint'], np.float32)
    # Edge falloff: displays read a touch darker towards their edges in photos.
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ex = np.minimum(xx, W - 1 - xx) / W; ey = np.minimum(yy, H - 1 - yy) / H
    edge = np.clip(np.minimum(ex / 0.06, ey / 0.06), 0, 1)
    a *= (0.93 + 0.07 * edge)[..., None]
    # Soft diagonal glare from the room's main light.
    t = (xx / W * 0.75 + yy / H * 0.25) if sc['glare_from'] == 'left' else ((1 - xx / W) * 0.75 + yy / H * 0.25)
    glare = sc['glare'] * np.clip(1 - t * 1.6, 0, 1) ** 1.5
    a = 1 - (1 - a) * (1 - glare[..., None])
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def phone_alpha(photo, quad):
    """Alpha of the phone's lit screen, from the photo itself: exact rounded corners, island left out."""
    from scipy import ndimage
    lum = np.asarray(photo.convert('L')).astype(np.float32)
    region = Image.new('L', photo.size, 0)
    ImageDraw.Draw(region).polygon(quad, fill=255)
    # The lit screen is the bright component at the quad's centre (bright leaves outside the frame are excluded).
    lit = (lum > 120) & (np.asarray(region) > 0)
    lab, _ = ndimage.label(lit)
    cx, cy = (int(v) for v in np.mean(quad, axis=0))
    core = lab == lab[cy, cx]
    near = ndimage.binary_dilation(core, iterations=3)
    a = np.clip((lum - 45) / (175 - 45), 0, 1) * near
    # grow by ~1px so the bright anti-aliased rim is covered
    img = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    return img


def build(name):
    sc = SCENES[name]
    photo = Image.open(PHOTOS / sc['photo']).convert('RGB')
    quad = display_quad(sc)
    # Display size in photo pixels (for the screenshot resolution) and its real aspect (16:10, 19.5:9, ...).
    top = np.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1])
    if sc.get('phone'):
        aspect = 1 / 2.165
    elif name == 'fuzzy-logic':
        aspect = 16 / 9
    else:
        aspect = 16 / 10
    sw = int(top * SS * 1.5)
    screen = screen_image(sc, aspect, sw)
    sh = screen.height

    # Warp: Pillow's PERSPECTIVE maps output (photo, supersampled) coords to input (screen) coords.
    big = (photo.width * SS, photo.height * SS)
    qb = [(x * SS, y * SS) for x, y in quad]
    Hinv = homography(qb, [(0, 0), (sw, 0), (sw, sh), (0, sh)])
    coeffs = (Hinv / Hinv[2, 2]).flatten()[:8]
    warped = screen.transform(big, Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    mask_big = Image.new('L', big, 0)
    ImageDraw.Draw(mask_big).polygon(qb, fill=255)
    warped = warped.resize(photo.size, Image.LANCZOS)
    alpha = mask_big.resize(photo.size, Image.LANCZOS)
    if sc.get('phone'):
        pa = np.asarray(phone_alpha(photo, quad)).astype(np.float32)
        alpha = Image.fromarray(np.minimum(pa, np.asarray(alpha.filter(ImageFilter.MaxFilter(5))).astype(np.float32)).astype(np.uint8))
    # Match the photo's focus.
    warped = warped.filter(ImageFilter.GaussianBlur(sc['blur']))
    out = Image.composite(warped, photo, alpha)

    # Grain over the screen so it shares the photo's texture.
    rng = np.random.default_rng(7)
    o = np.asarray(out).astype(np.float32)
    al = np.asarray(alpha).astype(np.float32)[..., None] / 255
    o += rng.normal(0, sc['grain'], o.shape[:2])[..., None] * al
    out = Image.fromarray(np.clip(o, 0, 255).astype(np.uint8))

    g = sc['grade']
    out = ImageEnhance.Brightness(out).enhance(g['brightness'])
    out = ImageEnhance.Color(out).enhance(g['color'])
    out = ImageEnhance.Contrast(out).enhance(g['contrast'])
    x0, y0, x1, y1 = sc['crop']
    assert abs((x1 - x0) / (y1 - y0) - 1.6) < 0.01, (name, (x1 - x0) / (y1 - y0))
    out = out.crop(sc['crop'])
    if out.width > 2000:
        out = out.resize((2000, 1250), Image.LANCZOS)
    dest = IMAGES / name / '00-mockup.jpg'
    out.save(dest, quality=84, optimize=True, progressive=True, subsampling='4:2:0')
    print(f'{name}: display quad {[(round(x, 1), round(y, 1)) for x, y in quad]} -> {dest.relative_to(ROOT)} {out.size}')


if __name__ == '__main__':
    for n in (sys.argv[1:] or SCENES):
        build(n)
