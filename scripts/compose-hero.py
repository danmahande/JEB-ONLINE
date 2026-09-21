#!/usr/bin/env python3
"""
Compose the MERIDIAN SUPPLY CO. hero background from two real photos:
  - left  : African maize field (grains side)
  - right : warehouse with equipment (hardware side)
Blended with a wide feathered cosine seam so it reads as one continuous scene.
Output overwrites public/products/__hero.png (JPEG data, same as before).
"""
from PIL import Image, ImageEnhance, ImageOps
import numpy as np

CAND = "/home/z/my-project/scripts/candidates"
OUT = "/home/z/my-project/public/products/__hero.png"
PREVIEW = "/home/z/my-project/download/hero-composite-preview.png"

W, H = 2200, 1100  # 2:1 canvas

# ---------- 1. Load + crop ----------
# Farm: portrait 3000x4000, maize fills lower 60%, hills at ~y1300-1600
farm = Image.open(f"{CAND}/farm-3.jpg").convert("RGB")
fw, fh = farm.size  # 3000x4000
band_h = fw // 2  # 1500 for 2:1 at full width
y0 = int(fh * 0.335)  # hill crest + dense maize, minimal blown sky
farm_band = farm.crop((0, y0, fw, y0 + band_h))  # 3000x1500
farm_band = farm_band.resize((W, H), Image.LANCZOS)

# Warehouse: 1672x941, bottom-weighted crop to keep forklifts + racks + floor
wh = Image.open(f"{CAND}/wh-2.png").convert("RGB")
ww, whh = wh.size  # 1672x941
crop_h = ww // 2  # 836
wx0 = max(0, whh - crop_h - 60)  # slight bottom weight, trim a little ceiling
wh_band = wh.crop((0, wx0, ww, wx0 + crop_h))  # 1672x836
wh_band = wh_band.resize((W, H), Image.LANCZOS)

# ---------- 2. Tone match warehouse to farm (LUMINANCE-only, keep own hue) ----------
f = np.asarray(farm_band, dtype=np.float64)
wimg = np.asarray(wh_band, dtype=np.float64)
def lum(x):
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]
fl_mean, fl_std = lum(f).mean(), lum(f).std()
wl_mean, wl_std = lum(wimg).mean(), lum(wimg).std()
ratio = fl_std / max(wl_std, 1e-6)
for c in range(3):  # scale contrast around mean, per channel by same factor
    chan_mean = wimg[..., c].mean()
    wimg[..., c] = (wimg[..., c] - chan_mean) * ratio + chan_mean + (fl_mean - wl_mean)
wimg = np.clip(wimg, 0, 255)
wh_band = Image.fromarray(wimg.astype(np.uint8))

# ---------- 3. Feathered cosine seam (warehouse alpha) ----------
xs = np.linspace(0.0, 1.0, W)
a = np.zeros(W)
ramp_lo, ramp_hi = 0.30, 0.58  # seam ends before the forklift zone
zone = (xs >= ramp_lo) & (xs <= ramp_hi)
t = (xs[zone] - ramp_lo) / (ramp_hi - ramp_lo)
a[zone] = 0.5 - 0.5 * np.cos(np.pi * t)  # smoothstep-style cosine
a[xs > ramp_hi] = 1.0
alpha = np.tile(a, (H, 1))  # HxW

# vertical softening: let the seam wander slightly (organic, less mechanical)
rng = np.random.default_rng(7)
warp = np.zeros(H)
for i in range(1, H):
    warp[i] = warp[i - 1] * 0.995 + rng.normal(0, 0.004)
warp = (warp - warp.min()) / (warp.max() - warp.min() + 1e-9) - 0.5
shift = (warp[:, None] * 0.07)  # ±3.5% horizontal wander
alpha = np.clip(alpha + shift, 0, 1)
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(
    __import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(6)
)
alpha = np.asarray(alpha_img, dtype=np.float64) / 255.0

# ---------- 4. Composite ----------
f = np.asarray(farm_band, dtype=np.float64)
wimg = np.asarray(wh_band, dtype=np.float64)
comp = f * (1.0 - alpha[..., None]) + wimg * alpha[..., None]
hero = Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8))

# ---------- 5. Final grade: gentle contrast + slight desat punch ----------
hero = ImageEnhance.Contrast(hero).enhance(1.06)
hero = ImageEnhance.Color(hero).enhance(0.92)  # CSS grayscales it anyway

# ---------- 6. Save ----------
hero.save(OUT, "JPEG", quality=85, optimize=True, progressive=True)
hero.save(PREVIEW, "PNG")
print("saved", OUT, hero.size)

# side-by-side + in-situ grayscale/navy simulation strip for review
gray = ImageOps.grayscale(hero)
import numpy as np2
g = np2.asarray(gray, dtype=np.float64)[..., None].repeat(3, axis=2)
navy = np2.array([27, 42, 74], dtype=np.float64)  # #1B2A4A
duo = g * 0.5 + navy * 0.5  # opacity-50 over navy
grad = np2.linspace(0.20, 1.0, H)[:, None]  # top ink/20 -> bottom ink
duo = duo * (1 - grad[..., None]) + navy * grad[..., None]
sim = Image.fromarray(np2.clip(duo, 0, 255).astype(np.uint8))
sim.save("/home/z/my-project/download/hero-duotone-simulation.png")
print("saved duotone simulation")
