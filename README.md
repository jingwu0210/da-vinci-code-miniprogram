# 达芬奇密码 (Da Vinci Code)

微信小程序桌游 — 将线下经典推理桌游完整还原，支持单机 AI 对战和好友联机。

## 功能

- 🧠 **单机 AI 对战** — 三难度（简单/中等/困难），概率推理 + 启发式策略
- 👥 **好友联机** — 创建/加入房间，最多 4 人对战，支持房间密码
- 📊 **历史对局** — 战绩统计、对局回顾
- 🎨 **明亮主题** — 全局统一设计系统，3D 立体牌面效果

## 技术栈

- 微信小程序原生框架
- 腾讯云开发 (CloudBase) — 云函数 + NoSQL 数据库
- 无第三方 NPM 依赖（前端纯原生）

## 项目结构

```
├── miniprogram/          # 小程序前端
│   ├── view/             # 页面 + 组件 + 动画
│   ├── service/          # 业务逻辑（游戏/AI/房间/认证/历史）
│   ├── model/            # 数据模型（Tile/GameState）
│   ├── cloud/            # 云函数调用封装 + 微信授权 + 分享
│   ├── utils/            # 工具函数（洗牌/排序/音效/本地存储）
│   └── common/           # 枚举/常量/路由/主题/Store
├── cloudfunctions/       # 云函数（game/room/user/history）
├── docs/                 # 产品/技术文档
├── tests/                # 单元测试
└── project.config.json   # 微信小程序项目配置
```

## 本地开发

在**微信开发者工具**中打开项目根目录即可开发，无需 CLI 构建工具链。

```bash
# 单元测试（纯逻辑，不依赖微信环境）
node tests/game-engine.test.js

# 部署云函数：在 DevTools 中右键 cloudfunctions/* → 上传并部署-云端安装依赖
```

## 架构

分层架构，单向依赖（无循环引用）：

```
view/        表现层 — 页面、组件、动画、新手引导
service/     业务层 — 游戏对局管理、手牌逻辑、AI 机器人、房间管理
model/       数据层 — 牌/玩家/对局实体、本地缓存
cloud/       通信层 — 云函数调用封装、DB watch、微信授权、分享
utils/       工具层 — 洗牌、排序、日志、格式化、本地存储
common/      公共层 — 枚举、常量、路由、主题变量、全局 Store
```

## 文档

| 文档 | 说明 |
|------|------|
| [产品需求](docs/PRD.md) | 功能、页面交互、微信合规 |
| [游戏模型](docs/GAME-MODEL.md) | 数据结构、状态机、判定算法 |
| [API 契约](docs/API.md) | 云函数 I/O、Watch 协议 |
| [系统架构](docs/ARCHITECTURE.md) | 分层架构、依赖约束 |
| [设计规范](docs/DESIGN-SPEC.md) | 视觉/交互设计规范 |
| [开发日志](docs/DEV-LOG.md) | 各阶段产出记录 |
