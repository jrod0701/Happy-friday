#!/bin/bash
# Builds index.html from src/. Run: bash build.sh
cd "$(dirname "$0")"
JS="engine.js lob.js sniper.js summit.js kong.js topdown.js wheelman.js mayhem.js duel.js boxart.js arcade.js app.js"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'
  cat src/shell.html; echo '<script>'; echo "'use strict';"; (cd src && cat $JS); echo '</script></body></html>'; } > index.html
{ echo "'use strict';"; (cd src && cat $JS); } > /tmp/_chk.js && node --check /tmp/_chk.js && echo "built index.html OK"
