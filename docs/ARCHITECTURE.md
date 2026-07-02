# 系统架构设计文档

> 输出: 架构图 + 目录规范 + 分层依赖约束（禁止跨层非法调用）

---

## 1. 六层架构总图

```
┌──────────────────────────────────────────────────────────────────┐
│                        表现层 View                                │
│  pages/ · components/ · animations/ · guides/                    │
│  页面、自定义组件、动画、弹窗、新手引导                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ 仅调用 Service / Common
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                        业务层 Service                             │
│  game/ · room/ · ai/ · auth/ · history/                          │
│  游戏对局管理、手牌逻辑、AI 机器人、房间管理                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │ 仅调用 Model / Cloud / Utils
                             ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   数据层 Model    │  │  通信层 Cloud     │  │   工具层 Utils        │
│  entities/       │  │ cloud-functions/ │  │  shuffle/            │
│  store/          │  │ watch/           │  │  logger/             │
│  cache/          │  │ auth/            │  │  debounce/           │
│                  │  │                  │  │  format/             │
│ 牌·玩家·对局实体  │  │ 云函数·实时DB·    │  │  storage/            │
│ 本地状态·缓存    │  │ 微信授权·分享     │  │ 洗牌·日志·防抖·格式化  │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                        公共层 Common                              │
│  constants/ · enums/ · routes/ · theme/ · modal/                 │
│  全局常量、枚举、路由表、主题样式、通用弹窗                           │
│  ★ 所有层均可引用，Common 不引用任何其他层                           │
└──────────────────────────────────────────────────────────────────┘
```

### 依赖方向（单向）

```
View ──→ Service ──→ Model
  │         │
  │         ├──→ Cloud
  │         │
  │         └──→ Utils
  │
  └──→ Common

所有层 ──→ Common （无依赖、纯数据）
```

---

## 2. 分层目录结构规范

