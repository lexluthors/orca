#!/usr/bin/env bash
set -euo pipefail

# ═══ 配置 ═══════════════════════════════════════════════
SUDO_PASSWORD="asdf"  # ← 修改为你的 sudo 密码
# ═════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."
DIST_DIR="dist"

echo "▶ 清理旧 deb..."
rm -f "$DIST_DIR"/*.deb

echo "▶ 构建..."
pnpm run build:desktop
pnpm run ensure:electron-runtime
npx electron-builder --config config/electron-builder.config.cjs --linux deb

echo "▶ 安装..."
DEB_FILE=$(ls -t "$(pwd)/$DIST_DIR"/orca-ide_*.deb | head -1)
echo "$SUDO_PASSWORD" | sudo -S apt install -y "$DEB_FILE"

echo "✓ 完成"
