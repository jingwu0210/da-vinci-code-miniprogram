# 达芬奇密码 — 接口需求文档

> **版本**: v1.0　|　**日期**: 2026-06-22

---

## 目录

1. [概述与约定](#1-概述与约定)
2. [user 云函数](#2-user-云函数)
3. [room 云函数](#3-room-云函数)
4. [game 云函数](#4-game-云函数)
5. [history 云函数](#5-history-云函数)
6. [数据库 Watch 实时同步协议](#6-数据库-watch-实时同步协议)
7. [通用错误码](#7-通用错误码)
8. [类型定义附录](#8-类型定义附录)

---

## 1. 概述与约定

### 1.1 调用方式

所有云函数统一使用 `wx.cloud.callFunction({ name, data })` 调用：

```javascript
// 前端调用示例
const res = await wx.cloud.callFunction({
  name: 'game',
  data: {
    type: 'makeGuess',
    gameId: 'abc123',
    targetOpenid: 'oxxx',
    position: 1,
    value: 5
  }
})
// res.result = { success: true, data: { ... } }
```

### 1.2 通用返回格式

```
所有云函数统一返回:
{
  success:  Boolean,       // true | false
  data?:    any,           // 业务数据（success=true 时存在）
  error?:   String,        // 错误消息（success=false 时存在）
  errorCode?: String       // 错误码（见 §7）
}
```

### 1.3 身份识别

云函数采用三层 fallback 身份解析：

```javascript
const caller = event.callerOpenid || cloud.getWXContext().OPENID || event.touristId;
```

| 场景 | callerOpenid | OPENID | touristId | 最终身份 |
|------|:---:|:---:|:---:|------|
| AI 操作 | ✅ | — | — | AI openid |
| 微信登录用户 | — | ✅ | — | 真实 OPENID |
| 游客 | — | undefined | ✅ | UUID |

- 游客 ID 由前端生成：`t_` + 13 位 base36 随机字符串，持久化 storage
- 所有客户端调用自动附带 `touristId` 参数
- CloudBase 需开启「未登录用户访问权限」

### 1.4 命名约定

| 前缀 | 含义 | 示例 |
|------|------|------|
| `t_` | Tile id | `"t_0"` ~ `"t_25"` |
| `g_` | Game id | `"g_abc123"` |
| 大写字母+数字 | Room id | `"ABC123"` |
| `oxxx` | OpenID 占位 | 实际为微信 OPENID |

---

## 2. user 云函数

### 2.1 login

静默登录，获取/创建用户资料。

```
type: 'login'

■ 入参:
  (无 —— OPENID 从 cloud.getWXContext() 获取)

■ 出参 (success):
{
  profile: {
    openid:      String,
    nickName:    String,           // 已授权的昵称，否则 ""
    avatarUrl:   String,           // 已授权的头像，否则默认图
    stats: {
      totalGames: Integer,
      wins:       Integer,
      losses:     Integer,
      bestStreak: Integer
    },
    createdAt:   ISODateString,
    lastLoginAt: ISODateString
  },
  isNewUser: Boolean               // 是否首次登录
}
```

### 2.2 getProfile

获取指定用户的公开资料（用于显示对手信息）。

```
type: 'getProfile'

■ 入参:
{
  openid: String                   // 要查询的用户 OPENID
}

■ 出参 (success):
{
  profile: {
    openid:    String,
    nickName:  String,
    avatarUrl: String,
    stats: {
      totalGames: Integer,
      wins:       Integer
    }
  }
}

■ 错误:
  USER_NOT_FOUND
```

### 2.2a getOpenid

获取当前用户的真实 OPENID（游客调用返回 null）。

```
type: 'getOpenid'

■ 入参: 无

■ 出参 (success):
{ openid: String | null }

■ 说明: 可用于前端判断是否有微信登录态
```

### 2.2b migrateRecords

游客切换微信登录后，将本地缓存的游客对局批量迁移到云端。

```
type: 'migrateRecords'

■ 入参:
{ records: [{ mode, players, totalTurns, duration, ... }] }

■ 出参 (success):
{ migrated: Integer }

■ 说明: 仅在 userType='wechat' 时调用
```

### 2.3 updateProfile

更新自己的昵称/头像。

```
type: 'updateProfile'

■ 入参:
{
  nickName?:  String,              // 可选，最多 20 字符
  avatarUrl?: String               // 可选
}

■ 出参 (success):
{
  profile: { openid, nickName, avatarUrl }   // 更新后的完整信息
}

■ 错误:
  NICKNAME_TOO_LONG                 // 昵称超过 20 字符
```

---

## 3. room 云函数

### 3.1 createRoom

创建房间并返回房间信息。

```
type: 'createRoom'

■ 入参:
{
  mode:        'ai' | 'friends',   // 游戏模式
  maxPlayers:  2 | 3 | 4,          // （仅 friends 模式）最大人数
  password?:   String,              // （可选）房间密码，最多 6 位
  difficulty?: 'easy' | 'medium' | 'hard'  // （仅 ai 模式）AI 难度
}

■ 出参 (success):
{
  room: {
    roomId:          String,        // 6 位房间码，如 "ABC123"
    mode:            String,
    maxPlayers:      Integer,
    hasPassword:     Boolean,       // 是否有密码
    difficulty:      String | null, // 仅 ai 模式
    creatorOpenid:   String,
    status:          'waiting',
    players: [{
      openid:    String,
      nickName:  String,
      avatarUrl: String,
      isReady:   Boolean,
      isAI:      Boolean,
      seatIndex: Integer            // 0-based
    }],
    createdAt:       ISODateString
  }
}

■ 错误:
  INVALID_MODE
  INVALID_PLAYER_COUNT
  ROOM_CREATE_FAILED
```

### 3.2 joinRoom

加入已有房间。

```
type: 'joinRoom'

■ 入参:
{
  roomId:   String,                 // 6 位房间码
  password?: String                 // 房间密码（若设置了密码则必填）
}

■ 出参 (success):
  { room }                           // 同上 createRoom 的 room 结构

■ 错误:
  ROOM_NOT_FOUND                    // 房间不存在
  ROOM_FULL                         // 房间已满
  ROOM_STARTED                      // 游戏已开始
  WRONG_PASSWORD                    // 密码错误
  ALREADY_IN_ROOM                   // 已在房间中
```

### 3.3 leaveRoom

离开房间。

```
type: 'leaveRoom'

■ 入参:
{
  roomId: String
}

■ 出参 (success):
{
  roomDeleted: Boolean              // 房间是否因无人而删除
}

■ 副作用:
  - 从 players 列表移除
  - 若是房主离开 → 顺延给下一位玩家
  - 若房间变空 → 删除房间文档
```

### 3.4 toggleReady

切换准备/取消准备状态。

```
type: 'toggleReady'

■ 入参:
{
  roomId:  String,
  isReady: Boolean
}

■ 出参 (success):
{
  room: { players: [{ openid, isReady }], allReady: Boolean }
}

■ 错误:
  NOT_IN_ROOM
  ROOM_NOT_WAITING
```

### 3.5 startGame

（仅房主）开始游戏。

```
type: 'startGame'

■ 入参:
{
  roomId: String
}

■ 出参 (success):
{
  gameId: String,                   // 新创建的对局 ID
  roomId: String
}

■ 错误:
  NOT_ROOM_CREATOR                  // 非房主
  NOT_ALL_READY                     // 还有玩家未准备
  ROOM_ALREADY_STARTED
  // 或 game.initGame 的错误
```

---

## 4. game 云函数

### 4.1 initGame

初始化对局（由 room.startGame 内部调用，也可 AI 模式直接调用）。

```
type: 'initGame'

■ 入参:
{
  roomId:    String,
  players:   [{ openid: String, isAI?: Boolean }],
  mode:      'ai' | 'friends',
  difficulty?: 'easy' | 'medium' | 'hard'   // AI 模式必填
}

■ 出参 (success):
{
  gameId:      String,
  myHand:      [Tile],              // 当前调用者的手牌（完整）
  turnOrder:   [String],            // openid 列表，按回合顺序
  currentTurnOpenid: String,
  poolRemaining: Integer            // 牌池剩余数
}
```

### 4.2 getGameState

获取/刷新当前对局状态（用于进入对局页和断线重连）。

```
type: 'getGameState'

■ 入参:
{
  gameId: String
}

■ 出参 (success):
{
  gameId:    String,
  roomId:    String,
  status:    'playing' | 'finished',

  // ═══ 自己 ═══
  self: {
    hand: [SelfTile],               // 完整手牌（见下方类型）
    revealedCount: Integer
  },

  // ═══ 对手 ═══
  opponents: [{
    openid:     String,
    nickName:   String,
    avatarUrl:  String,
    hand: [OpponentTile],           // 仅包含已翻牌信息（见下方类型）
    revealedCount: Integer
  }],

  // ═══ 对局信息 ═══
  game: {
    phase:               'drawing' | 'inserting' | 'guessing' | 'waiting',
    currentTurnOpenid:   String,
    turnNumber:          Integer,   // 当前回合编号 (1-based)
    poolRemaining:       Integer,
    myTurn:              Boolean,   // 是否轮到当前调用者
    winner:              String | null,  // 获胜者 openid（game_over 时）
    myDrawnTile:         SelfTile | null  // 当前回合自己摸的牌（drawing/inserting 阶段可见）
  }
}

// SelfTile = { id, color, value, isJoker, position, isRevealed }
// OpponentTile = isRevealed
//   ? { position, color, value, isJoker, isRevealed: true }
//   : { position, isRevealed: false }
```

### 4.3 drawTile

摸牌。玩家选择摸黑色或白色。

```
type: 'drawTile'

■ 入参:
{
  gameId: String,
  color:  'black' | 'white'         // 选择摸哪种颜色的牌
}

■ 出参 (success):
{
  drawnTile:     SelfTile | null,   // null = 该颜色池空
  poolRemaining: { black: Integer, white: Integer, total: Integer },
  empty?:        Boolean            // 该颜色池空时为 true
}

■ 错误:
  NOT_YOUR_TURN
  WRONG_PHASE                      // 当前不在 drawing 阶段
  GAME_NOT_FOUND
  GAME_ALREADY_FINISHED
```

### 4.4 insertTile

插入摸到的牌。

```
type: 'insertTile'

■ 入参:
{
  gameId:   String,
  position: Integer                 // 0 ≤ position ≤ current hand length
}

■ 出参 (success):
{
  hand:  [SelfTile],                // 更新后的手牌序列
  phase: 'guessing'                 // 当前阶段已进入猜测
}

■ 错误:
  NOT_YOUR_TURN
  WRONG_PHASE                      // 不在 inserting 阶段
  INVALID_POSITION                 // position 越界
  NO_DRAWN_TILE                    // 尚未摸牌
```

### 4.5 makeGuess ★ 核心

猜测对手某张牌。

```
type: 'makeGuess'

■ 入参:
{
  gameId:        String,
  targetOpenid:  String,            // 被猜的对手
  position:      Integer,           // 对手手牌中的位置
  value:         Integer            // -1 表示猜 Joker，0~11 普通数字
}

■ 出参 (success):
{
  // ── 猜测结果 ──
  isCorrect: Boolean,

  // ── 猜对时 ──
  revealedTile?:   OpponentTile,    // 被翻开的对手牌（含 color, value）

  // ── 猜错时 ──
  myRevealedTile?: SelfTile | null, // 自己亮出的牌（null = 牌池空时无牌可亮）

  // ── 全局状态 ──
  gameOver:        Boolean,
  winner:          String | null,   // openid（gameOver=true 时）
  nextPhase:       'guessing' | 'waiting' | 'game_over',
                                    // guessing: 可继续猜
                                    // waiting: 猜错/放弃，等下一个回合
                                    // game_over: 游戏结束
  nextTurnOpenid?: String,          // nextPhase=waiting 时，下一个回合的玩家

  // ── 可继续猜时的额外信息 ──
  guessableTargets?: [{             // nextPhase=guessing 时返回
    openid:   String,
    nickName: String,
    unrevealedPositions: [Integer]  // 还有哪些位置可猜
  }]
}

■ 错误:
  NOT_YOUR_TURN                    // 不是当前玩家的回合
  WRONG_PHASE                      // 不在 guessing 阶段
  INVALID_TARGET                   // targetOpenid 无效（非玩家/自己）
  INVALID_POSITION                 // position 越界或该位置已是空位
  ALREADY_REVEALED                 // 该位置的牌已被翻开
  GAME_NOT_FOUND
  GAME_ALREADY_FINISHED
```

### 4.6 passTurn

结束猜测阶段。**pass = 猜错处理 —— 当前玩家摸的牌会被翻开 (isRevealed=true)**。

```
type: 'passTurn'

■ 入参:
{
  gameId: String
}

■ 出参 (success):
{
  nextTurnOpenid: String,
  nextPhase: 'waiting',
  revealedTile:  SelfTile | null    // 被翻开的自己摸的牌
}

■ 错误:
  NOT_YOUR_TURN
  WRONG_PHASE                      // 不在 guessing 阶段
```

### 4.7 quitGame

主动退出对局（判定当前玩家为负方）。

```
type: 'quitGame'

■ 入参:
{
  gameId: String
}

■ 出参 (success):
{
  quit:          Boolean,
  remainingPlayers: Integer,
  gameContinues: Boolean,          // 若 >1 人剩余则为 true
  winner:        String | null     // 若仅剩 1 人则自动获胜
}

■ 副作用:
  - 该玩家全部手牌 isRevealed=true
  - turnOrder 移除该玩家
  - 若剩 1 人 → GAME_OVER
```

### 4.8 aiMove

（仅 AI 模式）执行完整 AI 回合。前端需为每个 action 播放对应的 toast/动画，最后调用 `getGameState` 刷新。

```
type: 'aiMove'

■ 入参:
{
  gameId:     String,
  difficulty: 'easy' | 'medium' | 'hard'
}

■ 出参 (success):
{
  actions: [{                        // AI 回合的动作序列（按时间顺序）
    action: 'draw',                  // 摸牌
    color:  'black' | 'white'
  }, {
    action: 'insert',                // 插牌
    position: Integer
  }, {
    action: 'guess',                 // 猜测
    target:    String,               // 被猜对手 openid
    position:  Integer,
    value:     Integer,              // -1 猜 Joker，0~11 猜数字
    isCorrect: Boolean
  },
  // ... 可能多轮 guess (猜对继续) + 最后 pass
  {
    action: 'pass'
  }],

  // 最终状态
  gameOver: Boolean,
  winner:   String | null            // gameOver=true 时
}
```

---

## 5. history 云函数

### 5.1 saveRecord

游戏结束时保存对局记录并更新玩家统计。

```
type: 'saveRecord'

■ 入参:
{
  gameId: String
}

■ 出参 (success):
{
  record: {
    id:      String,
    mode:    'ai' | 'friends',
    players: [{
      openid:         String,
      nickName:       String,
      isWinner:       Boolean,
      tilesRemaining: Integer        // 游戏结束时未翻开的牌数
    }],
    totalTurns:  Integer,
    duration:    Integer,            // 秒
    createdAt:   ISODateString
  }
}

■ 副作用:
  - 每个参与玩家的 stats（totalGames/wins/losses）更新
  - game 文档标记 status='finished'
```

### 5.2 getRecords

获取自己的对局记录。

```
type: 'getRecords'

■ 入参:
{
  page:     Integer,                 // 页码，1-based
  pageSize: Integer                  // 每页数量，建议 20
}

■ 出参 (success):
{
  records: [{                        // 按 createdAt 降序
    id,
    mode,
    players: [{ openid, nickName, isWinner, tilesRemaining }],
    totalTurns,
    duration,
    createdAt
  }],
  total:    Integer,                 // 总记录数
  page:     Integer,
  pageSize: Integer,
  hasMore:  Boolean
}
```

---

## 6. 数据库 Watch 实时同步协议

### 6.1 监听目标

```
仅监听 games 集合：
  db.collection('games').doc(gameId).watch({
    onChange: handleChange,
    onError:  handleError
  })
```

> `rooms` 集合同理：`db.collection('rooms').doc(roomId).watch()`

### 6.2 rooms 文档变更事件

| 变更字段 | 触发时机 | 前端处理 |
|----------|----------|----------|
| `players` 新增 | 有玩家加入房间 | 更新等待室玩家列表 |
| `players[x].isReady` | 某玩家准备/取消 | 更新该玩家的准备图标 |
| `status → 'playing'` | 房主开始游戏 | 跳转 board 页 |
| 文档删除 | 房间被解散 | 提示"房间已解散"，返回大厅 |

### 6.3 games 文档变更事件

| 变更字段 | 触发时机 | 前端可见信息 | 处理动作 |
|----------|----------|-------------|----------|
| `phase + currentTurnOpenid` 变为匹配自己 | 轮到自己回合 | 完整状态 | 切换到 drawing 阶段 UI |
| `phase + currentTurnOpenid` 变为匹配他人 | 轮到对手回合 | 仅知道轮到他 | 切换到 waiting 态，显示"对手行动中" |
| `pool` 数量减少 | 有人摸牌 | 仅看到 `poolRemaining` 减 1 | 更新牌池计数 |
| 对手 `playerHands[x][y].isRevealed → true` | 对手的牌被翻开（猜对或猜错） | **仅翻开的牌的颜色/数值** | 更新该对手手牌显示 |
| 自己 `playerHands[x][y].isRevealed → true` | 自己的牌被对手猜对 / 自己猜错亮牌 | 自己的牌完整信息 | 更新自己的手牌显示 |
| `status → 'finished'` | 游戏结束 | winner | 跳转 result 页 |

### 6.4 文档完整结构（服务端视角）

```javascript
// games 集合文档——服务端完整视图（客户端不可直接读取此结构）
{
  _id:        "auto",
  roomId:     "ABC123",

  status:     "playing" | "finished",
  phase:      "drawing" | "inserting" | "guessing" | "waiting",
  winner:     String | null,

  tiles:      [Tile],                // 所有 26 张牌，通过 tile.owner 区分归属
                                     //   owner: 'pool' | openid
                                     //   池牌: tiles.filter(t => t.owner === 'pool')
                                     //   手牌: tiles.filter(t => t.owner === openid)

  turnOrder:          [String],      // openid 列表
  turnIndex:          Integer,
  drawnTileId:        String | null,

  // Joker 初始摆放
  initialJokers:      { [openid]: [tile_id] } | null,
  initialJokerTurn:   Integer | null,
  jokersToPlace:      [tile_id] | null,
  originalTurnIndex:  Integer,

  // Joker 猜错揭示
  jokerPendingReveal: Boolean | null,

  maxTurnTime:        60000,         // ms

  turnLog: [{
    turnNumber:    Integer,
    playerOpenid:  String,
    action:        "draw" | "insert" | "guess" | "pass" | "quit",
    // 按 action 类型不同
    targetOpenid?: String,
    position?:     Integer,
    guessedValue?: Integer,
    isCorrect?:    Boolean,
    targetColor?:  String,
    timestamp:     ISODate
  }],

  createdAt:  ServerDate,
  updatedAt:  ServerDate
}
```

### 6.5 客户端接收数据规范（由云函数 sanitize 后下发）

```javascript
// 客户端拿到的是 getGameState 返回值，而非 games 文档原文
// 安全规则也禁止客户端直接读取 games 文档中的对手未翻牌
{
  self: {
    hand: [
      { id, color, value, isJoker, position, isRevealed }
      // ↑ 自己的牌——全部可见
    ]
  },
  opponents: [
    {
      openid, nickName, avatarUrl,
      hand: [
        // 已翻开: { position, color, value, isJoker, isRevealed: true }
        // 未翻开: { position, color, isRevealed: false }  // 颜色由牌背可见
      ]
    }
  ],
  game: {
    phase, currentTurnOpenid, turnNumber, poolRemaining, myTurn
  }
}
```

### 6.6 Watch 异常处理

```
onError(err):
  1. 记录错误日志
  2. 尝试重新建立 watch (延迟 2s)
  3. 重连成功后调用 getGameState 同步最新状态
  4. 若连续失败 3 次 → 切换为轮询模式（每 3s 调用 getGameState）
```

### 6.7 竞态条件处理

```
场景: 玩家 A 点击"摸牌"，同时玩家 B 也点击"摸牌"（两人都认为轮到自己）

防御: 云函数校验 currentTurnOpenid + phase，只有合法操作才能成功
      → 非当前玩家的操作返回 NOT_YOUR_TURN 错误
      → 前端收到该错误时，调用 getGameState 刷新本地状态
```

---

## 7. 通用错误码

| 错误码 | HTTP 类比 | 含义 |
|--------|-----------|------|
| `OK` | 200 | 成功（`success: true`） |
| `INVALID_PARAMS` | 400 | 入参格式错误 |
| `NOT_AUTHORIZED` | 401 | 未登录或 OPENID 缺失 |
| `NOT_YOUR_TURN` | 403 | 不是当前回合玩家 |
| `WRONG_PHASE` | 403 | 当前游戏阶段不允许该操作 |
| `GAME_NOT_FOUND` | 404 | 对局不存在 |
| `ROOM_NOT_FOUND` | 404 | 房间不存在 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `ROOM_FULL` | 409 | 房间已满 |
| `ROOM_STARTED` | 409 | 游戏已开始，无法加入 |
| `ALREADY_IN_ROOM` | 409 | 已在房间中 |
| `ALREADY_REVEALED` | 409 | 该位置的牌已被翻开 |
| `WRONG_PASSWORD` | 403 | 房间密码错误 |
| `NOT_ROOM_CREATOR` | 403 | 仅房主可执行 |
| `NOT_ALL_READY` | 412 | 还有玩家未准备 |
| `NOT_IN_ROOM` | 404 | 该玩家不在房间中 |
| `INVALID_TARGET` | 400 | 猜测目标无效 |
| `INVALID_POSITION` | 400 | 位置越界 |
| `INVALID_MODE` | 400 | 游戏模式参数无效 |
| `INVALID_PLAYER_COUNT` | 400 | 人数参数无效 |
| `NO_DRAWN_TILE` | 412 | 尚未摸牌（先 insert 了） |
| `GAME_ALREADY_FINISHED` | 409 | 对局已结束 |
| `ROOM_NOT_WAITING` | 409 | 房间不在等待状态 |
| `NICKNAME_TOO_LONG` | 400 | 昵称过长 |
| `RATE_LIMITED` | 429 | 操作过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务端未知错误 |

---

## 8. 类型定义附录

### 8.1 Tile（完整）

```typescript
interface Tile {
  id:          string               // "t_0" ~ "t_25"
  value:       number               // -1 (Joker) | 0~11
  isJoker:     boolean              // ⇔ value === -1
  position:    number | null        // 在手牌中的索引；池中为 null
  isRevealed:  boolean              // 是否已被翻开
}
```

### 8.2 SelfTile（自己的牌——完整）

```typescript
// 与 Tile 相同，客户端完全可见
interface SelfTile extends Tile {}
```

### 8.3 OpponentTile（对手的牌——信息受限）

```typescript
type OpponentTile =
  | { position: number; color: 'black' | 'white'; isRevealed: false }
  | { position: number; isRevealed: true; color: 'black' | 'white'; value: number; isJoker: boolean }
```

### 8.4 GameState（客户端视图）

```typescript
interface ClientGameState {
  gameId:   string
  roomId:   string
  status:   'playing' | 'finished'
  self: {
    hand:           SelfTile[]
    revealedCount:  number
  }
  opponents: {
    openid:         string
    nickName:       string
    avatarUrl:      string
    hand:           OpponentTile[]
    revealedCount:  number
  }[]
  game: {
    phase:              'drawing' | 'inserting' | 'guessing' | 'waiting'
    currentTurnOpenid:  string
    turnNumber:         number
    poolRemaining:      number
    myTurn:             boolean
    winner:             string | null
    myDrawnTile:        SelfTile | null
  }
}
```

### 8.5 Room（客户端视图）

```typescript
interface ClientRoom {
  roomId:         string            // 6 位码
  mode:           'ai' | 'friends'
  maxPlayers:     2 | 3 | 4
  hasPassword:    boolean
  difficulty:     'easy' | 'medium' | 'hard' | null
  creatorOpenid:  string
  status:         'waiting' | 'playing' | 'finished'
  players: {
    openid:       string
    nickName:     string
    avatarUrl:    string
    isReady:      boolean
    isAI:         boolean
    seatIndex:    number
  }[]
  createdAt:      string            // ISO 8601
}
```

### 8.6 GameRecord

```typescript
interface GameRecord {
  id:         string
  mode:       'ai' | 'friends'
  players: {
    openid:         string
    nickName:       string
    isWinner:       boolean
    tilesRemaining: number
  }[]
  totalTurns:  number
  duration:    number                // 秒
  createdAt:   string                // ISO 8601
}
```

### 8.7 AiAction（AI 回合动作序列）

```typescript
type AiAction =
  | { action: 'draw';   result: { drawnTile: SelfTile | null; poolRemaining: number } }
  | { action: 'insert'; result: { position: number } }
  | { action: 'guess';  result: {
      targetOpenid:  string
      position:       number
      guessedValue:   number
      isCorrect:      boolean
      revealedTile?:  OpponentTile
      myRevealedTile?: SelfTile | null
    }}
  | { action: 'pass' }
```