```
miniprogram/
│
├── common/                          # ★ 公共层 —— 所有层唯一合法公共依赖
│   ├── constants.js                 # 全局常量: 牌数26、人数上限4、超时60s
│   ├── enums.js                     # 枚举: Color, Phase, GameMode, RoomStatus, Difficulty
│   ├── routes.js                    # 路由表: 所有页面路径集中管理
│   ├── theme.wxss                   # 主题样式: 色板、字级、间距、圆角
│   ├── store.js                     # 全局轻量 Store（~50行）
│   ├── error-msg.js                 # 错误码 → 中文翻译（30+ 条目）
│   ├── storage-keys.js              # storage key 常量
│   ├── settings-cache.js            # 设置读写（音效/振动）
│   ├── history-cache.js             # 游客本地对局缓存（≤10 条）
│   ├── modal-helper.js              # 通用弹窗: 确认框、toast 统一封装
│   └── time.js                      # 时间格式化工具
│
├── view/                            # ★ 表现层 —— UI 渲染与用户交互
│   ├── pages/
│   │   ├── login/                   # 登录授权页
│   │   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── lobby/                   # 游戏大厅
│   │   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── single-config/           # 单机配置（难度选择）
│   │   ├── board/                   # 游戏主界面（核心）
│   │   │   ├── index.js / .wxml / .wxss / .json
│   │   ├── tutorial/                # 新手教程
│   │   ├── history/                 # 历史对局
│   │   ├── settings/                # 设置
│   │   └── agreement/               # 用户协议 & 隐私政策
│   ├── subpackages/
│   │   ├── room/
│   │   │   ├── create/index         # 创建房间
│   │   │   └── detail/index         # 房间等待室
│   │   └── result/
│   │       └── index                # 结算页
│   ├── components/                  # 自定义组件
│   │   ├── game-tile/               # 单张牌（3D 立体效果）
│   │   ├── player-hand/             # 手牌序列 + 插入槽 ▲
│   │   ├── opponent-hand/           # 对手手牌（暗牌）
│   │   └── guess-panel/             # 猜测面板（数字网格 0-11 + Joker）
│   ├── animations/                  # 动画模块（预留，board 页内联实现）
│   │   ├── tile-flip.js
│   │   ├── card-draw.js
│   │   └── victory.js
│   └── guides/                      # 教程数据（预留，tutorial 页内联实现）
│       └── steps.js
│
├── service/                         # ★ 业务层 —— 领域逻辑，无 UI 依赖
│   ├── game/
│   │   ├── game-manager.js          # 对局生命周期: init/start/end/quit
│   │   ├── turn-manager.js          # 回合流转: 状态机驱动
│   │   ├── guess-handler.js         # 猜测逻辑: 判定 + 副作用编排
│   │   └── draw-insert.js           # 摸牌+插入逻辑
│   ├── room/
│   │   └── room-manager.js          # 房间生命周期（含准备校验内联）
│   ├── ai/
│   │   ├── ai-controller.js         # AI 入口: 选择难度策略
│   │   ├── strategy-easy.js         # 简单：随机
│   │   ├── strategy-medium.js       # 中等：排除启发式
│   │   └── strategy-hard.js         # 困难：概率矩阵
│   ├── auth/
│   │   └── auth-service.js          # 登录/游客/会话管理
│   └── history/
│       └── history-service.js       # 记录保存/查询/统计
│
├── model/                           # ★ 数据层 —— 实体
│   └── entities/
│       ├── tile.js                  # Tile 实体: 工厂方法+属性校验
│       └── game-state.js            # GameState 实体: createInitialState + drawFromPool
│
├── cloud/                           # ★ 通信层 —— 所有外部 IO
│   ├── cloud-functions/
│   │   ├── game-call.js             # game 云函数调用封装
│   │   ├── room-call.js             # room 云函数调用封装
│   │   ├── user-call.js             # user 云函数调用封装
│   │   └── history-call.js          # history 云函数调用封装
│   ├── watch/
│   │   ├── room-watcher.js          # rooms 集合轮询（1.5s 间隔）
│   │   ├── game-watcher.js          # games 集合 DB watch
│   │   └── watcher-base.js          # watch 基类: 重连/降级轮询
│   ├── auth/
│   │   ├── wechat-auth.js           # wx.login / checkSession
│   │   └── profile-auth.js          # 头像/昵称获取
│   └── share/
│       └── share-helper.js          # onShareAppMessage 统一配置
│
└── utils/                           # ★ 工具层 —— 纯函数，无副作用
    ├── shuffle.js                   # Fisher-Yates 洗牌 + createDeck
    ├── sort-hand.js                 # 手牌排序 (SortKey 全序关系)
    ├── logger.js                    # 分级日志 (debug/info/warn/error)
    ├── login.js                     # 游客 ID / 微信登录 / 本地记录迁移
    ├── audio.js                     # 音效统一管理（draw/guess_correct/victory/defeat）
    └── local-storage.js             # wx.setStorage/getStorage 统一封装 + 异常兜底
```

---

## 3. 分层依赖约束

### 3.1 合法性矩阵

```
                 View   Service  Model   Cloud   Utils   Common
View          │   ✓   │   ✓   │  ✗   │  ✗   │  ✗   │   ✓   │
Service       │   ✗   │   ✓   │  ✓   │  ✓   │  ✓   │   ✓   │
Model         │   ✗   │   ✗   │  ✓   │  ✗   │  ✓   │   ✓   │
Cloud         │   ✗   │   ✗   │  ✗   │  ✓   │  ✓   │   ✓   │
Utils         │   ✗   │   ✗   │  ✗   │  ✗   │  ✓   │   ✓   │
Common        │   ✗   │   ✗   │  ✗   │  ✗   │  ✗   │   ✓   │
```

- `✓` = 允许 `import` / `require`
- `✗` = **禁止**（代码审查红线）

### 3.2 逐层约束细则

#### Common（公共层）—— 无依赖

```
可以做的事:
  - 定义常量: DECK_SIZE=26, MAX_PLAYERS=4, MAX_TURN_TIME=60000
  - 定义枚举:
      Color:        { BLACK: 'black', WHITE: 'white' }
      Phase:        { DRAWING, INSERTING, GUESSING, WAITING }
      GameMode:     { AI: 'ai', FRIENDS: 'friends' }
      RoomStatus:   { WAITING, PLAYING, FINISHED }
      Difficulty:   { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' }
      ErrorCode:    { NOT_YOUR_TURN, WRONG_PHASE, ... }
  - 路由路径集中声明（被 View 引用做跳转）
  - 主题 CSS 变量（被 View 的 wxss 引用）
  - 通用弹窗封装

禁止的事:
  - import 任何其他层
  - 包含任何业务逻辑
  - 访问 wx.* API（那是 Cloud 的职责）
  - 包含 any 类型
```

