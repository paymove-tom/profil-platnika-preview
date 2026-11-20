#!/bin/sh
# Podbija ?v=<znacznik> przy wszystkich CSS/JS w index.html (cache busting na GitHub Pages).
# Użycie: tools/bump-version.sh   (uruchom przed każdym commitem, który zmienia css/ lub js/)
cd "$(dirname "$0")/.." || exit 1
V=$(date +%s)
sed -i.bak -E "s/\?v=[0-9a-z]+/?v=$V/g" index.html && rm -f index.html.bak
echo "v=$V"
