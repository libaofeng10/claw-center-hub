# OpenClaw Control Center

OpenClaw 多 Agent 网关的可视化管理控制台。提供 Agent 管理、渠道监控、日志查看、配置编辑等一站式运维能力。

## 功能概览

- **总览仪表盘** — Gateway 状态、Agent 数量、渠道连接、系统健康一目了然
- **Agent 管理** — 查看所有 Agent 列表，浏览 workspace / agentDir 文件树，在线编辑配置和 Skill
- **渠道监控** — 查看飞书、钉钉等渠道的连接状态与配置
- **日志查看** — 按来源、级别、关键词过滤，实时查看系统日志
- **配置编辑** — 在线编辑 `openclaw.json` 全局配置，支持 JSON 语法高亮
- **Catalog 管理** — 查看和重新生成 Agent Catalog

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + TailwindCSS + React Query |
| 后端 | Express + TypeScript (tsx) |
| 构建 | Vite 5 |
| 代码编辑器 | CodeMirror 6 (JSON / Markdown) |
| 图标 | Lucide React |

## 快速开始

### 前置条件

- Node.js >= 18
- OpenClaw Gateway 已安装并配置（`~/.openclaw/openclaw.json`）

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式（前后端同时启动）
npm run dev
# 前端: http://localhost:4311
# 后端: http://localhost:4310
```

### 生产构建

```bash
npm run build
npm start
# 访问 http://localhost:4310
```

## 项目结构

```
control-center/
├── src/
│   ├── client/                # React 前端
│   │   ├── components/        # 通用组件 (Layout, AgentCard, StatusBadge ...)
│   │   ├── pages/             # 页面 (Overview, AgentList, AgentDetail, Channels, Logs, Config)
│   │   └── lib/               # API 客户端、工具函数
│   └── server/                # Express 后端
│       ├── routes/            # API 路由 (agents, gateway, channels, config, catalog, logs)
│       └── services/          # 业务逻辑 (file-service, gateway-client, cli-service)
├── deploy.sh                  # 一键远程部署脚本
├── vite.config.ts
├── tsconfig.json              # 前端 TS 配置
└── tsconfig.server.json       # 后端 TS 配置
```

## 环境变量

在项目根目录创建 `.env` 文件：

```env
PORT=4310
HOST=127.0.0.1
OPENCLAW_HOME=~/.openclaw
GATEWAY_URL=http://127.0.0.1:18789
# AUTH_TOKEN=your-secret-token    # 启用后所有 API 请求需携带 Bearer Token
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 获取 Agent 列表 |
| GET | `/api/agents/:id` | 获取 Agent 详情（含文件树） |
| GET | `/api/agents/:id/file` | 读取文件内容 |
| PUT | `/api/agents/:id/file` | 更新文件 |
| POST | `/api/agents/:id/file` | 创建文件 |
| DELETE | `/api/agents/:id/file` | 删除文件 |
| GET | `/api/gateway/status` | Gateway 运行状态 |
| POST | `/api/gateway/restart` | 重启 Gateway |
| GET | `/api/channels/status` | 渠道连接状态 |
| GET | `/api/logs` | 查询日志 |
| GET | `/api/config` | 获取全局配置 |
| PUT | `/api/config` | 更新全局配置 |
| GET | `/api/catalog` | 获取 Agent Catalog |
| POST | `/api/catalog/regenerate` | 重新生成 Catalog |

## 部署

提供一键部署脚本，将应用部署到远程 Linux 服务器并注册为 systemd 服务：

```bash
./deploy.sh <user>@<host>
# 例: ./deploy.sh root@192.168.1.100
```

部署后通过 `systemctl` 管理服务：

```bash
systemctl status openclaw-cc     # 查看状态
journalctl -u openclaw-cc -f     # 查看日志
systemctl restart openclaw-cc    # 重启
```

## 安全特性

- 敏感文件（`auth-profiles.json` 等）自动脱敏显示
- 路径遍历攻击防护
- 可选 Bearer Token 认证
- 默认仅监听 `127.0.0.1`

## License

MIT
