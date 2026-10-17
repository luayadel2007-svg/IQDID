#!/usr/bin/env python3
"""IQDI brand asset generator — builds every SVG in assets/branding/ from one geometry.

The approved reference is the owner-selected «palm + Ishtar-gate arch + Tigris/Euphrates + Babylon lion»
concept image (Original and Dark). This script is a geometric redraw of that concept, not a trace:
every shape is a parametric path, so the result is editable and identical in structure across variants.

Refinements requested by the owner and applied here:
  - date clusters about 20-25 % smaller than the reference, two balanced clusters, simplified fronds;
  - one lion only (the reference shows three), Babylonian-inspired, not an archaeological copy;
  - exactly two rivers with a clean, open gap; no shadows that could read as a third wave;
  - a symmetric two-centred pointed arch with uniform gold frame widths;
  - a dark variant with its own palette (night navy, brighter gold, separated river tones), same geometry;
  - a simplified app icon (palm + arch + two river lines, no lion, no tiles, no text).

Text is converted to outlines so the files do not depend on installed fonts:
  - Latin «IQDI» and tagline: Cinzel (SIL OFL 1.1), npm @fontsource/cinzel@5.3.0
  - Arabic «الهوية الرقمية العراقية»: Noto Sans Arabic Bold (SIL OFL 1.1), already a dependency

Usage (TEST ONLY project; requires fonttools, uharfbuzz, brotli):
  npm pack @fontsource/cinzel@5.3.0 && tar xzf fontsource-cinzel-5.3.0.tgz
  python3 tools/branding/generate_brand.py --cinzel-dir package/files
"""
from __future__ import annotations

import argparse
import io
import math
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'branding'
ARABIC_FONT = ROOT / 'node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff'

# ------------------------------------------------------------------ palettes (design tokens)
ORIGINAL = {
    'name': 'original',
    'navy': '#0B2450', 'tile': '#1A4590', 'tile_grid': '#143A7C', 'tile_accent': '#C9A23F',
    'river_hi': '#2A66BC', 'river_lo': '#163F86', 'river2_hi': '#2A66BC', 'river2_lo': '#163F86',
    'gold_hi': '#E9CB72', 'gold_mid': '#D4AF37', 'gold_lo': '#A9842C', 'gold_line': '#C39A33',
    'gold_detail': '#8C6A1F', 'frond_hi': '#2A5DB0', 'frond_lo': '#14387A', 'trunk': '#0B2450',
    'word_fill': '#0B2450', 'word_rim': '#C39A33', 'arabic': '#0B2450', 'tagline': '#0B2450',
    'divider': '#C39A33', 'bg': '#F8F6F1',
}
DARK = {
    'name': 'dark',
    'navy': '#0D1B33', 'tile': '#2457AE', 'tile_grid': '#1C4793', 'tile_accent': '#E3BE55',
    # The two rivers get different tones in Dark so they never merge on a night background.
    'river_hi': '#4A8BE3', 'river_lo': '#2E68C4', 'river2_hi': '#3471CD', 'river2_lo': '#21529F',
    'gold_hi': '#F5DC8E', 'gold_mid': '#E3BE55', 'gold_lo': '#BC9334', 'gold_line': '#E3BE55',
    'gold_detail': '#A47E2A', 'frond_hi': '#3A72CC', 'frond_lo': '#1F4F9F', 'trunk': '#183766',
    'word_fill': 'url(#{p}-wordgold)', 'word_rim': '#F5DC8E', 'arabic': '#EBD9A0', 'tagline': '#D9C48A',
    'divider': '#E3BE55', 'bg': '#0D1B33',
}


def f(v: float) -> str:
    return f'{v:.1f}'.rstrip('0').rstrip('.')


# ------------------------------------------------------------------ geometry helpers
def bez(p0, p1, p2, t):
    a = (1 - t) ** 2
    b = 2 * (1 - t) * t
    c = t * t
    return (a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1])


def bez_tan(p0, p1, p2, t):
    dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    n = math.hypot(dx, dy) or 1
    return (dx / n, dy / n)


def smooth(points, closed=False):
    """Catmull-Rom through points → cubic Bézier path data (few, editable segments)."""
    pts = points + points[:2] if closed else [points[0]] + points + [points[-1]]
    d = f'M{f(pts[1][0])} {f(pts[1][1])}'
    rng = range(1, len(pts) - 2)
    for i in rng:
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}'
    return d


