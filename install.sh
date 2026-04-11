#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
REPO_URL="https://github.com/transportrefer/better-opencode-btw"
TMPDIR=$(mktemp -d)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[btw]${NC} $*"; }
warn()  { echo -e "${YELLOW}[btw]${NC} $*"; }
error() { echo -e "${RED}[btw]${NC} $*" >&2; exit 1; }

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo ""
echo "  🧠 better-opencode-btw installer"
echo ""

# Create directories
mkdir -p "$CONFIG_DIR/commands" "$CONFIG_DIR/agents" "$CONFIG_DIR/plugins"

# Download files from GitHub
info "Downloading files..."
for file in commands/btw.md agents/btw.md plugins/btw.ts; do
  url="$REPO_URL/raw/main/$file"
  dest="$CONFIG_DIR/$file"
  
  if [ -f "$dest" ]; then
    warn "Existing file found: $dest"
    read -rp "       Overwrite? [y/N] " choice
    case "$choice" in
      y|Y) ;;
      *) info "Skipping $file"; continue ;;
    esac
  fi
  
  if command -v curl &>/dev/null; then
    curl -fsSL "$url" -o "$dest" || error "Failed to download $file"
  elif command -v wget &>/dev/null; then
    wget -q "$url" -O "$dest" || error "Failed to download $file"
  else
    error "Neither curl nor wget found. Please install one."
  fi
  
  info "Installed $file"
done

# Ensure @opencode-ai/plugin is available
info "Ensuring @opencode-ai/plugin dependency..."
cd "$CONFIG_DIR"

if [ -f "package.json" ]; then
  if ! grep -q '"@opencode-ai/plugin"' package.json 2>/dev/null; then
    if command -v node &>/dev/null; then
      node -e "
        const pkg = require('./package.json');
        if (!pkg.dependencies) pkg.dependencies = {};
        pkg.dependencies['@opencode-ai/plugin'] = 'latest';
        require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
      "
    fi
  fi
else
  cat > package.json <<'PKGJSON'
{
  "dependencies": {
    "@opencode-ai/plugin": "latest"
  }
}
PKGJSON
fi

# Install dependencies
if command -v bun &>/dev/null; then
  bun install 2>/dev/null || npm install 2>/dev/null || warn "Could not install dependencies automatically. Run 'cd $CONFIG_DIR && npm install' manually."
elif command -v npm &>/dev/null; then
  npm install 2>/dev/null || warn "Could not install dependencies automatically. Run 'cd $CONFIG_DIR && npm install' manually."
else
  warn "Neither bun nor npm found. Install @opencode-ai/plugin manually."
fi

echo ""
info "✅ Done! /btw is now available in opencode."
info "Restart opencode to pick up the changes."
echo ""
info "Usage: /btw <your question>"
echo ""
