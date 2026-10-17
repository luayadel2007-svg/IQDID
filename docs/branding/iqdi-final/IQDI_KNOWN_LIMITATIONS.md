# IQDI_KNOWN_LIMITATIONS

1. **The vector redraw is not identical to the concept image.**
   - The concept has 3-D lighting, relief and a denser crown; the masters are clean flat vectors with subtle gradients.
   - The palm crown is lighter and the lion is simplified.
   - Details are in `IQDI_LOGO_REFINEMENT_REPORT.md`.
2. **The palette was set by eye** against the rendered reference, not measured: a rendered image has no single true colour.
3. **The 16 px icon is a silhouette only.** Its two rivers merge. 24 px is borderline; 32 px and up are clear.
4. **The English tagline is decorative below about 240 px** of logo width. The welcome screen uses 232 px (Arabic name readable, tagline ≈ 9 px).
5. **Professional print readiness is not claimed:**
   - no CMYK or Pantone conversion;
   - no print proof;
   - no embroidery or engraving test.
   The SVGs are RGB. The monochrome masters are the starting point for single-colour print.
6. **No device installation tests:**
   - The PWA icons and apple-touch icon are checked for size and served type, but not installed on real Android or iOS devices.
   - Launcher masking was not observed on hardware.
7. **No manual screen-reader or user testing** of the brand placements.
8. **The fonts are needed only to regenerate the artwork:**
   - Cinzel is fetched with `npm pack @fontsource/cinzel@5.3.0`.
   - The Python tools `fonttools`, `uharfbuzz` and `brotli` are required.
   - CI does not regenerate the artwork. It checks the committed outputs.
9. **The verifier has no login screen.** No login-like brand entry was added, as the request said not to invent government authentication.
10. **Firefox and WebKit** run the responsive matrix in CI. The brand browser check (`browser-brand`) runs in Chromium and in Google Chrome on Ubuntu and Windows.
11. **Safari, macOS and iOS: NOT RUN** (no environment).
12. **The brand is the project's own visual identity.** It has no legal trademark registration and no government approval.