# ------------------------------------------------------------------ the mark (shared geometry)
CROWN = (335, 318)
BASE_Y = 794
# (angle°, length, droop, width) — 10 fronds; the right-hand ones stop short of the arch opening.
FRONDS = [
    (200, 320, 170, 62), (180, 330, 140, 64), (158, 310, 100, 62), (134, 280, 56, 58), (112, 258, 24, 52),
    (92, 262, 6, 50), (72, 240, 30, 52), (52, 228, 66, 56), (30, 196, 96, 58), (10, 170, 120, 56),
]
# Outer arch: two-centred pointed arch, symmetric about x=665 (legs 340 and 990, springing 380, r=455).
OUTER_R, OUTER_SPRING, OUTER_L, OUTER_RX = 455, 380, 340, 990
OUTER_LEFT_END_Y = 330  # the left flank ends under the crown and runs diagonally into the gold post
# Inner opening: symmetric about x=623 (legs 446 and 800, springing 400).
IN_L, IN_R, IN_SPRING = 446, 800, 400
IN_R_RADIUS = 0.7 * (IN_R - IN_L)


def arch_apex(left, right, spring, r):
    half = (right - left) / 2
    return ((left + right) / 2, spring - math.sqrt(r * r - half * half))


def outer_arch_path():
    ax, ay = arch_apex(OUTER_L, OUTER_RX, OUTER_SPRING, OUTER_R)
    r = OUTER_R
    lx = OUTER_L + r - math.sqrt(r * r - (OUTER_SPRING - OUTER_LEFT_END_Y) ** 2)
    return (f'M{OUTER_RX} {BASE_Y} L{OUTER_RX} {OUTER_SPRING} A{r} {r} 0 0 0 {f(ax)} {f(ay)} '
            f'A{r} {r} 0 0 0 {f(lx)} {OUTER_LEFT_END_Y} L440 418 L440 {BASE_Y} Z')


def inner_opening_path():
    ax, ay = arch_apex(IN_L, IN_R, IN_SPRING, IN_R_RADIUS)
    r = IN_R_RADIUS
    return (f'M{IN_L} {BASE_Y} L{IN_L} {IN_SPRING} A{f(r)} {f(r)} 0 0 1 {f(ax)} {f(ay)} '
            f'A{f(r)} {f(r)} 0 0 1 {IN_R} {IN_SPRING} L{IN_R} {BASE_Y} Z')


RIVERS = [
    # Tigris (upper) and Euphrates (lower): equal bands, 42-44 px open gap between them.
    'M446 446 C600 446 640 596 800 598 L800 670 C630 668 590 518 446 518 Z',
    'M446 560 C600 560 640 712 800 714 L800 786 C630 784 590 632 446 632 Z',
]

# Babylon-style lion, striding left with open jaws and raised tail, in a 200×120 box (ground y=120).
# Inspired by the glazed-brick lions; a simplified drawing, not a copy of a specific artefact. One lion only.
LION_BODY = ('M2 30 C6 20 14 12 26 10 L30 2 L38 10 C48 4 64 4 76 12 C86 18 100 22 116 22 L160 22 '
             'C176 22 186 30 188 42 C190 56 186 68 180 74 L182 110 C182 116 178 118 172 118 L158 118 L160 110 '
             'L158 88 L150 88 L150 110 L152 118 L136 118 L138 110 L136 86 C118 90 98 90 84 86 '
             'L82 110 L84 118 L68 118 L70 110 L68 90 L62 90 L62 110 L64 118 L48 118 L50 110 L48 80 '
             'C38 76 32 66 32 58 L24 54 L6 54 L8 48 L20 46 L22 40 L4 38 Z')
LION_TAIL = 'M187 38 C200 30 204 16 196 8'
LION_TUFT = (198, 5, 6.5)
LION_DETAIL = ('M36 12 C44 24 44 40 36 54 M48 8 C58 22 58 44 48 62 M60 8 C70 24 70 46 60 70 '
               'M72 14 C82 30 80 52 70 76 M96 52 C114 56 132 56 150 52 M166 62 C172 68 176 72 178 78')
LION_EYE = (17, 21, 2.8)


