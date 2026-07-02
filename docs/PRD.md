# 达芬奇密码 — 产品需求文档 (PRD)

> **版本**: v1.1　|　**日期**: 2026-07-02　|　**AppID**: wx27833863a4d377ce　|　**基础库**: v2.20.1

---

## 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [完整游戏规则](#2-完整游戏规则)
3. [功能模块概览](#3-功能模块概览)
4. [页面路由与导航流](#4-页面路由与导航流)
5. [逐页面功能详述](#5-逐页面功能详述)
6. [游戏核心动画设计](#6-游戏核心动画设计)
7. [技术架构](#7-技术架构)
8. [数据库设计](#8-数据库设计)
9. [云函数设计](#9-云函数设计)
10. [前端组件设计](#10-前端组件设计)
11. [微信生态合规](#11-微信生态合规)
12. [非功能需求](#12-非功能需求)
13. [项目文件结构](#13-项目文件结构)
14. [实施计划](#14-实施计划)
15. [测试计划](#15-测试计划)

---

## 1. 项目背景与目标

将线下经典桌游《达芬奇密码》完整还原为微信小程序，支持**单机人机对战**与**好友联机对战**（创建房间 + 微信分享邀请），依托**微信云开发 (CloudBase)** 作为后端服务，提供安全、流畅的卡牌推理游戏体验。

**核心目标**：完整还原线下规则　|　流畅卡牌动画　|　稳定多人联机　|　主包 ≤ 2MB

---

## 2. 完整游戏规则

### 2.1 牌组构成（26 张）

| 颜色 | 数字牌 | Joker（"—"） | 合计 |
|------|--------|:-----------:|------|
| 黑色 | 0 ~ 11（12 张） | 1 张 | 13 张 |
| 白色 | 0 ~ 11（12 张） | 1 张 | 13 张 |

- Joker 无固定数值，可插入手牌序列任意位置

### 2.2 游戏准备

1. 所有牌面朝下洗匀
2. **2~3 人**：每人抽 4 张　｜　**4 人**：每人抽 3 张
3. 手牌按规则从左至右立在自己面前：

> **从小到大 → 同数字时黑色在左、白色在右 → Joker 可插任意位置**

### 2.3 回合流程

每个回合包含两步：

**第一步 — 摸牌**：从桌面暗牌中选黑/白一种颜色，摸一张。牌出现在手牌末尾（间隔显示，正面朝上可见数字），**暂不插入排序序列**。

**第二步 — 猜测**：选择一位对手，指其某张暗牌并猜数字（牌背颜色可见，无需猜色）
- ✅ **猜对**：对手翻开该牌（推倒动画）。可 [继续猜测] 或 [结束回合]
- ❌ **猜错**：
  - 数字牌 → 自动插入唯一正确排序位置 + 亮牌展示 → 回合结束
  - 万能牌(Joker) → 手动选择插入位置 + 亮牌展示 → 回合结束

**结束回合（猜对后主动）**：
- 数字牌 → 自动插入正确排序位置（**不亮牌**）
- 万能牌 → 自动插入末尾（**不亮牌**）
- 回合结束 → 等下一玩家

### 2.4 胜负判定

- 率先猜出所有对手全部手牌的玩家 **获胜**
- 手牌被全部翻开的玩家 **出局**，游戏继续

---

## 3. 功能模块概览

| 模块 | 描述 | 优先级 |
|------|------|:------:|
| 登录 & 授权 | 微信一键登录 / 游客模式，隐私合规 | P0 |
| 单机人机 | vs AI，简单 / 中等 / 困难三种难度 | P0 |
| 好友联机 | 创建房间 + 微信分享邀请好友，2~4 人 | P0 |
| 游戏核心 | 摸牌 → 插入 → 猜测 → 亮牌完整回合 | P0 |
| 游戏结算 | 胜负判定、排名展示、战绩统计 | P0 |
| 历史对局 | 过往记录列表 + 胜率统计 | P1 |
| 新手教程 | 分步规则说明与交互演示 | P1 |
| 设置页 | 音效/振动/动画速度、个人信息管理 | P1 |

---

## 4. 页面路由与导航流

### 路由全景

```
                    ┌──────────────────────┐
                    │   pages/login/index   │  ← 首次进入
                    └──────────┬───────────┘
                               │ 授权 / 游客
                               ▼
                         ┌──────────────┐
                         │  lobby/index │  ← 大厅
                         └──────┬───────┘
               ┌────────────────┼────────────────┐
               ▼                ▼                 ▼
       room/create        board/index        settings
       (创建房间)          (游戏主界面)         (设置)
               │                │
               ▼                │
       room/detail ◄────────────┘
       (房间等待室)
               │
        ┌──────┴──────┐
        │ 分享给好友    │ ──→ 好友点击 → 直接进入 room/detail
        └─────────────┘

  lobby ──→ tutorial (新手教程)    lobby ──→ history (历史)
  board ──→ result (结算页)
```

### 完整路由表（9 个页面）

| # | 路径 | 包 | 标题 | 参数 |
|---|------|----|------|------|
| 1 | `pages/login/index` | main | 达芬奇密码 | `?roomId=...`（透传） |
| 2 | `pages/lobby/index` | main | 达芬奇密码 | `?roomId=...` |
| 3 | `pages/board/index` | main | 对局中 | `?gameId=&roomId=` |
| 4 | `pages/tutorial/index` | main | 玩法说明 | — |
| 5 | `pages/history/index` | main | 历史对局 | — |
| 6 | `pages/settings/index` | main | 设置 | — |
| 7 | `subpackages/room/create/index` | room | 创建房间 | `?mode=ai\|friends` |
| 8 | `subpackages/room/detail/index` | room | 房间 | `?roomId=...` |
| 9 | `subpackages/result/index` | result | 对局结果 | `?gameId=...` |

### 页面跳转矩阵

| 跳转 | 触发方式 |
|------|----------|
| 启动 → login | app.js 检测无授权记录 |
| login → lobby | 授权完成 / 游客模式跳过（透传 roomId） |
| lobby → room/create | 点击"创建房间"，传 `mode` |
| lobby → room/detail | 输入房间码加入 |
| room/create → room/detail | 房间创建成功 |
| room/detail → board | 房主点"开始游戏" |
| lobby → board（AI） | 点击"人机对战" |
| board → result | 游戏结束自动跳转 |
| board → lobby | 点击"返回大厅"/"退出本局" |
| **分享 → room/detail** | **好友点分享卡片，直接进入房间** |
| result → lobby / room/detail | 返回大厅 / 再来一局 |

### 分包策略

主包 6 页面（含 login、lobby、board）+ 2 个分包（room、result）。`lobby` 预加载 `room`，`board` 预加载 `result`。

---

## 5. 逐页面功能详述

### 5.0 `pages/login/index` — 登录 & 授权

**职责**：首次启动登录引导、微信授权、游客模式入口（UUID自动生成）、用户协议/隐私政策。双登录体系：游客模式（本地 storage 缓存 ≤10条 + 完整联机）+ 微信登录（云端存档 + 跨设备同步）。设置页支持退出登录切回游客、游客本地记录迁移云端。

**状态**：`loading` → `unauthorized` / `authorizing` / `skipToLobby` / `error`

```
  🎭 达芬奇密码
  DA VINCI CODE
  欢迎来到这款推理桌游

  [ 🟢 微信一键登录 ]    ← wx.login → user.login → lobby
  [   游客模式   ]       ← 直接进入 lobby（无头像/昵称，仅可人机）
  登录即表示同意《用户协议》《隐私政策》
```

- `onLoad` 检查本地授权记录 → 有则跳过直接进 lobby
- 分享进入时透传 `roomId`，登录后自动执行加入房间
- **合规**：游客模式可用（前端 UUID）、协议可点击查看全文、头像/昵称使用 `chooseAvatar` + `nickname` 组件、不收集手机号
- **游客数据**：
  - `games` 集合：正常读写（联机对局需要）
  - `rooms` 集合：正常读写（创建/加入房间需要）
  - `players` 集合：不写入（无永久用户资料）
  - `game_records` 集合：**不读不写**（战绩仅本地 storage 缓存 ≤10条，清除缓存/换设备丢失）
  - 历史页：读本地 `history-cache`，不调云函数
  - 结算页：读 `games` 文档构造本地 record → 写 `history-cache`，不调 `saveRecord`
- **微信登录**：静默获取 OpenID + 可选头像昵称授权。云端存储对局记录，支持跨设备同步。退出登录切回游客，云端数据保留


---

### 5.1 `pages/lobby/index` — 游戏大厅

**职责**：模式选择、用户信息展示。

```
  ‹ 退出        达芬奇密码
  ┌─────────────────────┐
  │ 👤 头像 昵称  胜28 负14│
  └─────────────────────┘
  [ 🤖 人机对战 · 选择难度 ]     → 弹难度窗 → 直接开局
  [ 👥 好友联机 · 创建/加入 ]    → room/create 页
  📖 玩法说明   │   📋 历史对局
```

- `onShow`：微信回访用户静默刷新云端 stats
- 人机：点「人机对战」→ 弹窗选难度 → 直接 `initGame` 进 board
- 好友：点「好友联机」→ 跳 `room/create` 页

---

### 5.2 `subpackages/room/create/index` — 创建/加入房间

**职责**：好友联机入口，创建房间或输入房码加入。

```
  ← 返回           好友联机
  [ 创建房间 ]  [ 加入房间 ]    ← tab 切换

  ── 创建房间 ──              ── 加入房间 ──
  人数: ◉2 ○3 ○4             输入 6 位房间码
  密码: [________]（≤6 位数字） [   加入   ]
  [      创建房间      ]
```

- 创建成功 → `redirectTo room/detail?roomId=xxx`
- 加入成功 → `redirectTo room/detail?roomId=xxx`

---

### 5.3 `subpackages/room/detail/index` — 房间等待室

**职责**：展示房间信息，等待玩家加入，准备 & 开始游戏。

**状态**：`waiting` / `ready` / `allReady`（倒计时 5s）/ `starting` / `full` / `expired`

```
  ← 返回              房间详情

  房间码: ┌──A B C 1 2 3──┐ 📋 复制
         └────────────────┘

  [ 📤 邀请好友 ]          ← onShareAppMessage → 分享卡片
                           好友点击直接进入当前房间！

  玩家列表:
  👤 房主·玩家A   ✅ 已准备
  👤 玩家B       ⏳ 未准备
  👤 等待中...

  AI 难度: 中等（仅人机模式）

  [ 准备 / 取消 ]  [ 离开房间 ]
  [     开始游戏（仅房主）    ]
```

- `onLoad` 启动数据库 watch 监听房间变更（实时更新玩家列表、准备状态）
- **分享卡片**：标题"来和我玩达芬奇密码！"，`path` 直达 `room/detail?roomId=xxx`
- 房主点"开始游戏" → `redirectTo board`

---

### 5.4 `pages/board/index` — 游戏主界面 ★

**职责**：游戏核心——手牌展示、摸牌/插入/猜测/亮牌、回合流转、实时同步。

#### 游戏阶段状态机

```
WAITING ──→ DRAWING ──→ GUESSING  ←──┐
   ▲                      │          │
   │         猜对·继续 ────┘          │
   │         猜错/结束回合 ───────────┘
   │         万能牌猜错 ──→ INSERTING（手动选位）→ WAITING
   │
   └── 初始 Joker 摆放: INSERTING → INSERTING → ... → DRAWING
```

**页面状态**：`loading` / `waiting` / `drawing` / `inserting` / `guessing` / `gameOver` / `offline` / `error`

#### 盘面布局

```
  🏠 大厅    第 3 回合    ⏏ 退出
  🕐 00:25

  ┌─ 玩家B（对手）──────┐
  │  [?] [?] [5·白] [?] │   ← 对手暗牌 / 已翻开牌
  └─────────────────────┘
  ┌─ 玩家C（对手）──────┐
  │  [?] [?] [?] [?]    │
  └─────────────────────┘
  ════════════════════════
  ┌─ 我的牌 ────────────┐
  │ [3·黑] [5·白] [?] [11·黑] │
  │   ▲插槽       ▲插槽  │       ← inserting 阶段
  └─────────────────────┘

  [        摸 牌        ]           ← drawing
  提示：请选择插入位置               ← inserting

  猜测：玩家B · 第2张牌 (黑底)        ← guessing
	  (牌背底色可见，无需猜测颜色)
  数字: 0 1 2 3 4 5 6 7 8 9 10 11  [— Joker]
  [    确认    ]  [   取消   ]
  [      结束回合      ]
```

#### 回合流程（当前实现）

1. **摸牌** → `game.drawTile(color)` → 牌出现在手牌末尾（间隔显示，正面朝上）
2. **猜测** → 点对手暗牌（金色边框选中） → 选数字/Joker → `game.makeGuess`
3. **猜对**：
   - 对手牌播放**推倒动画**（1.0s，站→倒→站，数字浮现）
   - 底部显示 [继续猜测] [结束回合] 两按钮
   - 继续猜测 → 回到步骤 2；结束回合 → 步骤 4
4. **猜错**：
   - 数字牌 → 自动插入唯一正确排序位置 + 推倒动画（亮牌，无数字浮现）
   - 万能牌 → 显示 ▲ 三角引导用户手动选位 + 推倒动画
   - 回合结束 → 等下一玩家
5. **结束回合（猜对后主动）**：
   - 数字牌 → 自动插入正确位置（不亮牌）
   - 万能牌 → 自动插入末尾（不亮牌）
   - 回合结束 → 等下一玩家
6. **⏏ 退出本局**：确认弹窗"退出将判负" → `game.quitGame` → `redirectTo lobby`

#### 回合引导

- 状态栏显示当前环节：**"等待对手行动中…" / "请选择摸牌颜色" / "请点击对手暗牌进行猜测"**
- 非己回合对手牌不可点击（无金色边框高亮）

#### AI 回合

AI 自动执行完整回合：摸牌 → 猜测（可能连续多轮）→ pass。前端多次调用 `aiMove` 逐步推进，每次返回一个 action（draw/guess/pass），间隔 ~800ms 播放动画。回合结束后自动流转回玩家。

#### 实时同步（数据库 watch）

`db.collection('games').doc(gameId).watch()` → 对手操作实时推送 → 仅更新可见数据（对手已翻开牌、回合状态），对手摸牌/插入不可见

---

### 5.5 `subpackages/result/index` — 结算页

```
  🏆 你赢了！（金色主题）/ 💔 再接再厉（灰色主题）

  对局信息：模式 好友联机(3人) · 回合数 14 · 时长 5分32秒 · 正确率 67%
  排名：🥇 你(完胜)  🥈 玩家B(剩3张)  🥉 玩家C(剩4张)

  [ 🎬 观看视频获取提示次数 ]（激励视频，可选）
  [ 📤 分享战绩 ]  [ 返回大厅 ]
  [ 🔄 再来一局（仅联机）]
```

- `onLoad` 时 `history.saveRecord` 保存记录
- 激励视频：仅展示入口、播放完成才下发奖励、每日限 3 次

---

### 5.6 `pages/tutorial/index` — 新手教程

6 步分页引导：

| 步骤 | 标题 | 要点 |
|:----:|------|------|
| 1 | 牌组介绍 | 26 张牌，黑白各 13 |
| 2 | 游戏准备 | 洗牌→发牌→排序规则 |
| 3 | 回合流程 | 摸牌→插入→猜测→亮牌 |
| 4 | 猜测规则 | 选位置→猜数字→对开/错亮己 |
| 5 | Joker | 无固定值，可插任意位 |
| 6 | 胜负 | 全猜中→胜；全被猜→出局 |

每步配示意图/动图，底部 ◀ 上一步 / 下一步 ▶

---

### 5.7 `pages/history/index` — 历史对局

顶部统计卡片（总场次 / 胜场 / 胜率）+ 记录列表（对局模式、日期、时长、对手、胜负）。支持分页加载和下拉刷新。

---

### 5.8 `pages/settings/index` — 设置页

- **游戏设置**：音效开关、振动开关
- **数据管理**：清除历史对局（游客可见，微信用户隐藏）
- 微信登录/退出登录等切换功能移至 V2（PRD §16）

---

## 6. 游戏核心动画设计

### 多米诺推倒翻牌

牌被翻开时，3D `rotateX` 绕底部旋转模拟多米诺被推倒，总时长 0.7s。

```
0% 竖立 → 15% 微晃 → 50% 推倒(70°) → 100% 停稳(45°倾斜)
```

- 使用 CSS `perspective:300rpx` + `transform-style:preserve-3d`
- 动画触发：`tile.isRevealed` 首次变为 true（`was-revealed` class）
- 全局 `animatedTiles[tileId]` 去重，组件重建不重复播放

#### 已翻开标记

| 场景 | 边框颜色 | 倾斜 |
|------|:---:|:---:|
| 自己牌被翻 | `#8B4A4A` 暗红 | `rotateX(45deg)` |
| 对手牌被翻 | `#4A7C59` 暗绿 | `rotateX(45deg)` |

#### 触发条件

- 仅 `tile.isRevealed === true` 时触发
- 摸牌 `faceUp=true` 不触发

#### 动画衔接

```
猜对：对手牌推倒动画 → 底部 [继续猜测] [结束回合]
猜错：己牌推倒动画 + 自动/手动插入 → 回合结束
```

---

## 7. 技术架构

```
┌───────────────────────────────────────────┐
│              微信小程序前端                 │
│  Lobby / Board / History / Settings ...   │
│  Store (轻量)  │  Components (tile,hand…) │
└─────────────────┬─────────────────────────┘
                  │ wx.cloud.callFunction()
                  │ db.collection.watch()
┌─────────────────┴─────────────────────────┐
│           CloudBase 云开发后端              │
│  game 云函数  │  room 云函数  │  user 云函数 │
│  ───────────────────────────────────────  │
│        NoSQL: rooms / games / players / records │
└───────────────────────────────────────────┘
```

| 层次 | 选型 | 说明 |
|------|------|------|
| 框架 | 原生微信小程序 | 减少包体积 |
| 后端 | CloudBase 基础套餐（19.9元/月） | 100 DAU 够用，按量扩展 |
| 实时通信 | CloudBase 数据库 watch | 回合制无需 WebSocket |
| 数据库 | NoSQL 文档数据库 | 每房间一个文档 |
| 认证 | `wx.login()` + `cloud.getWXContext()` | 静默登录，OPENID 识别 |
| 动画 | Canvas 2D + WXS + `requestAnimationFrame` | 推倒/翻牌/滑动 |
| 状态管理 | 轻量 Event Store（~50 行） | 避免引入 Redux/Vuex |

**实时同步**：玩家操作 → 云函数校验 → 更新 game 文档 → watch 推送所有房间内玩家 → 自动 UI 刷新。仅推送可见数据（自己牌面全显、对手仅已翻牌）。Watcher 断线自动重连。

---

## 8. 数据库设计

### `rooms`
```js
{ roomId, status, mode, maxPlayers, password?, creatorOpenid,
  players: [{ openid, nickName, avatarUrl, isReady, isAI, seatIndex }],
  createdAt, updatedAt }
```

### `games`
```js
{ roomId, mode, difficulty, status, phase, winner?,
  tiles: [{ id, color, value, isJoker, owner: 'pool' | openid, position, isRevealed }],
  turnOrder, turnIndex, drawnTileId?,
  initialJokers?, initialJokerTurn?, jokersToPlace?, originalTurnIndex?,
  jokerPendingReveal?,
  turnLog: [{ turnNumber, playerOpenid, action, targetOpenid?, position?, guessedValue?, isCorrect?, targetColor?, timestamp }] }
```

### `players`
```js
{ openid, nickName, avatarUrl, stats: { totalGames, wins, losses, bestStreak } }
```

### `game_records`
```js
{ roomId, mode, players: [{ openid, nickName, isWinner, tilesRemaining }],
  totalTurns, duration }
```

**安全规则**：所有集合客户端 `write: false`，仅通过云函数写入。games/players 读取仅限参与玩家。

---

## 9. 云函数设计

| 云函数 | 职责 | 核心 event.type |
|--------|------|----------------|
| `user` | 用户管理 | `login`, `getProfile`, `updateProfile` |
| `room` | 房间管理 | `createRoom`, `joinRoom`, `leaveRoom`, `toggleReady`, `startGame` |
| `game` | **核心逻辑** | `initGame`, `drawTile`, `insertTile`, `makeGuess`, `passTurn`, `quitGame`, `aiMove`, `getGameState` |
| `history` | 对局记录 | `saveRecord`, `getRecords` |

> 不设公开房间列表——房间发现仅通过微信分享。

### `game` 核心契约

- **`initGame`**：创建 26 张牌 → 洗牌 → 发牌（`tiles[]` + `owner` 字段）→ 收集初始 Joker → 如需摆放则进入 INSERTING，否则进入 DRAWING
- **`drawTile`**：校验回合/阶段+颜色池非空 → 摸牌 → owner 变更 → 牌出现在手牌末尾（正面朝上），phase 直接进入 GUESSING
- **`insertTile`**：三重用途：①初始 Joker 摆放 ②猜错 Joker 后手动选位+亮牌 ③正常插入（数字牌自动找位）。含排序约束校验
- **`makeGuess`**：校验目标+数字（牌背底色可见，无需猜色；Joker 猜值=-1）→ 猜对翻开对手牌/猜错亮己牌（数字牌自动插入、Joker 进入 INSERTING 手动放置）→ 检查胜负
- **`passTurn`**：结束回合。`reveal=true`（默认/猜错）亮摸牌+自动插入→切回合；`reveal=false`（猜对主动结束）不亮牌→切回合
- **`aiMove`**：按 difficulty 策略单步执行（摸牌→猜测→pass），前端多次调用以推进 AI 完整回合
- **`quitGame`**：退出者全部亮牌 → 判负 → 若剩 1 人则该玩家获胜

**AI 策略**：简单（随机）、中等（sortKey 上下界 + (value,color) 精确排除 + 否定信息 + 空间约束）、困难（概率矩阵推理 P[opp][pos][val] + argmax 置信度）

---

## 10. 前端组件设计

```
board 页面
├── game-info          # 回合/计时器
├── opponent-hand ×N   # 对手手牌（暗牌+已翻开）
│   └── game-tile ×M   # 单张牌（正面/背面/选中）
├── player-hand        # 自己手牌（明牌+插入槽）
│   └── game-tile ×M
├── action-bar         # 操作按钮区
└── guess-modal        # 猜测弹窗（选对手→位置→数字）
```

**`game-tile`**：Props `{ tile, faceUp, size, selected, position }`；事件 `tap → { tileId, position }`

**`player-hand`**：Props `{ tiles, isOwn, interactive, insertMode, drawnTile }`；事件 `positionSelected`

**`guess-modal`**：Props `{ show, opponents, phase }`；事件 `confirm → { targetOpenid, position, value }`

---

## 11. 微信生态合规

### 登录 & 隐私

- 必须配置《用户协议》《隐私政策》页面（点击可查看全文）
- 首次启动显示协议勾选框，未勾选不可继续
- 静默登录：`wx.login()` → `code2Session` → OPENID
- 头像昵称：`chooseAvatar` + `nickname` input（用户主动触发）
- **游客模式必须保留**：不授权也能玩人机，不收集手机号

### 订阅消息

房间状态变更、对局邀请、对局结果三类模板。`wx.requestSubscribeMessage()` 在加入房间时引导授权。

### 分享

| 场景 | 类型 | 路径 | 说明 |
|------|------|------|------|
| 房间页 | `onShareAppMessage` | `room/detail?roomId=xxx` | 邀请好友→直达房间 |
| 结算页 | `onShareAppMessage` | `lobby` | 分享战绩 |
| 结算页 | `onShareTimeline` | `lobby` | 朋友圈单页模式 |

分享封面图：5:4，PNG，含"达芬奇密码"标题+邀请文案

### 音效 & 振动

- `wx.createInnerAudioContext()`，全局开关控制（设置页 + 本地 Storage）
- 音效：`draw` / `insert` / `guess_correct` / `guess_wrong` / `turn_start` / `victory` / `defeat` / `tile_flip`
- 振动：`light`(摸/插牌) / `medium`(猜对) / `wx.vibrateLong`(猜错)，跟随音效开关
- 音效+振动不阻塞主流程

### 广告 & 体积

- 流量主开通需 UV ≥ 1,000。大厅 Banner + 结算页激励视频（每日限 3 次）
- 主包 ≤ 2MB：图片 CDN (WebP)、room+result 分包

---

## 12. 非功能需求

### 性能指标

| 指标 | 目标 |
|------|:----:|
| 首屏加载 | < 3s（4G） |
| setData 单次 | < 100KB |
| 动画帧率 | ≥ 30fps |
| WXML 节点 | < 1000 |

### 弱网 & 持久化

- DB watch 断线自动重连，云函数失败重试 3 次
- 网络恢复后自动同步缺失状态
- 设置本地 `wx.setStorage`，核心数据（战绩）以服务端为准

### 防作弊

1. **服务端洗牌发牌**：客户端无法预知牌面
2. **隐藏信息保护**：云函数仅返回当前玩家有权看到的牌
3. **操作校验**：每步校验 OPENID + 回合顺序 + 游戏阶段
4. **安全规则**：客户端禁止直接写数据库
5. **去重 + 超时**：防重放，回合 60s 超时自动跳过

---

## 13. 项目文件结构

```
da-vinci-code-miniprogram/
├── miniprogram/
│   ├── app.js, app.json, app.wxss
│   ├── pages/
│   │   ├── login/index          # 登录授权
│   │   ├── lobby/index          # 大厅
│   │   ├── board/index          # ★ 游戏主界面
│   │   ├── tutorial/index       # 新手教程
│   │   ├── history/index        # 历史对局
│   │   └── settings/index       # 设置
│   ├── subpackages/
│   │   ├── room/create+detail   # 房间
│   │   └── result/index         # 结算
│   ├── components/
│   │   ├── game-tile/           # 单张牌
│   │   ├── player-hand/         # 手牌组件
│   │   ├── opponent-hand/       # 对手手牌
│   │   ├── guess-modal/         # 猜测弹窗
│   │   ├── game-info/           # 回合信息栏
│   │   └── player-avatar/       # 玩家头像
│   ├── utils/
│   │   ├── game-engine.js       # 洗牌/排序/校验
│   │   ├── ai-player.js         # AI 策略
│   │   ├── card-anim.js         # 推倒动画核心
│   │   ├── card-renderer.js     # Canvas 绘制
│   │   ├── audio.js             # 音效管理
│   │   ├── cloud-call.js        # 云函数封装
│   │   └── constants.js         # 常量
│   └── store/index.js           # 轻量状态
├── cloudfunctions/
│   ├── game/     # ★ 核心逻辑（handlers/ + engine/）
│   ├── room/     # 房间管理
│   ├── user/     # 用户
│   └── history/  # 对局记录
├── .mcp.json
└── project.config.json
```

---

## 14. 实施计划（7 阶段，21 天）

| 阶段 | 天 | 内容 |
|:----:|:--:|------|
| 1 | 1-2 | CloudBase 环境配置、数据库集合+安全规则、目录结构+分包 |
| 2 | 3-5 | `game-engine.js` 核心逻辑 + `game` 云函数（init/draw/insert/guess/pass）→ 单元测试 |
| 3 | 6-7 | `room` + `user` 云函数、lobby 页面（模式选择、房间加入） |
| 4 | 8-11 | 所有 UI 组件 + board 页面 + DB watch 实时同步 + 完整回合流程 |
| 5 | 12-13 | `ai-player.js` 三种难度 + 云函数 AI 集成 + AI 延迟动画 |
| 6 | 14-15 | `history` 云函数 + result 页 + history 页 + 分享 |
| 7 | 16-21 | tutorial + settings + 音效振动 + 动画打磨 + 弱网 + 全流程测试 + 审核提交 |

---

## 15. 测试计划

### 单元测试（Node.js）
- `game-engine.js`：牌组生成、洗牌、排序规则、胜负判定
- `ai-player.js`：AI 操作合法性

### 集成测试（微信开发者工具）
- 云函数独立调用、数据库 CRUD + 安全规则
- 完整 2/3/4 人对局、AI 三难度各 5 局、Joker 场景

### 场景清单
```
[ ] 首次进入 → 协议勾选 → 登录 → 大厅
[ ] 游客模式 → 仅可见人机模式
[ ] 创建房间 → 房间码生成 → 分享 → 好友点击直达房间
[ ] 完整流程：摸牌→插入→猜对继续→猜错回合结束
[ ] 猜中所有对手牌 → 推倒动画 → 胜利 → 结算
[ ] 🏠 返回大厅（联机保留房间 5 分钟）
[ ] ⏏ 退出本局（判负）
[ ] 断网重连 → 状态恢复
[ ] 回合超时 → 自动跳过
[ ] 手牌全翻开 → 出局 → 游戏继续
[ ] 历史记录保存 → 分页查看
[ ] 设置修改 → 重启保持
[ ] 分包按需加载
[ ] 空状态：无对局记录
```

### 性能校验
- 主包 ≤ 2MB · setData ≤ 100KB · 动画 ≥ 30fps · 首页 < 3s

---

## 16. Version 2 — 游客 ↔ 微信登录切换

> ⏳ 当前 V1 已实现游客和微信两种独立登录模式，但切换需手动操作。V2 完善无缝切换体验。

### 16.1 功能概述

| 功能 | V1 状态 | V2 目标 |
|------|:---:|------|
| 游客 UUID 身份 | ✅ | — |
| 微信登录获取 OpenID + 头像昵称 | ✅ | — |
| 游客本地缓存对局（≤10条） | ✅ | — |
| 微信用户云端存储对局 | ✅ | — |
| settings 游客 ↔ 微信切换入口 | ❌ | ✅ |
| lobby「‹ 退出」→ login 页 | ✅ | — |
| 游客 → 微信：**自动**数据迁移 | ❌ | ✅ |
| 微信 → 游客：退出登录后云端数据恢复 | ❌ | ✅ |
| `migrateRecords` 云函数 | ✅ | — |
| `login.migrateLocalRecords()` | ✅ | — |

### 16.2 游客 → 微信登录（数据迁移）

1. 用户游客模式积累本地对局记录（≤10条）
2. settings 页显「微信登录，永久保存对局记录」按钮
3. 静默授权 → `initSession` → 自动调 `migrateLocalRecords()`
4. 前端读 `history-cache` → 调云函数 `migrateRecords` → 批量写入 `game_records` 绑定 OPENID
5. 迁移后清空本地 `history-cache`，history 切换到云端查询
6. 进度提示「正在迁移 X 条记录…」

### 16.3 微信登录 → 游客（退出登录）

1. settings 显「退出登录」按钮
2. `store.set('user', null)` + `store.set('userType', 'tourist')` → `wx.reLaunch` lobby
3. 云端 `game_records` / `players` 完整保留
4. 再次微信登录 → `initSession` 从 `players` 恢复 stats

### 16.4 待实现文件

| 文件 | 变更 |
|------|------|
| `view/pages/settings/index.wxml` | 游客/微信双 UI（登录按钮 + 退出按钮 + 迁移按钮） |
| `view/pages/settings/index.js` | onTapLogin / onTapLogout / onTapMigrate handler |
| `service/auth/auth-service.js` | `initSession` 内自动调 `migrateLocalRecords` |

### 16.5 动画优化（V2）

**小程序加载动画**：图标渐变浮现 + 数字密码粒子飘散动画，替代当前 loading；加载完成后数字卡片依次滑入，引出游戏标题。

**回合切换动画**：轮到自己回合 → 自身头像边框呼吸发光；轮到对手 → 对手头像高亮。

**弹窗动画**：猜牌弹窗、提示弹窗、规则弹窗 → 统一缩放淡入弹出 + 遮罩层渐变。关闭反向缩放消失，杜绝生硬跳转。

**胜负揭晓动画**：10 个金色/灰色圆点从顶部飘落（替代当前 CSS 光晕方案，需解决真机 WebView 渲染限制）。

### 16.6 功能优化（V2）

**再来一局**：结算页添加按钮，按之前房间配置（好友/AI难度）快速重开。点击弹出确认弹窗后再创建。按钮间歇微光呼吸动画引导点击。
**游客模式更改头像昵称**：设置页添加更换头像昵称功能。
**人机模式增加不同AI个数**：支持1V2/1V3 AI。

### 16.7 设计优化（V2）

**Tile 样式**：进一步优化，更接近线下实体桌游塑料牌质感。

**UI 整体**：间距、字体、色彩统一审查优化。

### 16.8 AI 策略优化（V2）

**Joker 插入耗时**：AI 插入 Joker 时存在可感知延迟 → 用户容易推断 AI 放了 Joker。优化方向：给所有 AI 操作加随机延迟垫片，抹平 Joker 与非 Joker 操作的时间差异。

**摸牌选色防御性**：当前 pickColor 只考虑"获取信息"，未考虑"防御"——自己手牌中某颜色占比过高时，继续摸该颜色会让对手更容易一波推理清空。V2 加入防御权重：己方某色持有数多 → 降低摸该色的概率。

### 16.9 游客模式功能限制 & 登录引导（V2）

> 游客可完整游玩 2-4 人联机临时房间，以下场景弹出**轻提示**（可关闭，非强制阻断弹窗）：

| 触发场景 | 引导方式 |
|------|------|
| 对局结束 → 结算页 | 弹窗提示「登录微信可云端永久保存，换手机也能查看」 |
| 创建房间 > 3 次 | 底部小字提示「登录账号解锁历史房间存档」 |
| 进入历史页 | 游客仅展示本地缓存对局（≤10条），顶部 banner 提示「登录查看云端全部记录」 |
| settings 页 | 保留「微信登录」入口按钮 |
| 游客模式叠加态 | 所有游客功能正常可用，引导仅作非阻断轻提示，不降级体验 |

### 16.10 游客限流 & 孤儿房间清理（后续版本）

| 功能 | 说明 |
|------|------|
| 游客频率限制 | `rooms` 集合加 `creatorType` 字段（`'tourist'` / `'wechat'`），创建房间时游客每小时 ≤ 10 个 |
| 孤儿房间清理 | `room/index.js` 新增 `cleanupOrphanRooms` type，配合云函数定时触发器，每 6h 清理 `status=waiting` 且 `createdAt > 6h` 的房间（不区分 tourist/wechat） |
| UUID 校验 | 云函数入口校验 `touristId` 格式 `/^t_[a-z0-9]{10,20}$/` |

### 16.11 断线重连（V2）

> 当前 V1 已定义存储键（`LAST_ROOM_ID` / `LAST_GAME_ID`）和重连宽限期常量（`RECONNECT_GRACE_MS = 5分钟`），但未实现自动重连逻辑。V2 补全。

**场景**：玩家在游戏中被电话/切后台/杀进程中断，重新打开小程序后自动恢复到对局中。

**流程**：
1. `app.js onLaunch` / lobby `onShow` 检查 storage 中的 `LAST_ROOM_ID` / `LAST_GAME_ID`
2. 若存在且未超过 `RECONNECT_GRACE_MS`（5 分钟）：
   - 调用 `getGameState(gameId)` 查询对局是否仍在进行
   - 若 `status === 'playing'` 且玩家仍在 `turnOrder` 中 → 直接跳转 board 页恢复
   - 若对局已结束 → 跳转 result 页查看结算
   - 若玩家已被淘汰 / 超时 → 清除存储键，返回大厅
3. 进入 board 页时写入存储键，对局正常结束或退出时清除

**边界情况**：
- 对手已退出 → 断线者自动获胜，跳转结算
- 重连期间轮到自己的回合 → 正常等待，不跳过
- 网络断开后重连 → board 页已有 `watcher-base` 的自动重连机制（重试 3 次 + 降级轮询），与存储键重连互补
- 多个设备同时登录 → 以后登录者为准，旧设备存储键失效

### 16.12 多人对战 Corner Cases（V2）

> V1 已实现基本联机流程，以下边界情况在 V2 完善。

| 场景 | V1 现状 | V2 目标 |
|------|------|------|
| **对手主动退出** | 对手退出后，己方 watch 更新可检测到 `turnLog` 中的 `quit` 事件，弹窗提示「对手已退出，你获胜了」 | 弹窗样式统一、退出者自动判负并跳转结算、增加音效 |
| **对手断线（切后台/锁屏/杀进程）** | 无检测。己方一直等待对手行动，不知道对手已离线 | 断线宽限期 60s：超时后自动判负，弹窗提示「对手已断线」，跳转结算 |
| **房主在等待室解散房间** | 房主点击解散 → 房间被删除。但已加入的游客若仍在房间页，需要主动退出 | 解散时通过轮询检测房间不存在 → 弹窗提示「房间已解散」→ 返回大厅 |
| **房主在游戏中途退出** | 同「对手主动退出」处理 | 弹窗提示「房主已退出」→ 己方自动获胜 → 跳转结算 |
| **双方同时点击开始游戏** | 仅房主可点击，无并发问题 | 无需处理 ✅ |
| **网络恢复后游戏状态同步** | board 页 watcher-base 有自动重连 + 降级轮询 | 断线期间显示「网络断开」横幅，恢复后自动刷新状态并隐藏横幅 |
| **一局结束后重开（再来一局）** | 未实现 | 参考 §16.6「再来一局」功能 |
| **游客在游戏中被微信登录踢下线** | 无检测 | 游客 session 持续有效，不受微信登录影响。若后续支持多端登录再做冲突处理 |
| **房间满员后有人退出再加入** | `joinRoom` 检查 `players.length >= maxPlayers`，不允许加入 | 退出后房间有空位，允许新玩家加入 ✅（现状已支持） |
