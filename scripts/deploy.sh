#!/usr/bin/env bash
# Namesti trenutni commit (HEAD) na https://faks.2-28-52-70.sslip.io
#
#   npm run deploy
#
# Strežnik nima dostopa do tega repozitorija, zato kodo prenesemo kar prek SSH.
# Necommitane spremembe se NE prenesejo — najprej commitaj.
set -euo pipefail

HOST="${FAKS_HOST:-root@2.28.52.70}"
DIR=/srv/helpdesk-faks

cd "$(git rev-parse --show-toplevel)"
echo "→ $(git log -1 --format='%h %s') → $HOST:$DIR"
git archive --format=tar HEAD | ssh "$HOST" "set -e; mkdir -p $DIR/src-new; tar -x -C $DIR/src-new; \
  cd $DIR; [ -f .env ] && cp .env src-new/.env; rm -rf code; mv src-new code; \
  cd code && docker compose up -d --build && docker compose ps"