def frond(cx, cy, ang_deg, length, droop, width):
    a = math.radians(ang_deg)
    d = (math.cos(a), -math.sin(a))
    p0 = (cx, cy)
    p2 = (cx + length * d[0], cy + length * d[1] + droop)
    p1 = (cx + 0.58 * length * d[0], cy + 0.58 * length * d[1] - 0.25 * droop)
    left, right, ticks = [], [], []
    samples = 9
    for i in range(samples + 1):
        t = i / samples
        b = bez(p0, p1, p2, t)
        tx, ty = bez_tan(p0, p1, p2, t)
        nx, ny = -ty, tx
        w = width * 0.5 * (t ** 0.55) * ((1 - t) ** 0.85) * 2.1
        left.append((b[0] + nx * w, b[1] + ny * w))
        right.append((b[0] - nx * w, b[1] - ny * w))
    outline = smooth(left + right[::-1][1:-1] + [left[0]][:0]) + ' Z'
    # Leaflet ticks: a feathered gold edge, 9 per side (fewer and coarser than the reference).
    for k in range(1, 10):
        t = 0.06 + k * 0.088
        b = bez(p0, p1, p2, t)
        tx, ty = bez_tan(p0, p1, p2, t)
        nx, ny = -ty, tx
        w = width * 0.5 * (t ** 0.55) * ((1 - t) ** 0.85) * 2.1 * 1.62
        for s in (1, -1):
            ex = b[0] + (nx * s * 0.82 + tx * 0.57) * w
            ey = b[1] + (ny * s * 0.82 + ty * 0.57) * w
            ticks.append(f'M{f(b[0])} {f(b[1])} L{f(ex)} {f(ey)}')
    midrib = f'M{f(p0[0])} {f(p0[1])} Q{f(p1[0])} {f(p1[1])} {f(p2[0])} {f(p2[1])}'
    return outline, midrib, ' '.join(ticks)


def date_cluster(cx, top):
    """Two-cluster rule: 19 elongated dates in a hanging cone, about 75 % of the reference cluster
    (≈ 79 × 144 units against ≈ 110 × 190), i.e. about 25 % smaller."""
    rows = [2, 3, 4, 4, 3, 2, 1]
    dates = []
    for r, n in enumerate(rows):
        y = top + 18 + r * 19
        x0 = cx - (n - 1) * 9.5 + (3 if r % 2 else 0)
        for i in range(n):
            dates.append((x0 + i * 19, y))
    return dates


TRUNK = 'M262 794 C292 758 300 700 302 600 C304 470 308 380 314 326 L356 326 C362 380 366 470 368 600 C370 700 378 758 408 794 Z'


def trunk_lattice():
    """Diamond weave: two families of diagonals, clipped to the trunk outline."""
    parts = []
    for x in range(0, 760, 26):
        parts.append(f'M{x} 326 L{x - 260} 800 M{x - 260} 326 L{x} 800')
    return ' '.join(parts)


ACCENT_TILES = [(830, 300), (860, 330), (920, 400), (830, 450), (950, 470), (860, 700), (890, 730), (950, 720),
                (830, 760), (700, 150), (760, 200)]


def defs(p, pal):
    return f'''<defs>
    <linearGradient id="{p}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal['gold_hi']}"/><stop offset=".55" stop-color="{pal['gold_mid']}"/><stop offset="1" stop-color="{pal['gold_lo']}"/></linearGradient>
    <linearGradient id="{p}-gold-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{pal['gold_lo']}"/><stop offset=".5" stop-color="{pal['gold_hi']}"/><stop offset="1" stop-color="{pal['gold_lo']}"/></linearGradient>
    <linearGradient id="{p}-river1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal['river_hi']}"/><stop offset="1" stop-color="{pal['river_lo']}"/></linearGradient>
    <linearGradient id="{p}-river2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal['river2_hi']}"/><stop offset="1" stop-color="{pal['river2_lo']}"/></linearGradient>
    <linearGradient id="{p}-frond" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{pal['frond_hi']}"/><stop offset="1" stop-color="{pal['frond_lo']}"/></linearGradient>
    <linearGradient id="{p}-wordgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7E3A1"/><stop offset=".5" stop-color="#E3BE55"/><stop offset="1" stop-color="#C79E3C"/></linearGradient>
    <pattern id="{p}-tiles" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="{pal['tile']}"/><path d="M0 .75H30M.75 0V30" stroke="{pal['tile_grid']}" stroke-width="1.5"/></pattern>
  </defs>'''


