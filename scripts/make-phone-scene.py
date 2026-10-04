"""Builds the hand-held phone scene used by DeviceMockup (device: phone).

Source: "A person holds a phone with a blank screen" by Jakub Zerdzicki, Unsplash License,
https://unsplash.com/photos/9GfR3zLyy6o (download it at 4800px wide and pass it as the first argument).
Geometry below is measured on the 2400px rendition and scaled by S = 2.

Usage: python scripts/make-phone-scene.py photo.jpg
Writes src/assets/mockups/phone-hand.jpg (16:10 crop, muted and darkened, screen blacked out) and
src/assets/mockups/phone-thumb.png (the thumb, cut out, drawn above the screenshot), and prints the
screen corners in the crop's pixel space for DeviceMockup.astro.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

SRC = sys.argv[1]
CROP = (377, 477, 1777, 1352)  # 1400 x 875 = 16:10, phone a little left of centre, hand in frame
# Screen corners in the 2400px source (fitted to the screen's edges): TL, TR, BR, BL.
QUAD = [(951, 673), (1167, 658), (1258, 1233), (1012, 1264)]

S = 2
im = Image.open(SRC).convert('RGB')
assert im.size[0] == 2400 * S, im.size
CROP = tuple(v * S for v in CROP)
QUAD = [(x * S, y * S) for x, y in QUAD]
a = np.asarray(im).astype(np.int16)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
skin = (r - b > 45) & (r > 120)

# Screen mask: lit pixels in the quad grown by 4px, minus skin (the thumb overlaps the right edge).
quad_mask = Image.new('L', im.size, 0)
ImageDraw.Draw(quad_mask).polygon(QUAD, fill=255)
quad_mask = quad_mask.filter(ImageFilter.MaxFilter(17))
q = np.asarray(quad_mask) > 0
lum = a.mean(axis=2)
screen = q & ~skin & (lum > 70)  # the lit screen and its anti-aliased edge; the dark bezel stays

# Black out the lit screen so any sub-pixel gap around the overlaid screenshot reads as bezel.
out = a.copy()
out[screen] = (14, 14, 16)
scene = Image.fromarray(out.astype(np.uint8))

# Thumb overlay: skin pixels near the screen's right edge, softly feathered.
thumb = np.zeros(im.size[::-1], np.uint8)
ys, xs = np.mgrid[0:im.size[1], 0:im.size[0]]
near = (xs > 1180 * S) & (xs < 1300 * S) & (ys > 900 * S) & (ys < 1120 * S)
thumb[near & skin] = 255
thumb_img = Image.fromarray(thumb).filter(ImageFilter.GaussianBlur(2.4))
rgba = im.copy().convert('RGBA')
rgba.putalpha(thumb_img)

# Muted, slightly dark look (matches the reference mood): less saturation, lower exposure, soft vignette.
def grade(img):
    img = ImageEnhance.Color(img).enhance(0.55)
    img = ImageEnhance.Brightness(img).enhance(0.72)
    return ImageEnhance.Contrast(img).enhance(0.92)

scene = grade(scene).crop(CROP)
w, h = scene.size
vy, vx = np.mgrid[0:h, 0:w]
d = np.sqrt(((vx - w / 2) / (w / 2)) ** 2 + ((vy - h / 2) / (h / 2)) ** 2)
v = np.clip(1 - 0.35 * np.clip(d - 0.55, 0, None), 0, 1)[..., None]
scene = Image.fromarray((np.asarray(scene) * v).astype(np.uint8))
scene.save('src/assets/mockups/phone-hand.jpg', quality=84, optimize=True, progressive=True)

t = rgba.crop(CROP)
rgb = grade(t.convert('RGB'))
rgb = Image.fromarray((np.asarray(rgb) * v).astype(np.uint8)).convert('RGBA')
rgb.putalpha(t.getchannel('A'))
bbox = rgb.getchannel('A').getbbox()
rgb.crop(bbox).save('src/assets/mockups/phone-thumb.png', optimize=True)
# Printed in the scene's 1400 x 875 design space (the SVG viewBox in DeviceMockup.astro).
print('scene', w // S, h // S)
print('quad', [((x - CROP[0]) / S, (y - CROP[1]) / S) for x, y in QUAD])
print('thumb bbox', [v / S for v in bbox])
