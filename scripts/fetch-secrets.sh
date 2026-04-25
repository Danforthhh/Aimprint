#!/usr/bin/env bash
# Fetch encrypted secrets from the dotfiles repo.
# Skips silently if the token already exists or if running in CI.
set -e

# GitHub Actions (and most CI systems) set CI=true — nothing to fetch there
if [ "${CI}" = "true" ]; then
  exit 0
fi

TOKEN_PATH="/c/Code/.cloudflare-token"
DOTFILES_DIR="/c/Code/dotfiles"
DOTFILES_REPO="https://github.com/Danforthhh/dotfiles.git"

if [ -f "$TOKEN_PATH" ]; then
  exit 0
fi

echo ""
echo "🔑  Cloudflare token not found — fetching from dotfiles..."

if [ -d "$DOTFILES_DIR/.git" ]; then
  git -C "$DOTFILES_DIR" pull --quiet
else
  git clone --quiet "$DOTFILES_REPO" "$DOTFILES_DIR"
fi

bash "$DOTFILES_DIR/setup.sh"
echo "✓  Token ready at $TOKEN_PATH"