def mark_group(p, pal):
    """Full-colour mark: arch (tiles, one lion), two rivers, gold post and base, palm with two date clusters."""
    out = []
    # 1. Arch body with the opening cut out (even-odd), so the background shows through the opening.
    out.append(f'<path d="{outer_arch_path()} {inner_opening_path()}" fill="url(#{p}-tiles)" fill-rule="evenodd"/>')
    accents = ''.join(f'<rect x="{x}" y="{y}" width="15" height="15"/>' for x, y in ACCENT_TILES)
    out.append(f'<g fill="{pal["tile_accent"]}" opacity=".9">{accents}</g>')
    # Lion in the right tile band (x 800-990), centred at y≈560.
    out.append(f'<g transform="translate(810 502) scale(.86)"><path d="{LION_BODY}" fill="url(#{p}-gold)" stroke="{pal["gold_detail"]}" stroke-width="1.5" stroke-linejoin="round"/>'
               f'<path d="{LION_TAIL}" fill="none" stroke="url(#{p}-gold)" stroke-width="6" stroke-linecap="round"/>'
               f'<circle cx="{LION_TUFT[0]}" cy="{LION_TUFT[1]}" r="{LION_TUFT[2]}" fill="url(#{p}-gold)"/>'
               f'<circle cx="{LION_EYE[0]}" cy="{LION_EYE[1]}" r="{LION_EYE[2]}" fill="{pal["gold_detail"]}"/>'
               f'<path d="{LION_DETAIL}" fill="none" stroke="{pal["gold_detail"]}" stroke-width="2.4" stroke-linecap="round"/></g>')
    # 2. Gold frame: outer contour, inner opening, the band divider and the post (uniform widths).
    out.append(f'<path d="{outer_arch_path()}" fill="none" stroke="url(#{p}-gold)" stroke-width="12" stroke-linejoin="round"/>')
    out.append(f'<path d="M{IN_L} 794 L{IN_L} {IN_SPRING} A{f(IN_R_RADIUS)} {f(IN_R_RADIUS)} 0 0 1 '
               f'{f(arch_apex(IN_L, IN_R, IN_SPRING, IN_R_RADIUS)[0])} {f(arch_apex(IN_L, IN_R, IN_SPRING, IN_R_RADIUS)[1])} '
               f'A{f(IN_R_RADIUS)} {f(IN_R_RADIUS)} 0 0 1 {IN_R} {IN_SPRING} L{IN_R} 794" fill="none" '
               f'stroke="url(#{p}-gold)" stroke-width="10" stroke-linejoin="round"/>')
    # 3. Two rivers, flowing from the palm side into the arch. Gold edges, no shadow.
    out.append(f'<path d="{RIVERS[0]}" fill="url(#{p}-river1)" stroke="{pal["gold_line"]}" stroke-width="5" stroke-linejoin="round"/>')
    out.append(f'<path d="{RIVERS[1]}" fill="url(#{p}-river2)" stroke="{pal["gold_line"]}" stroke-width="5" stroke-linejoin="round"/>')
    out.append(f'<rect x="434" y="{IN_SPRING}" width="12" height="{BASE_Y - IN_SPRING}" fill="url(#{p}-gold-h)"/>')
    out.append(f'<rect x="236" y="{BASE_Y}" width="760" height="12" rx="2" fill="url(#{p}-gold-h)"/>')
    # 4. Palm trunk with the woven lattice.
    out.append(f'<path d="{TRUNK}" fill="{pal["trunk"]}" stroke="url(#{p}-gold)" stroke-width="5" stroke-linejoin="round"/>')
    out.append(f'<clipPath id="{p}-trunk-clip"><path d="{TRUNK}"/></clipPath>')
    out.append(f'<path d="{trunk_lattice()}" clip-path="url(#{p}-trunk-clip)" fill="none" stroke="url(#{p}-gold)" stroke-width="3"/>')
    # 5. Fronds (back to front: outer first, the vertical one last).
    order = sorted(range(len(FRONDS)), key=lambda i: -abs(FRONDS[i][0] - 90))
    for i in order:
        outline, midrib, ticks = frond(*CROWN, *FRONDS[i])
        out.append(f'<g><path d="{outline}" fill="url(#{p}-frond)" stroke="url(#{p}-gold)" stroke-width="3" stroke-linejoin="round"/>'
                   f'<path d="{ticks}" stroke="url(#{p}-gold)" stroke-width="2.8" stroke-linecap="round" fill="none"/>'
                   f'<path d="{midrib}" stroke="url(#{p}-gold)" stroke-width="4" stroke-linecap="round" fill="none"/></g>')
    # 6. Two balanced, smaller date clusters on gold stems.
    for cx, stem in ((262, 'M330 326 C300 338 272 352 264 392'), (392, 'M340 326 C368 338 388 352 392 392')):
        out.append(f'<path d="{stem}" fill="none" stroke="url(#{p}-gold)" stroke-width="5" stroke-linecap="round"/>')
        dates = ''.join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="9" ry="13.5"/>' for x, y in date_cluster(cx, 388))
        out.append(f'<g fill="url(#{p}-gold)" stroke="{pal["gold_detail"]}" stroke-width="1.6">{dates}</g>')
    out.append(f'<circle cx="{CROWN[0]}" cy="{CROWN[1]}" r="14" fill="url(#{p}-gold)"/>')
    return '\n  '.join(out)


