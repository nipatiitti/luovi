#!/bin/bash
# PROTOTYPE helper: SVG -> PNG via headless Chrome
cd "$(dirname "$0")"
for f in fig-*.svg; do
  w=$(grep -o "width='[0-9]*'" "$f" | head -1 | grep -o '[0-9]*')
  h=$(grep -o "height='[0-9]*'" "$f" | head -1 | grep -o '[0-9]*')
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1.5 \
    --window-size="$w,$h" --screenshot="${f%.svg}.png" "file://$PWD/$f" >/dev/null 2>&1 && echo "rendered ${f%.svg}.png"
done
