#!/usr/bin/env bash
set -euo pipefail

##############################################
# OpenClaw Control Center 一键部署脚本
#
# 用法:
#   ./deploy.sh <user>@<host>
#
# 示例:
#   ./deploy.sh root@0.0.0.0
#
# 前提:
#   1. 本地已安装 Node.js (用于构建)
#   2. 远程服务器已安装 Node.js >= 18
#   3. 已配置 SSH 密钥登录（推荐）或手动输入密码
##############################################

REMOTE="${1:?用法: ./deploy.sh <user>@<host>}"
REMOTE_DIR="/opt/openclaw-control-center"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  OpenClaw Control Center 部署"
echo "  目标: ${REMOTE}:${REMOTE_DIR}"
echo "========================================="

# ---- 1. 本地构建 ----
echo ""
echo "[1/5] 本地构建前端..."
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  echo "  安装依赖..."
  npm install --silent
fi

npx vite build
echo "  ✓ 前端构建完成"

# ---- 2. 打包 ----
echo ""
echo "[2/5] 打包部署文件..."
TARFILE="/tmp/openclaw-cc-deploy.tar.gz"

tar -czf "$TARFILE" \
  --exclude='node_modules' \
  --exclude='.env' \
  -C "$SCRIPT_DIR" \
  package.json \
  tsconfig.json \
  tsconfig.server.json \
  src/server \
  dist/client

echo "  ✓ 打包完成: $(du -h "$TARFILE" | awk '{print $1}')"

# ---- 3. 上传 ----
echo ""
echo "[3/5] 上传到远程服务器..."
ssh "$REMOTE" "mkdir -p ${REMOTE_DIR}"
scp "$TARFILE" "${REMOTE}:${REMOTE_DIR}/deploy.tar.gz"
echo "  ✓ 上传完成"

# ---- 4. 远程安装 ----
echo ""
echo "[4/5] 远程安装..."
ssh "$REMOTE" bash <<'REMOTE_SCRIPT'
set -euo pipefail
DEPLOY_DIR="/opt/openclaw-control-center"
cd "$DEPLOY_DIR"

echo "  解压文件..."
tar -xzf deploy.tar.gz
rm -f deploy.tar.gz

# 检查 Node.js
if ! command -v node &>/dev/null; then
  echo "  安装 Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi

echo "  Node.js 版本: $(node -v)"

echo "  安装生产依赖..."
npm install --omit=dev --silent 2>/dev/null || npm install --production --silent

# 创建 .env（如果不存在）
if [ ! -f .env ]; then
  cat > .env <<'ENV'
PORT=4310
HOST=0.0.0.0
OPENCLAW_HOME=~/.openclaw
GATEWAY_URL=http://127.0.0.1:18789
# AUTH_TOKEN=your-secret-token
ENV
  echo "  ✓ 已创建 .env（监听 0.0.0.0 以允许远程访问）"
fi

# 创建 systemd 服务
cat > /etc/systemd/system/openclaw-cc.service <<'SERVICE'
[Unit]
Description=OpenClaw Control Center
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/openclaw-control-center
ExecStart=/usr/bin/env node --import tsx src/server/index.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/openclaw-control-center/.env

[Install]
WantedBy=multi-user.target
SERVICE

# 安装 tsx（运行 TypeScript 需要）
npm list tsx >/dev/null 2>&1 || npm install tsx --save --silent

systemctl daemon-reload
systemctl enable openclaw-cc
systemctl restart openclaw-cc

sleep 2
if systemctl is-active --quiet openclaw-cc; then
  echo "  ✓ 服务启动成功"
else
  echo "  ✗ 服务启动失败，查看日志:"
  journalctl -u openclaw-cc -n 20 --no-pager
  exit 1
fi
REMOTE_SCRIPT

# ---- 5. 验证 ----
echo ""
echo "[5/5] 验证部署..."
REMOTE_HOST=$(echo "$REMOTE" | cut -d@ -f2)

sleep 2
if curl -sf --connect-timeout 5 "http://${REMOTE_HOST}:4310" >/dev/null 2>&1; then
  echo "  ✓ 服务正常运行"
else
  echo "  ⚠ 无法从本地访问，可能需要在服务器上开放 4310 端口:"
  echo "    ssh ${REMOTE} 'firewall-cmd --add-port=4310/tcp --permanent && firewall-cmd --reload'"
  echo "    或: ssh ${REMOTE} 'ufw allow 4310/tcp'"
fi

echo ""
echo "========================================="
echo "  部署完成！"
echo "  访问: http://${REMOTE_HOST}:4310"
echo ""
echo "  管理命令 (SSH 到服务器后):"
echo "    查看状态: systemctl status openclaw-cc"
echo "    查看日志: journalctl -u openclaw-cc -f"
echo "    重启服务: systemctl restart openclaw-cc"
echo "    停止服务: systemctl stop openclaw-cc"
echo "========================================="
