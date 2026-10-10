#!/bin/bash
# Builds index.html from src/. Run: bash build.sh
cd "$(dirname "$0")"
JS="engine.js lob.js sniper.js summit.js kong.js topdown.js wheelman.js mayhem.js duel.js runner.js mailman.js boxart.js arcade.js app.js"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Happy Friday</title><meta name="theme-color" content="#0e0c1a"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Happy Friday"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png"><link rel="manifest" href="manifest.webmanifest"></head><body style="margin:0">'
  cat src/shell.html; echo '<script>'; echo "'use strict';"; (cd src && cat $JS); echo '</script></body></html>'; } > index.html
{ echo "'use strict';"; (cd src && cat $JS); } > /tmp/_chk.js && node --check /tmp/_chk.js && echo "built index.html OK"
