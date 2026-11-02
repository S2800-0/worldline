#!/bin/zsh
# Adds neon bloom to the raw renders and exports the images the site uses.
set -e
cd "$(dirname "$0")"
DEST=../public/meter
mkdir -p "$DEST" out/bloom
for f in out/*.png; do
  n=${f:t:r}
  magick "$f" \
    \( +clone -level 40%,100% -blur 0x6 -evaluate multiply 0.8 \) -compose screen -composite \
    \( "$f" -level 40%,100% -blur 0x28 -evaluate multiply 0.9 \) -compose screen -composite \
    out/bloom/$n.png
  magick out/bloom/$n.png -gravity north -crop 360x670+0+0 +repage -quality 82 "$DEST/$n.webp"
done
