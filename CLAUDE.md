# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**达芬奇密码 (Da Vinci Code)** — 微信小程序桌游。将线下经典推理桌游完整还原，支持单机 AI 对战和好友联机。基于 WeChat CloudBase (腾讯云开发) 作为后端。

- **AppID**: `wx27833863a4d377ce`
- **基础库**: v3.16.1
- **CloudBase 环境**: `testenv001-d7gtpfjahfa6ab5f6`（`miniprogram/app.js` 第 8 行）
- **项目类型**: 微信小程序原生框架 + 云开发
- **Git 仓库**: `jingwu0210/da-vinci-code-miniprogram.git`，`main` 分支，commit 历史见 `docs/DEV-LOG.md`

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

### 业务服务层（Phase 3）

| 文件 | 职责 |
|------|------|
| `service/auth/auth-service.js` | 登录/游客/会话管理（`initSession`/`tryGuestMode`/`updateProfile`） |
| `service/room/room-manager.js` | 房间生命周期（`createAndJoin`/`joinById`/`leave`/`toggleReady`/`startGame`） |
| `service/room/ready-checker.js` | 准备状态校验 |
| `cloud/cloud-functions/user-call.js` | user 云函数调用封装 |
| `cloud/cloud-functions/room-call.js` | room 云函数调用封装 |
| `cloud/auth/wechat-auth.js` | `wx.login` / `checkSession` / 授权状态管理 |
| `cloud/auth/profile-auth.js` | 头像（`chooseAvatar`）/ 昵称（`nickname` input）获取与上传 |
| `cloud/share/share-helper.js` | `onShareAppMessage` 统一配置（房间邀请 + 战绩分享） |

### 云函数

| 云函数 | 文件 | 状态 |
|--------|------|:---:|
| `game` | `cloudfunctions/game/index.js` + 8 handlers + 4 AI 策略文件 + `_engine.js` | ✅ |
| `room` | `cloudfunctions/room/index.js` + 5 handlers (createRoom/joinRoom/leaveRoom/toggleReady/startGame) | ✅ |
| `user` | `cloudfunctions/user/index.js` + 3 handlers (login/getProfile/updateProfile) | ✅ |
| `history` | `cloudfunctions/history/package.json` (仅模板) | ⏳ |
| `quickstartFunctions` | 保留作参考模板 | — |

**跨云函数调用**: `room.startGame` 调用 `game.initGame` 时需显式传入 `callerOpenid`（`cloud.getWXContext().OPENID` 在跨函数调用时会丢失）。`game/index.js` 通过 `event.callerOpenid || cloud.getWXContext().OPENID` 获取真实调用者身份。

### 页面

| 页面 | 路径 | 状态 |
|------|------|:---:|
| 登录 | `view/pages/login/` | ✅ |
| 大厅 | `view/pages/lobby/` | ✅ |
| 游戏主界面 | `view/pages/board/` | ✅ 骨架完成，交互完善中 |
| 教程 | `view/pages/tutorial/` | ⏳ |
| 历史 | `view/pages/history/` | ⏳ |
| 设置 | `view/pages/settings/` | ✅ |
| 用户协议 | `view/pages/agreement/` | ✅ |
| 创建房间 | `view/subpackages/room/create/` | ✅ |
| 房间等待 | `view/subpackages/room/detail/` | ✅ |
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
- 1:2 竖长条形

### 数据模型
- `tiles[]` 扁平数组：每张牌带 `owner` 字段（`'pool'` | `openid`），从根本上杜绝牌重复
- `getPlayerHand(tiles, openid)` — 按 owner 过滤 + position 排序获取手牌
- `poolRemaining(tiles)` — 按 `owner === 'pool'` 统计各色剩余
- 牌数守恒不变式: |池牌| + |玩家牌| = 26

### 初始 Joker 摆放回合
- 发牌后，所有玩家初始手牌中的 Joker 需按 turnOrder 轮流摆放
- 由 `initialJokers` + `initialJokerTurn` 机制驱动，仅涉及 `initGame` + `insertTile`
- 全部玩家 Joker 放完 → `initialJokerTurn = null` → 正式回合开始

### 回合流程
1. **摸牌** — 从黑/白色牌池中选择一种，随机摸一张（`drawTile(gameId, color)`）
2. **插入** — 将摸到的牌插入手牌序列（维持排序规则）。数字牌：自动插入/手动选位；Joker：手动选位
3. **猜测** — 选对手某张暗牌，猜其数字（0~11 或 -1 Joker）。**无需猜颜色**（牌背可见）
4. 猜对→对手牌翻开，可继续猜；猜错→自己摸的牌翻开（数字牌自动插入、Joker 进入 INSERTING 手动放置）

### 特殊规则
- **pass = 猜错**: 选择结束回合，摸到的牌必须翻开（`reveal=true`，默认）。猜对后主动 pass 不亮牌（`reveal=false`）
- **Joker 判定**: `isGuessMatch(guess, tile)` = `(guess.value === tile.value)`。猜 -1 即为猜 Joker
- **信息隔离**: `getClientView` — 对手未翻牌仅返回 `{ position, color, isRevealed: false }`，不暴露数字
- **猜错 Joker**: 设置 `jokerPendingReveal` → insertTile 放置后翻开 → 回合结束
- **颜色分池**: 摸牌时按颜色从对应 owner='pool' 的子集中随机抽取

## 设计规范

所有视觉/交互决策以 [`docs/DESIGN-SPEC.md`](docs/DESIGN-SPEC.md) 为准：
- 全局统一暗色毛毡背景 `#2C3A4A`
- 牌面 1:2 + 立体厚度效果 + 哑面磨砂纹理
- 不显示牌池（仅摸牌阶段显示分色剩余计数）
- 全局统一暗色毛毡背景 `#2C3A4A`

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
| 3 — 登录 & 房间 & 大厅 | ✅ | `b1869bc` |
| 4 — Board 游戏界面 | ✅ | 待提交（前端细节待调整） |
| 5 — AI 对战 | ✅ | 待提交（三难度策略完善，概率参数可持续调优） |
| 6 — 结算 & 历史 | ✅ | `f8aaec6` ~ `8875580` |
| 7 — 打磨上线 | 🏗 | V2 功能已写入 PRD §16 |
| 7 — 打磨上线 | ⏳ |


## 当有问题时需要修复或者debug时
不要怀疑用户未部署fix到云函数，找别的原因。不要提出让用户尝试部署的解决方案。
不该没有证据就猜部署状态，应当基于日志数据 + 代码逻辑严格追溯 root cause。
请用正确的修复方式（e.g. 遵从工程学角度可维护，从root cause根源处理，合理的model / structure，考虑代码可维护性和可扩展性）。而不是采用某些simple fix或者hack但是可能会在未来引入更多问题。
在解决问题的时候，不要随便hack一个solution解决当前的问题，而是要按照正确的已经established逻辑，每次试图找到root cause

## 提交规范
在用户没有明确要求commit代码时，不要commit。用户说"commit代码"或"提交代码"时才执行git commit。