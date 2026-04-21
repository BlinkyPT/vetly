# Icon assets

Replace the placeholder SVGs with PNGs at 16, 32, 48, and 128 px before submitting to the Chrome Web Store. The logo mark is a white "V" on the Vetly green (`#1f9d55`) disc.

Command for quick generation once the SVG master exists:

```bash
for size in 16 32 48 128; do
  magick convert -background none -resize ${size}x${size} icon.svg icon-${size}.png
done
```
