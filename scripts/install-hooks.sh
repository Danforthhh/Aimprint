#!/usr/bin/env bash
# Installs git hooks for this repo. Run automatically via `npm install`.
HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_hook() {
  local hook="$1"
  cat > "$HOOKS_DIR/$hook" <<EOF
#!/usr/bin/env bash
bash "$SCRIPT_DIR/fetch-secrets.sh"
EOF
  chmod +x "$HOOKS_DIR/$hook"
}

install_hook post-merge    # runs after git pull
install_hook post-checkout # runs after git clone / git checkout

echo "✓  Git hooks installed (post-merge, post-checkout)"