#### Utils（工具层）—— 仅依赖 Common

```
可以做的事:
  - shuffle.js:       输入数组 → 输出 shuffle 后数组（纯函数）
  - sort-hand.js:     输入 Tile[] → 输出按 SortKey 排序的 Tile[]
  - logger.js:        封装 console，分级 + 生产环境关闭
  - debounce.js:      标准防抖
  - throttle.js:      标准节流
  - format.js:        formatDuration(ms) → "5分32秒"
  - local-storage.js: 封装 wx.setStorage/getStorage/clearStorage + try/catch 兜底

禁止的事:
  - import Model / Service / View / Cloud
  - 产生网络请求或数据库操作
  - 直接操作 DOM / setData
```

#### Model（数据层）—— 仅依赖 Common + Utils

```
可以做的事:
  - tile.js:         createTile(color, value) → Tile（唯一工厂）
                     validateTile(tile) → Boolean
  - player.js:       createPlayer(openid, nickName, ...) → Player
  - game-state.js:   createInitialGameState(players) → GameState
                     updateGameState(prev, action) → GameState  // 不可变更新
  - room.js:         createRoom(config) → Room
  - app-store.js:    Event Store（发布订阅模式）
  - cache/*.js:      本地缓存读写

禁止的事:
  - import Service / View / Cloud
  - 调用 wx.cloud.*（那是 Cloud 的职责）
  - 包含 UI 逻辑
```

#### Cloud（通信层）—— 仅依赖 Common + Utils

```
可以做的事:
  - game-call.js:    callGameFunction(type, data) → Promise<result>
  - room-call.js:    callRoomFunction(type, data) → Promise<result>
  - user-call.js:    callUserFunction(type, data) → Promise<result>
  - history-call.js: callHistoryFunction(type, data) → Promise<result>
  - room-watcher.js: watchRoom(roomId, onUpdate, onError) → { close() }
  - game-watcher.js: watchGame(gameId, onUpdate, onError) → { close() }
  - watcher-base.js: 自动重连 + 降级轮询
  - wechat-auth.js:  login() / checkSession() / getOpenId()
  - share-helper.js: 统一分享配置

禁止的事:
  - import Model / Service / View
  - 包含业务逻辑（如判断谁能猜牌）
  - 直接操作 UI / setData
```

#### Service（业务层）—— 依赖 Model + Cloud + Utils + Common

```
可以做的事:
  - game-manager.js:
      initGame(config) → GameState         // 编排: cloud-call + model 工厂
      startTurn(gameState) → GameState     // 驱动状态机
      endGame(gameState, winner) → void    // 编排: cloud + model + history
  - turn-manager.js:
      transition(from, event) → Phase      // 状态机核心
  - guess-handler.js:
      validateGuess(guess, gameState) → Result
      executeGuess(guess, gameState) → GameState  // 编排副作用
  - ai-controller.js:
      executeAiTurn(gameState, difficulty) → AiAction[]
  - room-manager.js:
      createAndJoin(config) → Room
  - auth-service.js:
      initSession() → UserProfile

禁止的事:
  - import View
  - 直接操作 setData / WXML
  - 直接调用 wx.login（走 Cloud 层封装）
```

#### View（表现层）—— 依赖 Service + Common（禁止直接调 Model/Cloud）

```
可以做的事:
  - pages/*/index.js:
      onLoad → 调用 Service 获取数据 → setData 渲染
      事件处理 → 调用 Service 方法 → 更新 data
  - components/*/index.js:
      通过 properties 接收数据
      通过 triggerEvent 向上传递事件
  - animations/*.js:
      接收目标节点引用 → 执行动画序列 → 返回 Promise
  - guides/steps.js:
      纯数据: [{ title, content, image }]

禁止的事:
  - 直接 import Model 实体类（只能通过 Service 获取）
  - 直接 import Cloud 调用封装（只能通过 Service 发起）
  - 在 View 层写业务逻辑（判定、校验、状态机）
  - 在 wxml 中写复杂表达式
```

