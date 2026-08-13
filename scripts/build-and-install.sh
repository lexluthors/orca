#!/usr/bin/env bash
set -euo pipefail

# ═══ 配置 ═══════════════════════════════════════════════
SUDO_PASSWORD="asdf"  # ← 修改为你的 sudo 密码
# ═════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."
DIST_DIR="dist"

echo "▶ 清理旧的自动更新器安装（防止菜单启动走旧版本）..."
# 删除用户级 desktop 文件（优先级高于系统级，会导致菜单启动走旧版本）
rm -f ~/.local/share/applications/orca-ide.desktop
# 删除旧的自动更新器安装目录
rm -rf ~/.local/share/orca
echo "  ✓ 已清理 ~/.local/share/applications/orca-ide.desktop"
echo "  ✓ 已清理 ~/.local/share/orca"

echo "▶ 清理旧 deb..."
rm -f "$DIST_DIR"/*.deb

echo "▶ 构建..."
pnpm run build:desktop
pnpm run ensure:electron-runtime
npx electron-builder --config config/electron-builder.config.cjs --linux deb

echo "▶ 安装..."
DEB_FILE=$(ls -t "$(pwd)/$DIST_DIR"/orca-ide_*.deb | head -1)
echo "$SUDO_PASSWORD" | sudo -S apt install -y "$DEB_FILE"

echo ""
echo "✓ 完成！"
echo ""
echo "现在从菜单启动的 Orca 将是新版本（/opt/Orca/orca-ide）"
echo "自动更新器已在代码中禁用，不会再自动安装到 ~/.local/share/orca"
