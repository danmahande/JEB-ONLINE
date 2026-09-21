#!/usr/bin/env python3
"""
Compose the MERIDIAN SUPPLY CO. hero background from two real photos:
  - left  : African maize field (grains side)
  - right : warehouse with equipment (hardware side)
Blended with a wide feathered cosine seam so it reads as one continuous scene.
Output overwrites public/products/__hero.png (JPEG data, same as before).
"""
from PIL import Image, ImageEnhance
import numpy as np

CAND = "/home/z/my-project/scripts/candidates"
OUT = "/home/z/my-project/public/products/__hero.png"
PREVIEW = "/home/z/my-project/download/hero-composite-preview.png"

# Thin HD strip (~7:1): rendered as a short full-width band under the hero content.
# 1920px wide = no upscaling on common desktops, so it stays crisp despite being "thin".
W, H = 1920, 270

# ---------- 1. Load + crop ----------
# Farm: portrait 3000x4000, maize fills lower 60%, hills at ~y1300-1600
farm = Image.open(f"{CAND}/farm-3.jpg").convert("RGB")
fw, fh = farm.size  # 3000x4000
band_h = int(round(fw * H / W))  # 422px — horizon slice for the ~7:1 strip
y0 = int(fh * 0.335)  # hill crest + dense maize, minimal blown sky
farm_band = farm.crop((0, y0, fw, y0 + band_h))  # 3000x422
farm_band = farm_band.resize((W, H), Image.LANCZOS)

# Warehouse: 1672x941, band raised slightly off the floor so forklift + rack bases stay in frame
wh = Image.open(f"{CAND}/wh-2.png").convert("RGB")
ww, whh = wh.size  # 1672x941
crop_h = int(round(ww * H / W))  # 235px band for the ~7:1 strip
wx0 = max(0, whh - crop_h - 130)  # bottom-weighted but off the bare floor
wh_band = wh.crop((0, wx0, ww, wx0 + crop_h))  # 1672x235
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
    __import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(12)
)
alpha = np.asarray(alpha_img, dtype=np.float64) / 255.0

# ---------- 4. Composite ----------
f = np.asarray(farm_band, dtype=np.float64)
wimg = np.asarray(wh_band, dtype=np.float64)
comp = f * (1.0 - alpha[..., None]) + wimg * alpha[..., None]
hero = Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8))

# ---------- 5. Final grade: gentle contrast; keep FULL color (strip is shown un-grayscaled) ----------
hero = ImageEnhance.Contrast(hero).enhance(1.06)
hero = ImageEnhance.Color(hero).enhance(1.05)

# ---------- 6. Save ----------
hero.save(OUT, "JPEG", quality=90, optimize=True, progressive=True)
hero.save(PREVIEW, "PNG")
print("saved", OUT, hero.size)

# in-situ simulation: strip as displayed — full color under a top navy blend (from-ink via-ink/10)
img = np.asarray(hero, dtype=np.float64)
navy = np.array([27, 42, 74], dtype=np.float64)  # #1B2A4A
t = np.clip(1.0 - 1.8 * (np.arange(H) / H), 0.0, 1.0)[:, None]  # 1 at top -> 0.1 at mid -> 0
sim = img * (1 - t[..., None]) + navy * t[..., None]
Image.fromarray(np.clip(sim, 0, 255).astype(np.uint8)).save(
    "/home/z/my-project/download/hero-strip-insitu-sim.png"
)
print("saved in-situ strip simulation")
