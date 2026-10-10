# Happy Friday
Pixel minigame suite for the Friday crew. Single static page, no server.
- `src/` source files; `bash build.sh` builds `index.html` (needs Node only for the syntax check).
- Add a game: write `src/yourgame.js` with a `DEF_*`, add it to `JS` in build.sh and to `POOL` in `src/app.js`.
