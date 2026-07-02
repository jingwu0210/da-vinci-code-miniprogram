# 达芬奇密码 — 核心规则数学模型

> **目的**: 将桌游规则严格化为数学定义，直接映射到 `game-engine.js` 和 `game` 云函数的代码实现。

---

## 目录

1. [牌数据结构](#1-牌数据结构)
2. [回合状态机](#2-回合状态机)
3. [游戏初始化算法](#3-游戏初始化算法)
4. [猜牌判定算法](#4-猜牌判定算法核心)
5. [摸牌与插入算法](#5-摸牌与插入算法)
6. [数据视图与信息隔离](#6-数据视图信息隔离)
7. [AI 决策算法](#7-ai-决策算法)
8. [形式化验证断言](#8-形式化验证断言)
9. [边缘情况处理](#9-边缘情况处理)

---

## 1. 牌数据结构

### 1.1 原子类型

```
Color  ∈ { BLACK, WHITE }
Value  ∈ { -1, 0, 1, … , 11 }     // -1 = Joker，0~11 = 数字牌
```

### 1.2 单张牌 Tile

```
Tile = {
  id:          String,              // "t_0" ~ "t_25"
  color:       Color,
  value:       Value,
  isJoker:     Boolean,             // ⇔ (value === -1)
  position:    Integer | null,      // 在手牌序列中的索引，池中为 null
  isRevealed:  Boolean              // 已被猜中翻开？初始 false
}
```

**约束**:
- `isJoker ⇔ (value === -1)` 恒成立
- 一张牌在任意时刻仅属于「牌池」或「某位玩家的手牌」，不可同时存在两处
- `isRevealed` 只能从 `false → true`，不可逆

### 1.3 完整牌组 DECK

```
DECK = BLACK_TILES ∪ WHITE_TILES
  BLACK_TILES = { Tile(BLACK, v) | v ∈ {0..11} } ∪ { Tile(BLACK, -1, isJoker=true) }
  WHITE_TILES = { Tile(WHITE, v) | v ∈ {0..11} } ∪ { Tile(WHITE, -1, isJoker=true) }

|DECK| = 26
```

### 1.4 Tiles 数组（统一数据模型）

```
所有 26 张牌存储在一个扁平 tiles[] 数组中，每张牌通过 owner 字段标识归属：

tiles[i] = {
  ...Tile,
  owner: 'pool' | openid              // 'pool' = 在牌池中，openid = 属于某位玩家
}

牌池牌: tiles.filter(t => t.owner === 'pool')
玩家手牌: tiles.filter(t => t.owner === openid).sort((a,b) => a.position - b.position)

不变式: |{t | t.owner === 'pool'}| + |{t | t.owner !== 'pool'}| = 26
```

> **设计动机**: 替代旧 `pool` + `hands` 分离模型，从根本上杜绝同一张牌同时存在于池和手牌的 bug。

### 1.5 玩家手牌 Hand

```
Hand: [Tile]                           // 有序序列，tiles.filter(t => t.owner === openid)
初始大小: playerCount === 4 ? 3 : 4    // 2~3 人 → 4 张，4 人 → 3 张
位置: hand[i].position = i             // 插入后 reorderHand 重排
```

### 1.6 排序规则（全序 ≺）

```
SortKey(t) = (t.value, t.color)        // BLACK < WHITE 在同值情况下

t_a ≺ t_b  ⇔  (t_a.value < t_b.value)
             ∨ (t_a.value === t_b.value ∧ t_a.color === BLACK ∧ t_b.color === WHITE)
             ∨ (t_a.isJoker ∨ t_b.isJoker)    // Joker 自由位

即: 从小到大 → 同值黑左白右 → Joker 任意位置
```

> **注意**: 游戏规则中玩家**自行决定**插入位置并维持排序。云函数**不做排序正确性校验**——玩家放错位置会给对手提供额外信息，这是游戏策略的一部分。

---

## 2. 回合状态机

### 2.1 状态定义

```
GameState = {
  status:        'playing' | 'finished',
  phase:         'drawing' | 'inserting' | 'guessing' | 'waiting',
  turnOrder:     [openid],
  turnIndex:     Integer,
  tiles:         [Tile],              // 所有 26 张牌，通过 tile.owner 区分归属
  drawnTileId:   String | null,
  turnLog:       [TurnRecord],

  // Joker 初始摆放 (见 initGame)
  initialJokers:     { [openid]: [tile_id, ...] } | null,
  initialJokerTurn:  Integer | null,       // 当前摆放第几个玩家
  jokersToPlace:     [tile_id] | null,     // 当前玩家剩余待放 Joker
  originalTurnIndex: Integer,              // 正式回合先手

  // Joker 猜错揭示
  jokerPendingReveal: Boolean | null,

  maxTurnTime:   60000                  // ms
}
```

### 2.2 状态转移图

```
                 ┌────────────────────────────────────────┐
                 │                                        │
  ┌──────────┐   │   ┌──────────┐   ┌────────────┐       │
  │ WAITING  │───┼──►│ DRAWING  │──►│ GUESSING   │       │
  │(非己回合) │   │   │(摸牌中)   │   │(猜测中)     │       │
  └──────────┘   │   └──────────┘   └─────┬──────┘       │
       ▲         │     池空时跳过        │  │             │
       │         │   ┌──────────┐        │  │             │
       │         │   │ INSERTING│◄───────┘  │ 猜对继续     │
       │         │   │(插牌中)  │ 猜错Joker │             │
       │         │   └────┬─────┘           │             │
       │         │        │                 │             │
       │         │   ┌────▼────┐   ┌────────▼──┐         │
       │         │   │NEXT_TURN│◄──│ GUESSING   │         │
       │         └───│(切回合)  │   │ (猜错/放弃)│         │
       │             └────┬─────┘   └───────────┘         │
       │                  │                                │
       │             ┌────▼────┐                           │
       │             │GAME_OVER│                           │
       │             └─────────┘                           │
       │                                                  │
       └──────────────────────────────────────────────────┘
```

**说明**: DRAWING 摸牌后直接进入 GUESSING（暂不插入，猜错后自动插入或 Joker 手动放置）。INSERTING 仅用于：初始 Joker 摆放 + 猜错 Joker 后手动放置。

### 2.3 状态转移表

| 当前状态 | 事件 | 条件 | 下一状态 | 副作用 |
|----------|------|------|----------|--------|
| INIT | `INIT_JOKER` | 任意玩家有初始 Joker | INSERTING | initialJokerTurn=0, 第一个玩家的 Joker → drawnTileId |
| INSERTING | `INSERT_JOKER` | 同玩家还有 Joker | INSERTING | jokersToPlace.shift → drawnTileId |
| INSERTING | `INSERT_JOKER` | 当前玩家 Joker 放完，还有后续玩家 | INSERTING | initialJokerTurn++ → 下一个玩家的 Joker |
| INSERTING | `INSERT_JOKER` | 所有玩家 Joker 放完 | WAITING | initialJokerTurn=null, turnIndex=originalTurnIndex，正式回合开始 |
| WAITING | `BEGIN_TURN` | 轮到该玩家 | DRAWING | — |
| DRAWING | `DRAW_TILE(color)` | 该颜色池非空 | GUESSING | tile.owner → 玩家, drawnTileId, 暂不插入 |
| DRAWING | `DRAW_TILE` | 两颜色池皆空 | GUESSING | drawnTileId=null，跳过摸牌直接猜测 |
| INSERTING | `INSERT(pos)` | 猜错 Joker 后放置 | WAITING | isRevealed=true, jokerPendingReveal=null, turnIndex++ |
| GUESSING | `GUESS` → 正确 | 对手还有未翻牌 | GUESSING | 目标牌 isRevealed=true，可继续猜 |
| GUESSING | `GUESS` → 正确 | 所有对手全部翻开 | GAME_OVER | winner = 当前玩家 |
| GUESSING | `GUESS` → 错误(数字牌) | — | WAITING | 自动插入 + 亮牌, turnIndex++ |
| GUESSING | `GUESS` → 错误(Joker) | — | INSERTING | jokerPendingReveal=true，需手动放置 |
| GUESSING | `PASS(reveal=true)` | 有 drawnTile 且非 Joker | WAITING | 自动插入 + 亮牌, turnIndex++ |
| GUESSING | `PASS(reveal=true)` | 有 drawnTile 且是 Joker | INSERTING | 手动放置 Joker（亮牌已设置） |
| GUESSING | `PASS(reveal=false)` | 猜对后主动结束 | WAITING | 不亮牌, turnIndex++ |
| NEXT_TURN | — | 所有对手全翻开 | GAME_OVER | winner = 当前玩家 |
| NEXT_TURN | — | 否则 | WAITING | turnIndex = (turnIndex+1) % N |

### 2.4 回合超时

```
if phase ∈ {DRAWING, INSERTING, GUESSING} ∧ elapsed > 60000:
  → 自动 PASS → NEXT_TURN
```

### 2.5 退出与重连

```
QUIT(openid):
  1. 该玩家所有未翻牌 → isRevealed = true（全部翻开）
  2. turnOrder 移除该玩家
  3. 若只剩 1 位玩家 → GAME_OVER，该玩家获胜
  4. 否则 → NEXT_TURN

RECONNECT(openid, gameId):
  getGameState 返回:
  - 自己完整手牌
  - 对手仅 isRevealed=true 的牌
  - 当前 phase / currentTurn / pool剩余数量
  - turnLog 摘要
```

---

## 3. 游戏初始化算法

### 3.1 发牌流程

```
INIT_GAME(players, playerCount):
  1. 创建 26 张牌 (0-11 × 2 色 + Joker × 2)，全部 owner='pool', position=null

  2. Fisher-Yates 洗牌:
     for i = 25 down to 1:
       j = random(0, i)
       swap(deck[i], deck[j])

  3. 发牌:
     handSize = playerCount === 4 ? 3 : 4
     for each player:
       hand = deck.splice(0, handSize)
       sort(hand)                        // 按 SortKey 排序
       hand[i].owner = p.openid          // 归属玩家
     // 剩余牌保持 owner='pool'

  4. 先手确定:
     // 持有全局最小数字牌的玩家先手（Joker 不参与比较）
     firstPlayer = argmin(p ∈ players, min({t.value | t ∈ getPlayerHand(tiles, p), ¬t.isJoker}))
     平局则随机

  5. 收集初始 Joker → initialJokers
     若 anyJokers → 进入初始 Joker 摆放回合（按 turnOrder 依次放置）
     否则 → phase=DRAWING，正式回合开始

  6. 返回 gameState
```

### 3.2 牌数分布

| 人数 | 每人手牌 | 牌池 | 验证 |
|:----:|:--------:|:----:|:----:|
| 2 | 4 | 18 | 26-2×4=18 ✓ |
| 3 | 4 | 14 | 26-3×4=14 ✓ |
| 4 | 3 | 14 | 26-4×3=14 ✓ |

---

## 4. 猜牌判定算法（核心）

### 4.1 算法签名

```
MAKE_GUESS(guess, gameState) → result

guess = {
  gameId, targetOpenid, position, guessedValue
}

result = {
  isCorrect:       Boolean,
  revealedTile:    Tile | null,       // 猜对 → 返回对手翻开的牌
  myRevealedTile:  Tile | null,       // 猜错 → 返回自己亮出的牌
  gameOver:        Boolean,
  winner:          openid | null,
  nextPhase:       'guessing' | 'waiting' | 'game_over'
}
```

### 4.2 判定逻辑

```
MAKE_GUESS(guess, gameState):

  // ━━ 前置校验 ━━
  caller = cloud.getWXContext().OPENID
  Assert: caller === turnOrder[turnIndex]
  Assert: phase === 'guessing'
  Assert: targetOpenid ≠ caller
  Assert: 0 ≤ position < |hands[targetOpenid]|
  targetTile = hands[targetOpenid][position]
  Assert: targetTile.isRevealed === false

  // ━━ 核心判定 ━━
  if targetTile.isJoker:
    isCorrect = (guessedValue === -1)    // 猜 Joker 需猜值=-1
  else:
    isCorrect = (guessedValue === targetTile.value)     // 数字牌仅需数值匹配（颜色由牌背可见）

  // ━━ 副作用 ━━
  if isCorrect:
    targetTile.isRevealed = true

    if allOpponentsEliminated(caller, gameState):
      return { isCorrect: true, revealedTile: targetTile,
               gameOver: true, winner: caller, nextPhase: 'game_over' }
    else:
      return { isCorrect: true, revealedTile: targetTile,
               gameOver: false, nextPhase: 'guessing' }
  else:
    if gameState.drawnTileId:
      myTile = findById(hands[caller], gameState.drawnTileId)
      myTile.isRevealed = true
      gameState.drawnTileId = null
    gameState.phase = 'waiting'
    return { isCorrect: false, myRevealedTile: myTile,
             gameOver: false, nextPhase: 'waiting' }
```

### 4.3 Joker 判定矩阵

| 实际牌 | 猜测 | 结果 |
|--------|------|:---:|
| Joker 牌 | 猜 value=-1 | ✅ |
| Joker 牌 | 猜数字 (0~11) | ❌ |
| 数字牌 | 猜对其数值 | ✅ |
| 数字牌 | 猜错数值 | ❌ |
| 数字牌 | 猜 value=-1 (Joker) | ❌ |
**形式化**:
```
isGuessMatch(guess, tile) = (guess.value === tile.value)```

### 4.4 胜负判定

```
countUnrevealed(hand) = |{ t ∈ hand | ¬t.isRevealed }|

allOpponentsEliminated(player, gameState) =
  ∀ opponent ∈ turnOrder \ {player}:
    countUnrevealed(hands[opponent]) === 0
```

---

## 5. 摸牌与插入算法

### 5.1 摸牌

```
DRAW_TILE(gameState, color):
  Assert: caller === turnOrder[turnIndex] ∧ phase === 'drawing'
  // color ∈ { BLACK, WHITE } — 玩家选择摸哪种颜色的牌

  poolTiles = tiles.filter(t => t.owner === 'pool' && t.color === color)
  if |poolTiles| === 0:
    return { drawnTile: null, empty: true }  // 该颜色池空

  idx = random(0, |poolTiles| - 1)
  tile = poolTiles[idx]
  tile.owner = caller                       // 归属转移
  tile.position = getPlayerHand(tiles, caller).length
  drawnTileId = tile.id
  phase = 'inserting'
  turnLog.push({ turnNumber, playerOpenid: caller, action: 'draw', color })

  return { drawnTile: sanitize(tile), poolRemaining: { black, white, total } }

// 若两池皆空 → drawnTileId=null, phase→guessing (跳过插入)
```

### 5.2 插入

```
INSERT_TILE(gameState, position):
  Assert: caller === turnOrder[turnIndex] ∧ phase === 'inserting'
  Assert: drawnTileId ≠ null ∧ 0 ≤ position ≤ |hand|

  // 若为初始 Joker 摆放（initialJokerTurn != null），跳转到初始 Joker 逻辑
  // 若为猜错 Joker 揭示（jokerPendingReveal），放置后翻开 → 结束回合
  // 否则正常插入数字牌

  hand = getPlayerHand(tiles, caller)
  tile = hand.find(t => t.id === drawnTileId)

  // 非 Joker 牌校验排序约束
  if tile && !tile.isJoker:
    leftTile = position > 0 ? hand[position-1] : null
    rightTile = position < hand.length ? hand[position] : null
    Assert: sortKey(leftTile) ≤ sortKey(tile) ≤ sortKey(rightTile)

  // 执行插入
  without = hand.filter(t => t.id !== drawnTileId)
  without.splice(position, 0, tile)
  without.forEach((t, i) => { t.position = i })

  drawnTileId = null
  phase = 'guessing'
  turnLog.push({ turnNumber, playerOpenid: caller, action: 'insert', position })

  return { hand: sanitizeOwnHand(hand) }
```

---

## 6. 数据视图与信息隔离

### 6.1 `getGameState` 返回结构

```
getGameState(gameId, callerOpenid) → {
  self: {
    hand: [Tile],                          // 完整可见
    revealedCount: Integer
  },
  opponents: [{
    openid, nickName, avatarUrl,
    hand: [
      if isRevealed: { position, color, value, isJoker, isRevealed: true }
      else:         { position, color, isRevealed: false }    // 颜色可见，数字隐藏
    ],
    revealedCount: Integer
  }],
  game: {
    phase, currentTurnOpenid,
    poolRemaining: Integer,                 // 仅数量，不透露具体牌
    turnNumber: |turnLog|,
    myTurn: Boolean
  }
}
```

### 6.2 信息可见性矩阵

| 数据 | 自己 | 对手 |
|------|:---:|:---:|
| 自己手牌（颜色/数字/Joker） | ✅ | ❌（仅已翻开） |
| 对手已翻牌（颜色+数字） | ✅ | ✅ |
| 对手未翻牌（颜色） | ✅ | ✅（牌背有色） |
| 对手未翻牌（数字/Joker） | ❌ | ✅（仅自己） |
| 牌池具体牌 | ❌ | ❌ |
| 牌池剩余数量 | ✅ | ✅ |
| 完整 turnLog | ✅（仅自己操作） | ❌（仅摘要） |

---

## 7. AI 决策算法

> ⚠️ **待持续优化**: 概率矩阵未跨回合持久化（当前每轮重新计算）。
>
> **架构**: Medium/Hard 共享 `ai-common.evaluatePositions()`（seen表+否定+sortKey+空间约束+Joker推理）、`pickFallback()`（position感知兜底）。各策略仅保留差异化逻辑：Medium=评分选best，Hard=概率矩阵+中位加权+argmax。否定追踪为 **tile ID 绑定**（`makeGuess` 记录 `targetTileId`），位置偏移不受影响。

### 7.1 难度概览

```
EASY:   纯随机
MEDIUM: sortKey 上下界 + (value,color) 精确排除 + 否定信息 + 空间约束
HARD:   MEDIUM 全部逻辑 + 概率矩阵 + 中位加权(含位置偏置) + argmax
```

### 7.2 策略对比总表

#### 摸牌选色 `pickColor`

| | Easy | Medium | Hard |
|---|------|--------|------|
| 策略 | 有牌随机选 | 对手暗牌多的颜色优先 | 阶段感知: 早期(对手翻牌<40%)=Score=己方×2+对手暗牌数→建立信息垄断; 中后期=同Medium |

#### Joker 插入 `pickInsert` (Hard only)

| 位置特征 | 评分 |
|------|:---:|
| 挨着已翻牌 | **+3** |
| 左右有间隙(差值>2) | +1 |
| 默认 | 1 |
| 两端(pos=0或末尾) | -2 |
| 夹在同色相邻数字间(5b和6b) | -2 |

#### 如何猜测 `pickGuess`

**共享推理链** (`ai-common.evaluatePositions`):

1. **seen[value][color]** 精确表 — AI 手牌所有牌 + 已翻牌 → 按 (value,color) 精确标记
2. **否定信息** — tile ID 绑定 + 旧 position 格式兼容。对手猜测推断降权: 非绝对 mark，改为 `inferred` 计数 → penalty = min(0.3×count, 0.9)
3. **sortKey 上下界** — 每个未翻牌位找左右最近已翻非Joker牌的 sortKey 边界
4. **空间约束** — nLeft/nRight 计数 + unseenJ 边界缓冲（minVal/maxVal）。过滤时**每个相邻空位独立计算合法值范围并取并集**，阈值用 **该色 unseenJ 缓冲**：`above >= max(0, nRight - unseenJ_color)`
5. **Joker 推理** — 两条路径：
   - **必然 Joker**: `possible=[]` + 该色Joker未见 + tile未否定 → `possible=[-1]`
   - **随机 Joker**: `possible>0` + aiWrongJoker===0 → 动态概率 `unseenJ/(unrevTotal+2)`
6. **兜底 fallback** — 三级级联放宽（bothSeen 永不放松，只放宽 oneSeen）：pass1 strict → pass2 放宽bothSeen → pass3 放宽oneSeen → 退化全局bothSeen排除

| 维度 | Easy | Medium | Hard |
|------|------|--------|------|
| seen 表 | — | `seen[value][color]` | 同 Medium |
| 否定+推断 | — | tile ID 绑定 + inferred 惩罚 | 同 Medium |
| 空间约束 | — | 空位独立并集 + 该色 unseenJ 缓冲 | 同 Medium |
| Joker | 3% 猜 -1 | 必然Joker + 随机(动态概率) | 同 Medium |
| 选目标 | 随机 | 优先否定位置，其次候选数最少 | 同 Medium → P矩阵 → argmax |
| 边界优先 | — | 对手 revealedCount=0 时，两端 score-0.5 | 对手 revealedCount=0 且 possible>2 时，两端 ×1.2 |
| 位置先验 | — | — | 首位 rangeMid≤handLen×0.8，末位 rangeMid≥11-handLen×0.8 |
| 中位加权 | — | — | rangeMid + nLeft-nRight 偏置 |
| 兜底 | — | position 感知 + bothSeen 永不放宽 | 同 Medium |

```
Hard pickGuess 流程:
  ①~⑤ 完全同 Medium (seen表 → 否定 → sortKey → 空间约束 → Joker)
  ⑥ 候选值加权: Joker=unseenJ/(oppUnrev+1), 数字=1/(1+|v-rangeMid|)
  ⑦ argmax(P) 选最高置信度
  ⑧ 兜底: position 感知 fallback
```

#### 猜对后是否继续 `shouldContinue`

基于 `estimateConfidence(tiles, aiPlayer)` — 扫描对手所有未翻牌位，对每位置用 sortKey 约束计数候选值，返回最佳 `minCount` 和总暗牌 `totalUnrev`。

| 条件 | Easy | Medium | Hard |
|------|:---:|:------:|:---:|
| minCount = 1 | — | 100% | 100% |
| totalUnrev ≤ 2 | — | 100% | 100% |
| minCount = 2 | — | **70%** | **55%** |
| minCount = 3 | — | **50%** | **35%** |
| minCount ≥ 4 | — | **30%** | **20%** |
| 随机基线 | 30% | — | — |
| 连猜上限 | **无** | **无** | **无** |

**影响因子**:

| 因子 | 效果 | 适用 |
|------|:---:|:---:|
| 池空（无亮牌代价） | **×1.5** | Medium + Hard |
| 摸到 Joker | **×0.6** | Hard only |

**设计原理**: Hard 比 Medium 更谨慎。两者在终局和 100% 确定时全力冲刺。池空时无代价更激进，Joker 在手时更保守。

### 7.3 EASY — 纯随机

```
pickColor(pool): 随机选有牌的颜色
pickGuess(gs, aiPlayer): 随机目标 + 随机位置 + 随机值(3% Joker)
shouldContinue: 30% 概率继续，无上限
```

### 7.4 MEDIUM — 启发式推理

```
pickColor(pool, gs, aiPlayer):
  统计对手未翻牌中各色数量 → 优先摸暗牌多的颜色

pickGuess(gs, aiPlayer):
  委托给 C.evaluatePositions()
  选目标: score = possible.length - hasNeg + inferredPenalty → 最小 score 优先
  兜底: C.pickFallback()

shouldContinue: 基于 estimateConfidence + 池空因子 (70%/50%/30%)

pickInsert: 无 (随机)
```

### 7.5 HARD — Medium 全部逻辑 + 概率矩阵 + 阶段感知

```
pickColor(pool, gs, aiPlayer):
  早期(对手翻牌<40%): Score = 己方持有数×2 + 对手暗牌数 → 选高分色
  中后期: 对手暗牌多的颜色优先 (同 Medium)

pickInsert(handWithout, joker):
  评分每个位置: 挨已翻牌+3, 间隙+1, 两端-2, 相邻数字间-2 → 选最高分

pickGuess(gs, aiPlayer):
  委托给 C.evaluatePositions()
  概率矩阵: 中位加权 + 位置先验(首位/末位 bias) + inferred惩罚 + 边界奖励
  Joker 权重 = unseenJ/(对手暗牌+1)
  argmax(P) 选最高置信度
  兜底: C.pickFallback()

shouldContinue: 基于 estimateConfidence + 池空×1.5 + Joker×0.6 (55%/35%/20%)
```

---

## 8. 形式化验证断言

以下不变量在开发阶段以断言形式存在：

```
// 牌数守恒
invariant: |pool| + Σ |hands[p]| = 26

// 手牌排序
invariant: ∀p, ∀i<j where ¬hands[p][i].isJoker ∧ ¬hands[p][j].isJoker:
           SortKey(hands[p][i]) < SortKey(hands[p][j])

// 唯一性
invariant: 任意时刻每张牌仅属于 pool 或某位玩家

// 回合合法性
invariant: currentPlayer ∈ turnOrder
invariant: phase ∈ {drawing, inserting, guessing, waiting} while playing

// 翻牌不可逆
invariant: isRevealed 只能 false → true

// 猜测合法性
invariant: 不能猜已翻牌 ∧ 不能猜自己

// 信息隔离
invariant: 客户端返回的对手未翻牌不含 value/isJoker（颜色可见）
```

---

## 9. 边缘情况处理

| 情况 | 处理 |
|------|------|
| 牌池空时摸牌 | `drawnTile=null`，直接进入 guessing，无需插入 |
| 猜错时无 drawnTile | `myRevealedTile=null`，仅切换回合 |
| 剩 2 人且 1 人退出 | 另一人自动获胜 |
| 所有 Joker 在初始手牌中 | 合法，概率矩阵正确处理 |
| 手牌全是 Joker | 合法（概率极小），排序随意 |
| 4 人 × 3 张，牌池 14 张 | 26-12=14 ✓ |
| 2 人 × 4 张，牌池 18 张 | 26-8=18 ✓ |
