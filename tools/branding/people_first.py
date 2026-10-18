#!/usr/bin/env python3
"""IQDI «People First — Human Centered» brand generator. Builds every SVG in assets/branding/people-first/.

Source of truth: the owner-approved People First reference (primary logo, dark version, app icon,
horizontal lockup). This is a geometric vector redraw of that symbol, not a trace and not a new design:
  - a head circle above a large circular "bowl" (the person);
  - a bright royal-blue band on the left whose top folds over (the dark fold tab);
  - a deep-navy interior;
  - a gold leaf rising from the bottom to a tip at the upper right (care, service);
  - a V-shaped negative space between the head and the body.
One geometry is shared by Light, Dark, Monochrome and the compact mark; only paint and, for the compact
mark, the gap widths change. Text is converted to outlines (Montserrat, Noto Sans Arabic: SIL OFL 1.1).

Usage (TEST ONLY; requires fonttools, uharfbuzz, brotli):
  npm pack @fontsource/montserrat@5.3.0 && tar xzf fontsource-montserrat-5.3.0.tgz
  python3 tools/branding/people_first.py --montserrat-dir package/files
"""
from __future__ import annotations

import argparse
import io
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'branding' / 'people-first'
ARABIC_FONT = ROOT / 'node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff'

# ------------------------------------------------------------------ palettes (design tokens)
LIGHT = {
    'name': 'light',
    'head': ('#2A86DA', '#0B4A8F'), 'band': ('#1A86DC', '#0D4C93'), 'fold': '#0B2A4A',
    'body': ('#051B36', '#0B3D78'), 'gold': ('#F6DCA2', '#D9AE5E', '#A97A2E'),
    'word': '#0B2A4A', 'arabic': '#0B2A4A', 'latin': '#22324A', 'divider': '#D4A853', 'tagline': '#22324A',
}
DARK = {
    'name': 'dark',
    # On night navy the body must stay lighter than the background, and the blue band brighter.
    'head': ('#3C98EC', '#1565C0'), 'band': ('#33A0F2', '#1667C2'), 'fold': '#123D6B',
    'body': ('#123B69', '#1E5FA6'), 'gold': ('#FAE4B4', '#E2BA6C', '#BC8F42'),
    'word': '#FFFFFF', 'arabic': '#F3F1EC', 'latin': '#D9DEE6', 'divider': '#E0B867', 'tagline': '#D9DEE6',
}

# ------------------------------------------------------------------ the symbol (one geometry), 660 × 660 grid
HEAD = (340, 120, 106)                       # cx, cy, r
BOWL = (332, 352, 300)                       # the body circle
T1 = (75, 197)                               # top-left tip of the blue band (on the bowl circle)
# The body's upper-right boundary runs *inside* the gold leaf (covered by it), so no anti-aliased seam of the
# navy can show along the gold's visible edge.
BODY = ('M75 197 A300 300 0 1 0 632 352 C600 330 562 300 540 300 '
        'C460 310 360 340 310 410 L140 215 C120 205 95 198 75 197 Z')
BAND = 'M75 197 A300 300 0 0 0 262 648 C220 560 190 400 176 262 C170 230 148 208 118 200 Z'
FOLD = 'M80 195 L116 176 C124 172 131 177 131 186 L133 214 C120 204 100 197 80 195 Z'
GOLD = ('M602 185 C470 215 330 300 285 420 C262 482 254 560 262 648 '
        'A300 300 0 0 0 318 651.7 C380 520 500 410 632 352 C640 290 628 220 602 185 Z')
GOLD_INNER_EDGE = 'M602 185 C470 215 330 300 285 420 C262 482 254 560 262 648'
BAND_INNER_EDGE = 'M262 648 C220 560 190 400 176 262 C170 230 148 208 118 200'
SYMBOL_VB = '20 0 640 660'


def defs(p, pal):
    h0, h1 = pal['head']
    b0, b1 = pal['band']
    n0, n1 = pal['body']
    g0, g1, g2 = pal['gold']
    return f'''<defs>
    <linearGradient id="{p}-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{h0}"/><stop offset="1" stop-color="{h1}"/></linearGradient>
    <linearGradient id="{p}-band" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="{b0}"/><stop offset="1" stop-color="{b1}"/></linearGradient>
    <linearGradient id="{p}-body" x1=".15" y1=".1" x2=".95" y2=".9"><stop offset="0" stop-color="{n0}"/><stop offset="1" stop-color="{n1}"/></linearGradient>
    <linearGradient id="{p}-gold" x1="0" y1=".55" x2="1" y2=".35"><stop offset="0" stop-color="{g0}"/><stop offset=".5" stop-color="{g1}"/><stop offset="1" stop-color="{g2}"/></linearGradient>
  </defs>'''


def symbol_group(p, pal):
    """Full-colour symbol, back to front: head, navy body, blue band, fold tab, gold leaf."""
    return '\n  '.join([
        f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2]}" fill="url(#{p}-head)"/>',
        f'<path d="{BODY}" fill="url(#{p}-body)"/>',
        f'<path d="{BAND}" fill="url(#{p}-band)"/>',
        f'<path d="{FOLD}" fill="{pal["fold"]}"/>',
        f'<path d="{GOLD}" fill="url(#{p}-gold)"/>',
    ])


