# KNOWN_LIMITATIONS

1. **The vector redraw is not identical to the concept image.**
   - It has flat shapes with gradients, not the reference's 3-D lighting.
   - The dark region's top edge is straight rather than softly curved.
   - The fold tab is simplified.
   - Details are in `LOGO_GEOMETRY_AND_ASSETS.md`.
2. **The palette was tuned by eye** against the rendered reference, starting from the requested values (`#0B2A4A`, `#1565C0`, `#D4A853`, `#F8F7F4`). The reference is a lit render with no single true colour.
3. **Small sizes:**
   - 16 px is a silhouette (head + blue + gold);
   - 24 px is borderline;
   - 32 px and up are clear;
   - in Dark at ≤ 24 px, the navy pieces merge with the background.
4. **Dark navy body contrast** against the night background is 1.46 : 1. The silhouette relies on the head, the blue band and the gold.
5. **Tagline:** «People First • Human Centered» is about 10 px at the 248 px welcome size. That is readable but small. It is never placed in icons or small placements.
6. **Print:**
   - not print-ready: RGB only, with no CMYK or Pantone conversion and no proofs;
   - the monochrome masters are the starting point for single-colour print.
7. **No device installation tests:**
   - PWA icons, the apple-touch icon and maskable cropping were checked for size and served type only;
   - they were not installed on Android or iOS.
8. **No manual screen-reader or user testing** of the brand placements.
9. **Trademark:** the logo's quality says nothing about whether it can be registered. No trademark search was done.
10. **Regenerating the artwork** needs Montserrat (`npm pack @fontsource/montserrat@5.3.0`) and the Python tools `fonttools`, `uharfbuzz` and `brotli`. CI checks the committed outputs; it does not regenerate them.
11. **Verifier sidebar lockup** is hidden on windows ≤ 760 px high and on the ≤ 860 px tab-bar layout, by design. The header symbol remains.
12. **The PR stack is unmerged** (#5–#15). Merge order and whether to keep PR #14 are the owner's decision.
13. **Not tested:**
   - Safari, macOS and iOS: NOT RUN;
   - Firefox and WebKit run the responsive matrix in CI, while the brand browser check runs in Chromium/Chrome only.
