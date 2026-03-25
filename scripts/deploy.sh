#!/bin/bash
# Deploy no-more-fomo HTML digests to freemty.github.io
# Usage: bash scripts/deploy.sh

set -e

SRC=~/no-more-fomo
DEST=~/code/projects/freemty.github.io/fomo

mkdir -p "$DEST"
rsync -av --include='*.html' --exclude='*' "$SRC/" "$DEST/"

cd ~/code/projects/freemty.github.io
git add fomo/
if git diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi
git commit -m "fomo: update digests $(date +%Y-%m-%d)"
git push
echo "Deployed to https://freemty.github.io/fomo/"