def mono_mask(gap_gold=14, gap_band=10):
    """White = ink, black = knock-out. Separates band, body and gold so the meaning survives in one colour."""
    return '\n    '.join([
        f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2]}" fill="white"/>',
        f'<path d="{BODY}" fill="white"/>',
        f'<path d="{BAND}" fill="white"/>',
        f'<path d="{BAND_INNER_EDGE}" fill="none" stroke="black" stroke-width="{gap_band}" stroke-linecap="round"/>',
        f'<path d="{FOLD}" fill="white" stroke="black" stroke-width="6" paint-order="stroke"/>',
        f'<path d="{GOLD}" fill="white" stroke="black" stroke-width="{gap_gold}" paint-order="stroke" stroke-linejoin="round"/>',
        f'<path d="{GOLD}" fill="white"/>',
    ])


def compact_group(pal):
    """≤ 24 px mark: same shapes, flat colours, no fold tab, wider gaps (a halo in the body colour cannot
    be used on transparent backgrounds, so the gold gets a gap cut with a mask)."""
    n = pal['body'][0]
    return f'''<mask id="cm-{pal["name"]}" maskUnits="userSpaceOnUse" x="0" y="0" width="680" height="680">
    <rect width="680" height="680" fill="white"/>
    <path d="{GOLD}" fill="black" stroke="black" stroke-width="34" stroke-linejoin="round"/>
    <path d="{BAND_INNER_EDGE}" fill="none" stroke="black" stroke-width="22" stroke-linecap="round"/>
  </mask>
  <circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2] + 6}" fill="{pal["head"][1]}"/>
  <g mask="url(#cm-{pal["name"]})"><path d="{BODY}" fill="{n}"/><path d="{BAND}" fill="{pal["band"][0]}"/></g>
  <path d="{GOLD}" fill="{pal["gold"][1]}"/>'''


# ------------------------------------------------------------------ text → outlines
class Outliner:
    def __init__(self, font_path: Path):
        tt = TTFont(str(font_path))
        tt.flavor = None
        buf = io.BytesIO()
        tt.save(buf)
        self.tt = TTFont(io.BytesIO(buf.getvalue()))
        self.font = hb.Font(hb.Face(buf.getvalue()))
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
        for info, gp in zip(buf.glyph_infos, buf.glyph_positions):
            items.append((self.order[info.codepoint], pos + gp.x_offset, gp.y_offset))
            pos += gp.x_advance + tracking * self.upem
        width = (pos - tracking * self.upem) * scale
        start = {'middle': x - width / 2, 'start': x, 'end': x - width}[anchor]
        out = []
        for name, gx, gy in items:
            pen = SVGPathPen(self.glyphs)
            self.glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, start + gx * scale, y - gy * scale)))
            out.append(pen.getCommands())
        return ' '.join(s for s in out if s), width


HEADER = ('<?xml version="1.0" encoding="UTF-8"?>\n<!-- IQDI «People First» brand asset — TEST ONLY prototype, not a government mark. '
          'Generated by tools/branding/people_first.py; edit the generator, not this file. -->\n')
TITLE = 'IQDI — Iraqi Digital Identity | الهوية الرقمية العراقية (TEST ONLY)'


def svg(view_box, body, label_id, extra_attr=''):
    return (f'{HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-labelledby="{label_id}"{extra_attr}>\n'
            f'  <title id="{label_id}">{TITLE}</title>\n  {body}\n</svg>\n')