---

## 4. 核心模块接口契约

### 4.1 Service → View 暴露接口

```javascript
// service/game/game-manager.js —— View 唯一入口
const GameManager = {
  // 生命周期
  initAndGetState(roomId, players, mode): Promise<ClientGameState>
  getGameState(gameId):                     Promise<ClientGameState>

  // 玩家操作（每个返回新的 ClientGameState）
  drawTile(gameId):                         Promise<DrawResult>
  insertTile(gameId, position):             Promise<InsertResult>
  makeGuess(gameId, target, pos, val): Promise<GuessResult>
  passTurn(gameId):                         Promise<PassResult>
  quitGame(gameId):                         Promise<QuitResult>

  // AI
  requestAiMove(gameId, difficulty):        Promise<AiActionResult>

  // 订阅
  subscribe(gameId, onUpdate, onError):     { unsubscribe() }
}
```

### 4.2 Cloud → Service 暴露接口

```javascript
// cloud/cloud-functions/game-call.js
const GameCall = {
  initGame(data):         Promise<ApiResponse>
  getGameState(gameId):   Promise<ApiResponse>
  drawTile(gameId):       Promise<ApiResponse>
  insertTile(gameId, pos): Promise<ApiResponse>
  makeGuess(data):        Promise<ApiResponse>
  passTurn(gameId):       Promise<ApiResponse>
  quitGame(gameId):       Promise<ApiResponse>
  aiMove(gameId, diff):   Promise<ApiResponse>
}
```

### 4.3 Model 实体工厂接口

```javascript
// model/entities/tile.js
const Tile = {
  create(color, value, id?):        Tile     // 工厂方法
  isJoker(tile):                    Boolean
  sortKey(tile):                    [number, string]  // [value, color]
  compare(a, b):                    number   // -1/0/1
  toSelfTile(tile):                 SelfTile          // 客户端自己视图
  toOpponentTile(tile):             OpponentTile      // 客户端对手视图
  sanitizeForClient(tile, viewer):  SelfTile | OpponentTile
}

// model/entities/game-state.js
const GameState = {
  create(config):                   GameState
  update(state, action):            GameState   // 不可变
  getClientView(state, playerOpenid): ClientGameState
}
```

---

## 5. 典型调用链追踪

### 5.1 玩家摸牌：View → Service → Cloud → 云函数

```
View: board/index.js
  │  onTapDrawBtn()
  │  this.setData({ loading: true })
  │
  ▼
Service: game-manager.js
  │  GameManager.drawTile(gameId)
  │  1. 参数校验 (gameId 非空)
  │  2. 调用 cloud 层
  │
  ▼
Cloud: game-call.js
  │  GameCall.drawTile(gameId)
  │  wx.cloud.callFunction({ name: 'game', data: { type: 'drawTile', gameId } })
  │
  ▼  ── 网络边界 ──
  │
云函数 game/index.js
  │  handler: drawTile(event, context)
  │  caller = cloud.getWXContext().OPENID
  │  Assert: 当前玩家 + drawing 阶段 + pool 非空
  │  tile = pool.pop()
  │  hands[caller].push(tile)
  │  return { drawnTile, poolRemaining }
  │
  ▼  ── 网络边界 ──
  │
Cloud: game-call.js
  │  resp.result = { success: true, data: { drawnTile, poolRemaining } }
  │
  ▼
Service: game-manager.js
  │  1. 检查 resp.success
  │  2. 用 Model 工厂 sanitize drawnTile
  │  3. 更新本地 GameState 缓存
  │  4. 返回 DrawResult { drawnTile: SelfTile, poolRemaining, newPhase: 'inserting' }
  │
  ▼
View: board/index.js
  │  result = await GameManager.drawTile(gameId)
  │  this.setData({
  │    myDrawnTile: result.drawnTile,
  │    phase: 'inserting',
  │    poolRemaining: result.poolRemaining
  │  })
  │  → 界面自动切换到插入模式
```

### 5.2 对手摸牌（通过 Watch）：Cloud → Service → View