# ------------------------------------------------------------------ monochrome (one colour, knockouts via mask)
def mono_mask_content(stroke_k=7):
    """White = ink, black = knockout. Later elements cover earlier ones; palm and rivers get a halo."""
    w, k = 'white', 'black'
    o = [f'<path d="{outer_arch_path()} {inner_opening_path()}" fill="{w}" fill-rule="evenodd"/>',
         f'<path d="M{IN_R} 400 V794" stroke="{k}" stroke-width="7"/>',
         f'<path d="{outer_arch_path()}" fill="none" stroke="{w}" stroke-width="12" stroke-linejoin="round"/>',
         f'<g transform="translate(810 502) scale(.86)"><path d="{LION_BODY}" fill="{k}" stroke="{k}" stroke-width="2"/>'
         f'<path d="{LION_TAIL}" fill="none" stroke="{k}" stroke-width="6" stroke-linecap="round"/>'
         f'<circle cx="{LION_TUFT[0]}" cy="{LION_TUFT[1]}" r="{LION_TUFT[2]}" fill="{k}"/></g>',
         f'<path d="M{IN_L - 6} 404 L{OUTER_L + 8} 404" stroke="{k}" stroke-width="0"/>']
    for d in RIVERS:
        o.append(f'<path d="{d}" fill="{w}" stroke="{k}" stroke-width="{stroke_k * 2}" paint-order="stroke" stroke-linejoin="round"/>')
        o.append(f'<path d="{d}" fill="{w}"/>')
    o.append(f'<rect x="434" y="{IN_SPRING}" width="12" height="{BASE_Y - IN_SPRING}" fill="{w}"/>')
    o.append(f'<rect x="236" y="{BASE_Y}" width="760" height="12" fill="{w}"/>')
    o.append(f'<path d="{TRUNK}" fill="{w}" stroke="{k}" stroke-width="{stroke_k * 2}" paint-order="stroke"/>')
    o.append(f'<path d="{TRUNK}" fill="{w}"/>')
    o.append(f'<clipPath id="mono-trunk-clip"><path d="{TRUNK}"/></clipPath>')
    o.append(f'<path d="{trunk_lattice()}" clip-path="url(#mono-trunk-clip)" fill="none" stroke="{k}" stroke-width="4"/>')
    order = sorted(range(len(FRONDS)), key=lambda i: -abs(FRONDS[i][0] - 90))
    for i in order:
        outline, midrib, _ = frond(*CROWN, *FRONDS[i])
        o.append(f'<path d="{outline}" fill="{w}" stroke="{k}" stroke-width="{stroke_k}" paint-order="stroke"/>')
        o.append(f'<path d="{midrib}" fill="none" stroke="{k}" stroke-width="3.5"/>')
    for cx, stem in ((262, 'M330 326 C300 338 272 352 264 392'), (392, 'M340 326 C368 338 388 352 392 392')):
        o.append(f'<path d="{stem}" fill="none" stroke="{w}" stroke-width="5"/>')
        o.append(''.join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="9" ry="13.5" fill="{w}" stroke="{k}" stroke-width="3"/>'
                         for x, y in date_cluster(cx, 388)))
    o.append(f'<circle cx="{CROWN[0]}" cy="{CROWN[1]}" r="14" fill="{w}"/>')
    return '\n    '.join(o)


