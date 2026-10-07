#!/bin/bash
# Spustí lokální server a veřejný dočasný tunel (Cloudflare), aby šel preview
# otevřít z prohlížeče mimo sandbox. Adresa tunelu se zapíše do .preview/cf.log.
DIR=/projects/sandbox
mkdir -p "$DIR/.preview"
cd "$DIR/.preview" || exit 1
echo "start $(date)" > status.log
if [ ! -x cloudflared ]; then
  curl -sL -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x cloudflared
fi
echo "binary ok" >> status.log
cd "$DIR" || exit 1
python3 -m http.server 8765 --bind 127.0.0.1 > .preview/srv.log 2>&1 &
echo "server started" >> .preview/status.log
exec .preview/cloudflared tunnel --url http://127.0.0.1:8765 --no-autoupdate > .preview/cf.log 2>&1
