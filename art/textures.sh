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

# Space: Hubble's Ultra Deep Field (NASA/ESA). Every point of light here is a real galaxy.
mkdir -p $P/space
N=source/nasa/GSFC_20171208_Archive_e001061.jpg
magick $N -gravity center -crop 2000x2000+0+0 +repage -level 7%,100% -resize 2048x2048! out/field.png
# One object that isn't NASA's. Credited as mine in CREDITS.md.
magick -size 72x120 xc:none \
  -fill '#17388f' -draw 'rectangle 6,14 66,118' \
  -fill '#2b55c4' -draw 'rectangle 2,8 70,18' \
  -fill '#9fc0ff' -draw 'rectangle 14,28 30,44 rectangle 42,28 58,44' \
  -fill '#fff6d8' -draw 'rectangle 30,0 42,8' \
  -background none -rotate 14 -blur 0x2 -resize 12.5% out/box.png
magick out/field.png out/box.png -geometry +905+1190 -composite -quality 74 $P/space/field.webp
magick $N -gravity center -crop 2000x1500+0+0 +repage -level 7%,100% -resize 1500x -evaluate multiply 0.32 -quality 62 $P/space/dim.webp