# ------------------------------------------------------------------ simplified icon (app icon / favicon / ≤64 px)
ICON_ARCH_OUT = 'M46 100 V54 A46 46 0 0 1 76 19.1 A46 46 0 0 1 106 54 V100 Z'
ICON_ARCH_IN = 'M56 100 V58 A25.2 25.2 0 0 1 74 40.4 A25.2 25.2 0 0 1 92 58 V100 Z'
ICON_TRUNK = 'M19 100 C23 90 25.5 74 26.5 46 L31.5 46 C32.5 74 35 90 39 100 Z'
ICON_FRONDS = [(200, 27, 15, 10), (166, 27, 8, 10), (131, 25, 3, 9), (96, 27, 0, 9), (60, 24, 5, 9), (22, 22, 12, 9)]


def icon_svg(background: bool, size_label: str):
    """Geometric palm + arch + two river lines on a 120×120 grid, same layout as the full mark.
    No lion, no tiles, no text, no gradients: legible from 16 px."""
    bg = '<rect width="120" height="120" rx="26" fill="#0B2450"/>' if background else ''
    gold, tile, opening, river = '#D9B54A', '#1E5AA8', '#F8F6F1', '#1E5AA8'
    fronds = ''.join(f'<path d="{frond(29, 45, *fr)[0]}"/>' for fr in ICON_FRONDS)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-labelledby="t">
  <title id="t">IQDI — Iraqi Digital Identity (TEST ONLY){size_label}</title>
  {bg}
  <path d="{ICON_ARCH_OUT} {ICON_ARCH_IN}" fill="{tile}" fill-rule="evenodd" stroke="{gold}" stroke-width="3" stroke-linejoin="round"/>
  <path d="{ICON_ARCH_IN}" fill="{opening}" stroke="{gold}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M58.5 67 C67 67 70 77 89.5 77 M58.5 83 C67 83 70 93 89.5 93" fill="none" stroke="{river}" stroke-width="6.5" stroke-linecap="round"/>
  <rect x="12" y="99" width="97" height="5" rx="1.5" fill="{gold}"/>
  <path d="{ICON_TRUNK}" fill="{gold}"/>
  <g fill="{gold}">{fronds}</g>
  <circle cx="29" cy="45" r="3.2" fill="{gold}"/>