```
云函数: 玩家 B 调用了 drawTile
  │  games 文档 pool 减少、phase 变更
  │
  ▼
Cloud: game-watcher.js
  │  db.collection('games').doc(gameId).watch()
  │  onChange(snapshot) → 检测到变更
  │  sanitizedData = sanitize(snapshot.docs[0])
  │  // 关键: 仅保留当前玩家可见的字段
  │
  ▼
Service: game-manager.js
  │  onWatchUpdate(sanitizedData)
  │  1. 差异检测: 比较新旧 state
  │  2. 更新本地 GameState
  │  3. 触发 subscribe 回调
  │
  ▼
View: board/index.js
  │  GameManager.subscribe(gameId, (update) => {
  │    this.setData({
  │      poolRemaining: update.poolRemaining - 1,  // 仅减计数
  │      phase: 'waiting'                           // 自己的回合尚未开始
  │    })
  │  })
  │  → 界面更新牌池计数，等待对手完成后续操作
```

---

## 6. 禁止的非法调用清单

### 红线（代码审查自动拒绝）

| 编号 | 违规描述 | 示例 |
|:----:|----------|------|
| FC-1 | View 直接 import Model 实体 | `import { Tile } from '../../model/entities/tile'` 在 board/index.js 中 |
| FC-2 | View 直接 import Cloud 调用 | `import { GameCall } from '../../cloud/...'` 在 board/index.js 中 |
| FC-3 | View 包含业务逻辑 | 在 wxml 中写 `wx:if="{{phase === 'guessing' && targetTile.color === 'black'}}"` —— 应封装在 Service |
| FC-4 | Service 直接操作 setData | `this.setData(...)` 出现在 service/ 目录下 |
| FC-5 | Service 直接调用 wx.* API | `wx.cloud.callFunction(...)` 出现在 service/ 目录下 —— 应走 Cloud 层 |
| FC-6 | Model 调用 wx.cloud.* | model/ 下的文件访问网络 |
| FC-7 | Cloud 包含状态机逻辑 | cloud/ 下的文件判断 `if phase === 'drawing' then...` |
| FC-8 | Utils 产生副作用 | utils/ 下的文件访问 Storage/网络/文件系统（local-storage.js 除外） |
| FC-9 | Common 引用任何层级 | `import { Tile } from '../model/...'` 出现在 common/ 下 |
| FC-10 | 跨层循环依赖 | Service → Model → Service |

### 合规检查清单（开发阶段逐项验证）

```
[ ] View 层仅 import 自 service/ 和 common/
[ ] Service 层未 import 自 view/（无反向依赖）
[ ] Model 层未 import 自 cloud/ 或 service/
[ ] Cloud 层仅调用 wx.cloud.* 和 wx.* 原生 API
[ ] Utils 层所有函数为纯函数或仅封装 Storage
[ ] Common 层零 import（或仅 import 同层其他模块）
[ ] 无循环依赖
[ ] 每个 .js 文件可通过依赖图逆向追溯调用链
```

---

## 7. 目录清单（以 board 页为例）

```
miniprogram/
├── common/
│   ├── enums.js              # Phase enum, Color enum
│   └── constants.js          # DECK_SIZE = 26, POOL_EMPTY = -1
│
├── view/
│   └── pages/board/
│       ├── index.js          # ← 仅 import service + common
│       ├── index.wxml
│       ├── index.wxss
│       └── index.json        # 注册组件
│
├── service/
│   └── game/
│       ├── game-manager.js   # ← import model/ + cloud/ + utils/
│       ├── turn-manager.js   # ← import model/ + common/
│       └── guess-handler.js  # ← import model/ + common/
│
├── model/
│   └── entities/
│       ├── tile.js           # ← import common/
│       └── game-state.js     # ← import common/ + utils/
│
├── cloud/
│   ├── cloud-functions/
│   │   └── game-call.js      # ← import common/ + utils/
│   └── watch/
│       ├── watcher-base.js   # ← import common/ + utils/
│       └── game-watcher.js   # ← import common/ + utils/
│
└── utils/
    ├── shuffle.js            # ← 纯函数，import common/
    └── sort-hand.js          # ← 纯函数，import common/
```
