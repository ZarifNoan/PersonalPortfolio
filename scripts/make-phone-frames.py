"""Renders each phone-app gallery screenshot inside a realistic modern smartphone (transparent PNG).

The phone is drawn from measurements of a 6.1" flagship (iPhone 15 Pro class, in iOS points): a 393 x 852 pt display
with 55 pt continuous corners, a 10 pt black glass border, a 7 pt titanium band, a dynamic island, an action button and
volume keys on the left, a side button on the right. Everything is drawn analytically with numpy at SS x the output
resolution and downsampled, so edges are clean:
  - the titanium band is shaded as a rounded metal edge (diffuse + specular from a top-left light, plus a soft
    environment reflection), with a thin bright chamfer where it meets the glass;
  - the screen shows the screenshot crisply, under an iOS status bar (9:41, signal, wifi, battery), with a home
    indicator on a safe area in the app's bottom colour;
  - a faint diagonal reflection lies across the cover glass, and a soft two-layer contact shadow falls below.

Output: <screenshot>.phone.png next to each screenshot (referenced as `framed:` in the project's index.yaml); the
gallery shows it and the lightbox still opens the plain screenshot.

Usage: python scripts/make-phone-frames.py          (all screens below)
       python scripts/make-phone-frames.py --sheet  (also writes a contact sheet to the scratch dir in argv[2])
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / 'src' / 'content' / 'software'

K = 1.6        # output pixels per point (screen 629 px wide: ~1.6x the 395 px screenshots, sharp up to 3x DPR)
SS = 3         # supersampling for the analytic geometry

# Phone geometry in points.
SCR_W, SCR_H, SCR_R = 393, 852, 55
BEZEL, RIM = 10, 7
BODY_W, BODY_H = SCR_W + 2 * (BEZEL + RIM), SCR_H + 2 * (BEZEL + RIM)
BODY_R = SCR_R + BEZEL + RIM
CORNER_N = 2.45  # superellipse exponent: Apple-style continuous corners rather than plain circular arcs
MARGIN = dict(l=34, r=34, t=26, b=64)  # room for the side keys and the shadow
STATUS_H, SAFE_H = 54, 22  # iOS status bar and home-indicator safe area

TITANIUM = np.array([0.62, 0.60, 0.565], np.float32)  # natural titanium

# Per screenshot: `crop` (left, top, right, bottom) trims capture borders; `under` lets the content run under the
# status bar (a full-bleed map); `trim` is the screenshot row around which uniform empty rows are dropped when the
# content is taller than the screen.
SCREENS = {
    'fixer/images/02-services.png': dict(crop=(0, 0, 0, 0), trim=420),
    'fixer/images/03-tracking.png': dict(crop=(4, 0, 6, 4), under=True),
    'fixer/images/04-booking-confirmed.png': dict(crop=(0, 0, 1, 0), trim=222),
    'fixer/images/05-rating.png': dict(crop=(3, 0, 4, 8), trim=700),
}


def sdf_box(xx, yy, cx, cy, hw, hh, r, n=CORNER_N):
    """Approximate signed distance (negative inside) to a rounded rectangle with superellipse corners."""
    qx = np.abs(xx - cx) - (hw - r)
    qy = np.abs(yy - cy) - (hh - r)
    ox, oy = np.maximum(qx, 0), np.maximum(qy, 0)
    outside = (ox ** n + oy ** n) ** (1 / n)
    return outside + np.minimum(np.maximum(qx, qy), 0) - r


def cover(d, aa):
    """Coverage of the inside of a distance field, anti-aliased over `aa` pixels."""
    return np.clip(0.5 - d / aa, 0, 1)


def font(size, bold=True):
    for f in (['C:/Windows/Fonts/Inter-SemiBold.ttf', 'C:/Windows/Fonts/segoeuib.ttf', 'DejaVuSans-Bold.ttf'] if bold
              else ['C:/Windows/Fonts/Inter-Regular.ttf', 'C:/Windows/Fonts/segoeui.ttf', 'DejaVuSans.ttf']):
        try:
            return ImageFont.truetype(f, int(size))
        except OSError:
            pass
    return ImageFont.load_default()


def status_bar(img, s, dark_bg):
    """iOS status bar glyphs drawn onto `img` (RGBA, screen sized); s = pixels per point."""
    d = ImageDraw.Draw(img)
    ink = (255, 255, 255, 255) if dark_bg else (0, 0, 0, 255)
    cy = 30 * s  # centre line of the status bar items, beside the island
    d.text((66 * s, cy), '9:41', fill=ink, font=font(17 * s), anchor='mm')
    # cellular: four bars
    x = 290 * s
    for i in range(4):
        h = (4.5 + 2.4 * i) * s
        d.rounded_rectangle([x, cy + 5.5 * s - h, x + 3.2 * s, cy + 5.5 * s], radius=1 * s, fill=ink)
        x += 5.0 * s
    # wifi: three concentric arcs and a dot (a fan from a common centre)
    wx, wy = 323 * s, cy + 5.6 * s
    for r in (11.2, 7.4, 3.6):
        rr = r * s
        d.arc([wx - rr, wy - rr, wx + rr, wy + rr], 225, 315, fill=ink, width=int(round(2.3 * s)))
    d.ellipse([wx - 1.6 * s, wy - 2.6 * s, wx + 1.6 * s, wy + 0.6 * s], fill=ink)
    # battery: outline, fill, terminal
    bx, by, bw, bh = 340 * s, cy - 6.2 * s, 25 * s, 12.4 * s
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=3.8 * s, outline=ink[:3] + (110,), width=max(1, int(round(1.1 * s))))
    d.rounded_rectangle([bx + 2 * s, by + 2 * s, bx + bw - 2 * s, by + bh - 2 * s], radius=2.2 * s, fill=ink)
    d.rounded_rectangle([bx + bw + 1.2 * s, by + bh * 0.33, bx + bw + 2.8 * s, by + bh * 0.67], radius=1 * s, fill=ink[:3] + (110,))


def screen_content(path, cfg, s):
    """The screen as an RGB image (SCR_W x SCR_H points at s px/pt): status bar, screenshot, safe area, indicator."""
    shot = Image.open(SW / path).convert('RGB')
    l, t, r, b = cfg['crop']
    shot = shot.crop((l, t, shot.width - r, shot.height - b))
    W, H = int(round(SCR_W * s)), int(round(SCR_H * s))
    top = 0 if cfg.get('under') else int(round(STATUS_H * s))
    safe = int(round(SAFE_H * s))
    room = H - top - safe
    a = np.asarray(shot)
    scale = W / shot.width
    need = room / scale  # screenshot rows that fit
    if a.shape[0] > need:  # drop empty rows around `trim`
        drop = int(np.ceil(a.shape[0] - need))
        y0 = cfg['trim'] - drop // 2
        a = np.vstack([a[:y0], a[y0 + drop:]])
    body = Image.fromarray(a).resize((W, int(round(a.shape[0] * scale))), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), tuple(int(v) for v in a[2, a.shape[1] // 2]))
    canvas.paste(body, (0, top))
    # Safe area (and any shortfall): continue the app's bottom row down to the screen's edge.
    below = top + body.height
    if below < H:
        # a solid fill in the median colour of the app's last rows (repeating a row would smear its details)
        fill = np.median(np.asarray(body)[-int(6 * s):-int(2 * s)].reshape(-1, 3), axis=0)
        ImageDraw.Draw(canvas).rectangle([0, below, W, H], fill=tuple(int(v) for v in fill))
    img = canvas.convert('RGBA')
    top_lum = np.asarray(canvas.crop((0, 0, W, int(STATUS_H * s))).convert('L')).mean()
    status_bar(img, s, top_lum < 140)
    # Home indicator
    d = ImageDraw.Draw(img)
    bot = np.asarray(canvas.crop((0, H - safe, W, H)).convert('L')).mean()
    ind = (240, 240, 240, 235) if bot < 140 else (20, 20, 20, 235)
    d.rounded_rectangle([W / 2 - 67 * s, H - 8 * s - 5 * s, W / 2 + 67 * s, H - 8 * s], radius=2.5 * s, fill=ind)
    return img.convert('RGB')


def render(path, cfg):
    s = K * SS
    ml, mr, mt, mb = (MARGIN[k] for k in 'lrtb')
    TW, TH = BODY_W + ml + mr, BODY_H + mt + mb
    w, h = int(round(TW * s)), int(round(TH * s))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx = (xx + 0.5) / s - ml   # points, origin at the body's top-left
    yy = (yy + 0.5) / s - mt
    cx, cy = BODY_W / 2, BODY_H / 2
    aa = 1 / s * 1.2  # anti-aliasing width in points (about one supersampled pixel)

    d_body = sdf_box(xx, yy, cx, cy, BODY_W / 2, BODY_H / 2, BODY_R)
    d_glass = sdf_box(xx, yy, cx, cy, BODY_W / 2 - RIM, BODY_H / 2 - RIM, BODY_R - RIM)
    d_scr = sdf_box(xx, yy, cx, cy, SCR_W / 2, SCR_H / 2, SCR_R)

    rgb = np.zeros((h, w, 3), np.float32)
    alpha = np.zeros((h, w), np.float32)

    def over(color, a):
        nonlocal rgb, alpha
        a = a[..., None] if a.ndim == 2 else a
        rgb = rgb * (1 - a) + color * a
        alpha[:] = alpha + a[..., 0] * (1 - alpha)

    # ---- shadow: a wide soft one and a tight contact one, both below the phone ----
    small = Image.fromarray((cover(d_body, aa) * 255).astype(np.uint8)).resize((w // 4, h // 4), Image.BILINEAR)
    def blurred(sigma_pt, dy_pt, shrink_pt):
        m = np.asarray(small).astype(np.float32) / 255
        im = Image.fromarray((m * 255).astype(np.uint8))
        if shrink_pt:
            im = im.filter(ImageFilter.MinFilter(int(shrink_pt * s / 4) * 2 + 1))
        im = im.filter(ImageFilter.GaussianBlur(sigma_pt * s / 4))
        im = im.resize((w, h), Image.BILINEAR)
        a = np.asarray(im).astype(np.float32) / 255
        dy = int(round(dy_pt * s))
        return np.vstack([np.zeros((dy, w), np.float32), a[:h - dy]])
    shadow = 0.42 * blurred(16, 18, 10) + 0.38 * blurred(3.5, 4, 1.5)
    shadow_col = np.array([0.02, 0.03, 0.07], np.float32)
    rgb = np.broadcast_to(shadow_col, (h, w, 3)).copy()
    alpha = np.clip(shadow, 0, 1)

    # ---- side keys (behind the body; they stick out ~2 pt) ----
    keys = [(-1, 168, 196), (-1, 244, 300), (-1, 318, 374), (1, 262, 352)]  # (side, top, bottom) in points
    for side, k0, k1 in keys:
        kx0 = -2.3 if side < 0 else BODY_W - 2.0
        kx1 = 2.0 if side < 0 else BODY_W + 2.3
        d_key = sdf_box(xx, yy, (kx0 + kx1) / 2, (k0 + k1) / 2, (kx1 - kx0) / 2, (k1 - k0) / 2, 1.6, 2.0)
        # cylinder shading across the key's thickness, light from the left/top
        u = np.clip((xx - kx0) / (kx1 - kx0), 0, 1)
        prof = np.sin(u * np.pi) if side < 0 else np.sin(u * np.pi)
        shade = 0.45 + 0.55 * prof * (0.9 if side < 0 else 0.7)
        col = TITANIUM * shade[..., None] * 0.95
        over(col, cover(d_key, aa) * 1.0)

    # ---- titanium band ----
    gy, gx = np.gradient(d_body)
    gl = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    nx, ny = gx / gl, gy / gl                       # outward normal in the image plane
    t = np.clip(-d_body / RIM, 0, 1)                # 0 at the outer edge, 1 where the glass starts
    phi = t * (np.pi / 2) * 0.92                    # rounded edge: faces sideways outside, the viewer inside
    n3 = np.stack([nx * np.cos(phi), ny * np.cos(phi), np.sin(phi)], -1)
    L = np.array([-0.45, -0.62, 0.64], np.float32); L /= np.linalg.norm(L)
    Hh = L + np.array([0, 0, 1], np.float32); Hh /= np.linalg.norm(Hh)
    ndl = np.clip((n3 * L).sum(-1), 0, 1)
    spec = np.clip((n3 * Hh).sum(-1), 0, 1) ** 36
    # environment: a bright sky above, a dark floor below, reflected by the band's normal
    env = 0.5 - 0.5 * n3[..., 1]
    env = 0.25 + 0.75 * np.clip(env, 0, 1) ** 1.6
    metal = TITANIUM * (0.28 + 0.5 * ndl + 0.42 * env)[..., None] + spec[..., None] * 1.0
    # a fine brushed grain along the band
    rng = np.random.default_rng(3)
    metal *= (1 + rng.normal(0, 0.012, (h, w)).astype(np.float32))[..., None]
    # outer edge occlusion and the dark seam where the band meets the glass
    metal *= (0.55 + 0.45 * np.clip(t / 0.18, 0, 1))[..., None]
    seam = np.exp(-((-d_glass) / 0.45) ** 2)
    metal *= (1 - 0.65 * seam)[..., None]
    over(metal, cover(d_body, aa))

    # ---- black glass border (with a faint sheen near the band) ----
    g_t = np.clip(-d_glass / BEZEL, 0, 1)
    glass = np.array([0.018, 0.018, 0.022], np.float32) + (0.05 * np.exp(-g_t * 9) * (0.6 - 0.4 * ny))[..., None]
    over(glass, cover(d_glass, aa))
    # bright chamfer: a hairline highlight on the glass edge, strongest towards the light
    facing = np.clip(-(nx * L[0] + ny * L[1]) / np.hypot(L[0], L[1]), 0, 1)
    chamfer = np.exp(-((-d_glass - 0.55) / 0.35) ** 2) * (0.25 + 0.75 * facing)
    over(np.array([0.9, 0.9, 0.92], np.float32), np.clip(chamfer * 0.55, 0, 1) * cover(d_glass, aa))

    # ---- screen ----
    content = screen_content(path, cfg, s)
    scr = np.zeros((h, w, 3), np.float32)
    x0, y0 = int(round((ml + (BODY_W - SCR_W) / 2) * s)), int(round((mt + (BODY_H - SCR_H) / 2) * s))
    scr[y0:y0 + content.height, x0:x0 + content.width] = np.asarray(content).astype(np.float32) / 255
    # displays read a touch darker at their very edge, under the glass
    scr *= (0.94 + 0.06 * np.clip(-d_scr / 3, 0, 1))[..., None]
    over(scr, cover(d_scr, aa))

    # ---- dynamic island with its camera ----
    icx, icy = BODY_W / 2, (BODY_H - SCR_H) / 2 + 11 + 37 / 2
    d_isl = sdf_box(xx, yy, icx, icy, 125 / 2, 37 / 2, 37 / 2, 2.0)
    over(np.array([0.0, 0.0, 0.0], np.float32), cover(d_isl, aa))
    lx = icx + 125 / 2 - 18.5
    d_lens = np.hypot(xx - lx, yy - icy) - 6.2
    lens = np.array([0.035, 0.04, 0.07], np.float32) + (0.08 * np.clip(1 - np.hypot(xx - lx + 1.8, yy - icy + 1.8) / 3, 0, 1))[..., None] * np.array([0.6, 0.7, 1.0], np.float32)
    over(lens, cover(d_lens, aa) * 0.95)
    d_glint = np.hypot(xx - lx + 2, yy - icy + 2) - 1.1
    over(np.array([0.55, 0.62, 0.8], np.float32), cover(d_glint, aa) * 0.5)

    # ---- cover glass reflection: a soft diagonal sheen over the top-left, and a gentle falloff ----
    u, v = xx / BODY_W, yy / BODY_H
    line = u * 0.62 + v * 0.38                     # diagonal coordinate
    sheen = 0.075 * np.clip((0.43 - line) / 0.43, 0, 1) ** 0.8 * (line < 0.43)
    sheen = Image.fromarray((sheen * 255 * 4).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2 * s))
    sheen = np.asarray(sheen).astype(np.float32) / 255 / 4
    sheen += 0.02 * np.exp(-((line - 0.47) / 0.04) ** 2)  # a faint secondary band
    gmask = cover(d_glass, aa)
    rgb = rgb + (1 - rgb) * (sheen * gmask)[..., None]

    out = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    # un-premultiply nothing: rgb is straight colour already composited over the shadow colour
    img = Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA')
    img = img.resize((int(round(TW * K)), int(round(TH * K))), Image.LANCZOS)
    dest = (SW / path).with_suffix('.phone.png')
    img.save(dest, optimize=True)
    print(f'{path} -> {dest.relative_to(ROOT)} {img.size}')
    return img


if __name__ == '__main__':
    imgs = [render(p, c) for p, c in SCREENS.items()]
    if len(sys.argv) > 2 and sys.argv[1] == '--sheet':
        bg = Image.new('RGBA', (sum(i.width for i in imgs) + 60 * 5, imgs[0].height + 120), (29, 79, 122, 255))
        x = 60
        for k, i in enumerate(imgs):
            bg.alpha_composite(i, (x, 30 + (0 if k % 2 == 0 else 80)))
            x += i.width + 60
        bg.save(sys.argv[2])