</svg>
'''


# ------------------------------------------------------------------ text → outlines
class Outliner:
    def __init__(self, font_path: Path):
        tt = TTFont(str(font_path))
        tt.flavor = None
        buf = io.BytesIO()
        tt.save(buf)
        self.tt = TTFont(io.BytesIO(buf.getvalue()))
        self.face = hb.Face(buf.getvalue())
        self.font = hb.Font(self.face)
        self.upem = self.tt['head'].unitsPerEm
        self.glyphs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()

    def path(self, text, size, x, y, tracking=0.0, rtl=False, anchor='middle'):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        if rtl:
            buf.direction = 'rtl'
        hb.shape(self.font, buf, {'kern': True, 'liga': True})
        scale = size / self.upem
        pos, items = 0.0, []
        for info, p in zip(buf.glyph_infos, buf.glyph_positions):
            items.append((self.order[info.codepoint], pos + p.x_offset, p.y_offset))
            pos += p.x_advance + tracking * self.upem
        width = (pos - tracking * self.upem) * scale
        start = x - width / 2 if anchor == 'middle' else x
        d = []
        for name, gx, gy in items:
            pen = SVGPathPen(self.glyphs)
            tp = TransformPen(pen, (scale, 0, 0, -scale, start + gx * scale, y - gy * scale))
            self.glyphs[name].draw(tp)
            d.append(pen.getCommands())
        return ' '.join(s for s in d if s), width


def wordmark(p, pal, latin_bold, latin_reg, arabic, mono=False):
    cx = 520
    iqdi, w = latin_bold.path('IQDI', 262, cx, 1062, tracking=0.03)
    ar, _ = arabic.path('الهوية الرقمية العراقية', 78, cx, 1244, rtl=True)
    tag, tw = latin_reg.path('IRAQ DIGITAL IDENTITY', 42, cx, 1316, tracking=0.32)
    if mono:
        return (f'<path d="{iqdi}"/>\n  <path d="{ar}"/>\n  <path d="{tag}"/>\n'
                f'  <path d="M{f(cx - 230)} 1350 H{f(cx - 22)} M{f(cx + 22)} 1350 H{f(cx + 230)}" stroke="currentColor" stroke-width="3"/>'
                f'<path d="M{cx} 1338 L{cx + 12} 1350 L{cx} 1362 L{cx - 12} 1350 Z"/>')
    fill = pal['word_fill'].format(p=p)
    return (f'<path d="{iqdi}" fill="{fill}" stroke="{pal["word_rim"]}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"/>\n'
            f'  <path d="{ar}" fill="{pal["arabic"]}"/>\n'
            f'  <path d="{tag}" fill="{pal["tagline"]}"/>\n'
            f'  <path d="M{f(cx - 230)} 1350 H{f(cx - 22)} M{f(cx + 22)} 1350 H{f(cx + 230)}" stroke="{pal["divider"]}" stroke-width="3"/>'
            f'<path d="M{cx} 1338 L{cx + 12} 1350 L{cx} 1362 L{cx - 12} 1350 Z" fill="{pal["divider"]}"/>')


HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- IQDI brand asset — TEST ONLY project, not a government mark. Generated by tools/branding/generate_brand.py; edit the generator, not this file. -->\n'
MARK_VB = '0 10 1040 810'
LOGO_VB = '0 10 1040 1372'


def write(name, body):
    (OUT / name).write_text(HEADER + body, encoding='utf-8')
    print('wrote', name, len(body), 'bytes')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cinzel-dir', required=True)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    cz = Path(args.cinzel_dir)
    latin_bold = Outliner(cz / 'cinzel-latin-700-normal.woff')
    latin_reg = Outliner(cz / 'cinzel-latin-400-normal.woff')
    arabic = Outliner(ARABIC_FONT)
    title = 'IQDI — Iraqi Digital Identity | الهوية الرقمية العراقية (TEST ONLY)'
    for pal in (ORIGINAL, DARK):
        p = f'iqdi-{pal["name"]}'
        write(f'iqdi-mark-{pal["name"]}.svg',
              f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{MARK_VB}" role="img" aria-labelledby="{p}-t">\n'
              f'  <title id="{p}-t">{title}</title>\n  {defs(p, pal)}\n  {mark_group(p, pal)}\n</svg>\n')
        write(f'iqdi-logo-{pal["name"]}.svg',
              f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{LOGO_VB}" role="img" aria-labelledby="{p}-t">\n'
              f'  <title id="{p}-t">{title}</title>\n  {defs(p, pal)}\n  {mark_group(p, pal)}\n'
              f'  {wordmark(p, pal, latin_bold, latin_reg, arabic)}\n</svg>\n')
    mask = mono_mask_content()
    write('iqdi-mark-monochrome.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{MARK_VB}" role="img" aria-labelledby="mono-t" color="#000">\n'
          f'  <title id="mono-t">{title}</title>\n'
          f'  <mask id="iqdi-mono-m" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="900">\n    {mask}\n  </mask>\n'
          f'  <rect x="0" y="0" width="1100" height="900" fill="currentColor" mask="url(#iqdi-mono-m)"/>\n</svg>\n')
    write('iqdi-logo-monochrome.svg',
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{LOGO_VB}" role="img" aria-labelledby="mono-t" color="#000">\n'
          f'  <title id="mono-t">{title}</title>\n'
          f'  <mask id="iqdi-mono-m" maskUnits="userSpaceOnUse" x="0" y="0" width="1100" height="900">\n    {mask}\n  </mask>\n'
          f'  <rect x="0" y="0" width="1100" height="900" fill="currentColor" mask="url(#iqdi-mono-m)"/>\n'
          f'  <g fill="currentColor">\n  {wordmark("mono", {}, latin_bold, latin_reg, arabic, mono=True)}\n  </g>\n</svg>\n')
    (OUT / 'iqdi-icon-small.svg').write_text(HEADER + icon_svg(False, ''), encoding='utf-8')
    (OUT / 'iqdi-app-icon.svg').write_text(HEADER + icon_svg(True, ''), encoding='utf-8')
    print('wrote iqdi-icon-small.svg, iqdi-app-icon.svg')


if __name__ == '__main__':
    main()