def place(inner, tx, ty, s):
    return f'<g transform="translate({tx} {ty}) scale({s})">{inner}</g>'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--montserrat-dir', required=True)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    m = Path(a.montserrat_dir)
    bold, semi, reg = (Outliner(m / f'montserrat-latin-{w}-normal.woff') for w in (700, 600, 400))
    arabic = Outliner(ARABIC_FONT)
    files = {}

    def write(name, text):
        (OUT / name).write_text(text, encoding='utf-8')
        files[name] = len(text)

    for pal in (LIGHT, DARK):
        n = pal['name']
        p = f'iqdi-{n}'
        sym = symbol_group(p, pal)
        write(f'iqdi-symbol-{n}.svg', svg(SYMBOL_VB, f'{defs(p, pal)}\n  {sym}', f'{p}-t'))

        # Primary (vertical): symbol, IQDI, Arabic name, IRAQI DIGITAL IDENTITY, gold rule, optional tagline.
        cx = 500
        iqdi, _ = bold.path('IQDI', 210, cx, 690)
        ar, _ = arabic.path('الهوية الرقمية العراقية', 92, cx, 820, rtl=True)
        en, _ = semi.path('IRAQI DIGITAL IDENTITY', 38, cx, 900, tracking=0.34)
        tag, _ = reg.path('People First  •  Human Centered', 40, cx, 1034, tracking=0.04)
        text = (f'<path d="{iqdi}" fill="{pal["word"]}"/>\n  <path d="{ar}" fill="{pal["arabic"]}"/>\n'
                f'  <path d="{en}" fill="{pal["latin"]}"/>\n  <rect x="440" y="950" width="120" height="4" rx="2" fill="{pal["divider"]}"/>\n'
                f'  <path d="{tag}" fill="{pal["tagline"]}"/>')
        write(f'iqdi-primary-{n}.svg', svg('0 0 1000 1080', f'{defs(p, pal)}\n  {place(sym, 290, 20, 0.65)}\n  {text}', f'{p}-t'))

        # Horizontal lockup: symbol | rule | IQDI over the Arabic name and the English name (no tagline).
        hq, _ = bold.path('IQDI', 150, 330, 150, anchor='start')
        har, har_w = arabic.path('الهوية الرقمية العراقية', 58, 330, 236, rtl=True, anchor='start')
        hen, hen_w = semi.path('IRAQI DIGITAL IDENTITY', 24, 332, 286, tracking=0.3, anchor='start')
        htext = (f'<rect x="292" y="22" width="3" height="270" rx="1.5" fill="{pal["divider"]}"/>\n'
                 f'  <path d="{hq}" fill="{pal["word"]}"/>\n  <path d="{har}" fill="{pal["arabic"]}"/>\n  <path d="{hen}" fill="{pal["latin"]}"/>')
        hw = int(max(332 + hen_w, 330 + har_w, 700) + 12)
        write(f'iqdi-horizontal-{n}.svg', svg(f'0 0 {hw} 310', f'{defs(p, pal)}\n  {place(sym, -6, 6, 0.455)}\n  {htext}', f'{p}-t'))

        # Compact mark (≤ 24 px): same structure, flat colours, wider gaps, no fold tab.
        write(f'iqdi-symbol-compact{"" if n == "light" else "-dark"}.svg', svg(SYMBOL_VB, compact_group(pal), f'cm-{n}-t'))

        # App icons: rounded square (off-white for light, night navy for dark) with the symbol in the safe zone.
        bg = '#F8F7F4' if n == 'light' else '#0B1F38'
        inner = symbol_group(p, pal)
        write(f'iqdi-app-icon-{n}.svg', svg('0 0 1024 1024', f'{defs(p, pal)}\n  <rect width="1024" height="1024" rx="228" fill="{bg}"/>\n  {place(inner, 182, 170, 1.04)}', f'{p}-t'))

    # Monochrome: one colour through a mask; set `color` (or CSS color) for black-on-white / white-on-black.
    mm = mono_mask()
    mono_sym = (f'<mask id="iqdi-mono-m" maskUnits="userSpaceOnUse" x="0" y="0" width="680" height="680">\n    {mm}\n  </mask>\n'
                f'  <rect x="0" y="0" width="680" height="680" fill="currentColor" mask="url(#iqdi-mono-m)"/>')
    write('iqdi-symbol-monochrome.svg', svg(SYMBOL_VB, mono_sym, 'mono-t', ' color="#000"'))
    iqdi, _ = bold.path('IQDI', 210, 500, 690)
    ar, _ = arabic.path('الهوية الرقمية العراقية', 92, 500, 820, rtl=True)
    en, _ = semi.path('IRAQI DIGITAL IDENTITY', 38, 500, 900, tracking=0.34)
    write('iqdi-primary-monochrome.svg', svg('0 0 1000 960', f'{place(mono_sym, 290, 20, 0.65)}\n  <g fill="currentColor"><path d="{iqdi}"/><path d="{ar}"/><path d="{en}"/></g>', 'mono-t', ' color="#000"'))
    hq, _ = bold.path('IQDI', 150, 330, 150, anchor='start')
    har, har_w = arabic.path('الهوية الرقمية العراقية', 58, 330, 236, rtl=True, anchor='start')
    hen, hen_w = semi.path('IRAQI DIGITAL IDENTITY', 24, 332, 286, tracking=0.3, anchor='start')
    hw = int(max(332 + hen_w, 330 + har_w, 700) + 12)
    write('iqdi-horizontal-monochrome.svg', svg(f'0 0 {hw} 310', f'{place(mono_sym, -6, 6, 0.455)}\n  <g fill="currentColor"><rect x="292" y="22" width="3" height="270" rx="1.5"/><path d="{hq}"/><path d="{har}"/><path d="{hen}"/></g>', 'mono-t', ' color="#000"'))

    # Favicon: the compact mark on a tight off-white tile (the tile keeps the navy visible on dark browser tabs;
    # the compact mark's wider gaps survive 16 px).
    write('iqdi-favicon.svg', svg('0 0 680 680', f'<rect width="680" height="680" rx="150" fill="#F8F7F4"/>\n  {place(compact_group(LIGHT), 30, 28, 0.95)}', 'fav-t'))
    for k, v in sorted(files.items()):
        print(f'wrote {k} ({v} bytes)')


if __name__ == '__main__':
    main()
