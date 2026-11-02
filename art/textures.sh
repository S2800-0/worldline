#!/bin/zsh
# Turns the Met scans into the site's paper, binding and reveal mask.
set -e
cd "$(dirname "$0")"
S=source/met; P=../public
# Paper: a blank page from the Rusconi book, evened out and mirrored so it tiles.
magick $S/rusconi.jpg -crop 1440x1000+500+170 +repage \
  \( +clone -blur 0x26 \) -compose divide_src -composite \
  \( +clone -fill "#e6d9bd" -colorize 100 \) -compose multiply -composite \
  -resize 520x out/paper_a.png
magick out/paper_a.png \( +clone -flop \) +append \( +clone -flip \) -append -quality 74 $P/archivist/paper.webp
# The marbled book as an object on the Archivist's page, trimmed to its edges.
magick $S/binding.jpg -shave 110x90 -resize 900x -quality 80 $P/archivist/binding.webp
# Marbling as the reveal mask: real ink veins decide where the new page breaks through.
magick $S/binding.jpg -gravity center -crop 62%x62%+160+0 +repage -colorspace Gray \
  -resize 512x512! -normalize -blur 0x1.2 out/mask_a.png
magick out/mask_a.png \( +clone -flop \) +append \( +clone -flip \) -append -resize 1024x1024! -quality 80 $P/console/mask.webp

# Alchemist: the prints as they are, lit by a single candle from the left in a dark room.
mkdir -p $P/alchemist
plate() {
  magick "$1" -shave 110x110 -resize "$3"x -colorspace sRGB -type TrueColor -colorspace Gray -colorspace sRGB -level 6%,90% \
    \( +clone -fill "#e2a55c" -colorize 100 \) -compose multiply -composite \
    \( +clone -fill black -colorize 100 -fill white -draw "ellipse %[fx:w*0.36],%[fx:h*0.5] %[fx:w*0.36],%[fx:h*0.44] 0,360" -blur 0x110 \) \
    -compose multiply -composite -quality 66 "$P/alchemist/$2.webp"
}
plate $S/alchemist.jpg plate1 1300
plate $S/distillation.jpg plate2 1500
# Dark workshop ground: the same real paper, burnt down to almost nothing.
magick out/paper_a.png -colorspace Gray -normalize +level 80%,100% \
  \( +clone -fill "#120c07" -colorize 100 \) -compose multiply -composite out/ground_a.png
magick out/ground_a.png \( +clone -flop \) +append \( +clone -flip \) -append -quality 70 $P/alchemist/ground.webp
# A real handwritten note found in the Rusconi book, for the Archivist.
magick $S/rusconi.jpg -crop 1500x420+470+1240 +repage -resize 1100x -quality 76 $P/archivist/note.webp
