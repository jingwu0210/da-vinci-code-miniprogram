# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**达芬奇密码 (Da Vinci Code)** — 微信小程序桌游。将线下经典推理桌游完整还原，支持单机 AI 对战和好友联机。基于 WeChat CloudBase (腾讯云开发) 作为后端。

- **AppID**: `wx27833863a4d377ce`
- **基础库**: v3.16.1
- **CloudBase 环境**: `testenv001-d7gtpfjahfa6ab5f6`（`miniprogram/app.js` 第 8 行）
- **项目类型**: 微信小程序原生框架 + 云开发
- **Git 仓库**: `main` 分支，commit 历史见 `docs/DEV-LOG.md`

## Development

在**微信开发者工具**中打开项目根目录即可开发。无 CLI 构建工具链。

```bash
# 单元测试（纯逻辑，不依赖微信环境）
node tests/game-engine.test.js

# 部署云函数：在 DevTools 中右键 cloudfunctions/* → 上传并部署-云端安装依赖
```

## Architecture — 六层分层

```
view/        表现层 — 页面、组件、动画、新手引导
service/     业务层 — 游戏对局管理、手牌逻辑、AI 机器人、房间管理
model/       数据层 — 牌/玩家/对局实体、本地缓存
cloud/       通信层 — 云函数调用封装、DB watch、微信授权、分享
utils/       工具层 — 洗牌、排序、日志、格式化、本地存储
common/      公共层 — 枚举、常量、路由、主题变量、全局 store
```

**依赖方向**: `View → Service → Model/Cloud/Utils → Common`（单向无环，禁止反向引用）

详细架构见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 关键文件地图

### 核心游戏逻辑

| 文件 | 职责 |
|------|------|
| `utils/shuffle.js` | Fisher-Yates 洗牌 + `createDeck` + `createShuffledDeck` |
| `utils/sort-hand.js` | 手牌排序（从小到大→同值黑左白右→Joker 自由位） |
| `model/entities/tile.js` | Tile 工厂 + `toSelfTile` / `toOpponentTile` |
| `model/entities/game-state.js` | `createInitialState` + `drawFromPool`(颜色分池) + `getClientView` |
| `service/game/guess-handler.js` | `isGuessMatch`(仅数值判定) + `validateGuess` |
| `service/game/turn-manager.js` | 状态转移表 + `PASS_REVEALS_TILE` |
| `utils/game-engine.js` | 前端统一入口（收拢以上所有纯逻辑） |

### 云函数

| 云函数 | 文件 | 状态 |
|--------|------|:---:|
| `game` | `cloudfunctions/game/index.js` + 8 handlers + `_engine.js` | ✅ |
| `room` | `cloudfunctions/room/package.json` (仅模板) | ⏳ |
| `user` | `cloudfunctions/user/package.json` (仅模板) | ⏳ |
| `history` | `cloudfunctions/history/package.json` (仅模板) | ⏳ |
| `quickstartFunctions` | 保留作参考模板 | — |

### 页面

| 页面 | 路径 | 状态 |
|------|------|:---:|
| 登录 | `view/pages/login/` | 🏗 骨架 |
| 大厅 | `view/pages/lobby/` | 🏗 骨架 |
| 游戏主界面 | `view/pages/board/` | 🏗 骨架 |
| 教程 | `view/pages/tutorial/` | 🏗 骨架 |
| 历史 | `view/pages/history/` | 🏗 骨架 |
| 设置 | `view/pages/settings/` | 🏗 骨架 |
| 创建房间 | `view/subpackages/room/create/` | 🏗 骨架 |
| 房间等待 | `view/subpackages/room/detail/` | 🏗 骨架 |
| 结算 | `view/subpackages/result/` | 🏗 骨架 |

### 数据库 (CloudBase NoSQL)

| 集合 | 安全规则 | 唯一索引 |
|------|----------|:---:|
| `rooms` | READONLY (公开读，禁直写) | `roomId` |
| `games` | 仅参与玩家可读，禁直写 | — |
| `players` | 仅本人可读，禁直写 | `openid` |
| `game_records` | 仅参与玩家可读，禁直写 | — |

## 游戏核心规则（已实现到代码）

### 牌组
- 26 张：黑/白各 13 张 (0~11 + Joker)
- 牌为有色塑料材质——**牌背颜色与正面相同**，颜色可见
- 2:1 长条形

### 回合流程
1. **摸牌** — 从黑/白色牌池中选择一种，随机摸一张（`drawTile(gameId, color)`）
2. **插入** — 将摸到的牌插入手牌序列（维持排序规则）
3. **猜测** — 选对手某张暗牌，猜其数字（0~11 或 -1 Joker）。**无需猜颜色**（牌背可见）
4. 猜对→对手牌翻开，可继续；猜错→自己摸的牌翻开，回合结束

### 特殊规则
- **pass = 猜错**: 选择结束回合，摸到的牌必须翻开（`PASS_REVEALS_TILE = true`）
- **Joker 判定**: `isGuessMatch(guess, tile)` = `(guess.value === tile.value)`。猜 -1 即为猜 Joker
- **信息隔离**: `getClientView` — 对手未翻牌仅返回 `{ position, color, isRevealed: false }`，不暴露数字
- **颜色分池**: `pool = { black: [Tile], white: [Tile] }`，摸牌时按颜色从对应子池抽取

## 设计规范

所有视觉/交互决策以 [`docs/DESIGN-SPEC.md`](docs/DESIGN-SPEC.md) 为准：
- 登录页 + Board 页：暗色毛毡背景 `#2C3A4A`
- 其余页面：明亮暖白背景 `#F5F5F0`
- 牌面 2:1 + 立体厚度效果 + 哑面磨砂纹理
- 不显示牌池（仅摸牌阶段显示分色剩余计数）

## 规范文档

| 文档 | 何时查阅 |
|------|----------|
| [`docs/PRD.md`](docs/PRD.md) | 产品功能、页面交互、微信合规 |
| [`docs/GAME-MODEL.md`](docs/GAME-MODEL.md) | 游戏数学规范——代码实现的唯一依据 |
| [`docs/API.md`](docs/API.md) | 云函数 I/O 契约、Watch 协议、类型定义 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 分层架构、依赖约束、禁止非法调用清单 |
| [`docs/DESIGN-SPEC.md`](docs/DESIGN-SPEC.md) | Figma 设计规范——视觉/交互的唯一准绳 |
| [`docs/DEV-LOG.md`](docs/DEV-LOG.md) | 开发日志——产出记录 + 下次 TODO |

## 当前进度

| 阶段 | 状态 | commit |
|:----:|:---:|--------|
| 1 — 项目基础搭建 | ✅ | `a4d7c23` |
| 2 — 核心游戏逻辑 | ✅ | `4cc07ed` |
| 3 — 登录 & 房间 & 大厅 | ⏳ 下次 |
| 4 — Board 游戏界面 | ⏳ |
| 5 — AI 对战 | ⏳ |
| 6 — 结算 & 历史 | ⏳ |
| 7 — 打磨上线 | ⏳ |
