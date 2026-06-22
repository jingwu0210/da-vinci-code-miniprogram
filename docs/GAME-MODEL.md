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

### 1.4 牌池 Pool

```
Pool: [Tile]                           // 未发出的牌
初始: Pool = shuffle(DECK)
不变式: |Pool| + Σ |hands[p]| = 26
```

### 1.5 玩家手牌 Hand

```
Hand: [Tile]                           // 有序序列
初始大小: playerCount === 4 ? 3 : 4    // 2~3 人 → 4 张，4 人 → 3 张
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
  phase:         'drawing' | 'inserting' | 'guessing',
  turnOrder:     [openid],
  turnIndex:     Integer,
  pool:          [Tile],
  hands:         Map<openid, [Tile]>,
  drawnTileId:   String | null,
  turnLog:       [TurnRecord],
  maxTurnTime:   60000                  // ms
}
```

### 2.2 状态转移图

```
                 ┌───────────────────────────────────┐
                 │                                   │
  ┌──────────┐   │   ┌──────────┐   ┌────────────┐  │
  │ WAITING  │───┼──►│ DRAWING  │──►│ INSERTING  │  │
  │(非己回合) │   │   │(摸牌中)   │   │(插牌中)    │  │
  └──────────┘   │   └──────────┘   └─────┬──────┘  │
       ▲         │                         │         │
       │         │                    ┌────┴────┐    │
       │         │                    │         │    │
       │         │               ┌────▼──┐  ┌──▼───┐ │
       │         │               │GUESSING│  │GUESSING│
       │         │               │(可继续) │  │(已猜对)│
       │         │               └───┬───┘  └──┬───┘ │
       │         │                   │         │      │
       │         │         ┌─────────┘    ┌────┘      │
       │         │         │ 猜错/放弃     │ 继续猜    │
       │         │         ▼              │           │
       │         │   ┌──────────┐         │           │
       │         └───│NEXT_TURN │◄────────┘           │
       │             │(检查胜负) │                     │
       │             └────┬─────┘                     │
       │                  │                           │
       │             ┌────▼────┐                      │
       │             │GAME_OVER│                      │
       │             └─────────┘                      │
       │                                             │
       └─────────────────────────────────────────────┘
```

### 2.3 状态转移表

| 当前状态 | 事件 | 条件 | 下一状态 | 副作用 |
|----------|------|------|----------|--------|
| WAITING | `BEGIN_TURN` | 轮到该玩家 | DRAWING | 开始计时器 |
| DRAWING | `DRAW_TILE(color)` | 该颜色池非空 | INSERTING | pool[color].splice → drawnTileId |
| DRAWING | `DRAW_TILE` | 两颜色池皆空 | GUESSING | drawnTileId=null，无需插入 |
| INSERTING | `INSERT(pos)` | 0 ≤ pos ≤ \|hand\| | GUESSING | 牌移至 hand[pos] |
| GUESSING | `GUESS` → 正确 | 对手还有未翻牌 | GUESSING | 目标牌 isRevealed=true |
| GUESSING | `GUESS` → 正确 | 所有对手全部翻开 | GAME_OVER | winner = 当前玩家 |
| GUESSING | `GUESS` → 错误 | — | NEXT_TURN | 己摸牌 isRevealed=true |
| GUESSING | `PASS` | — | NEXT_TURN | 等同猜错：己摸牌 isRevealed=true |
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
  1. 创建 26 张牌 (0-11 × 2 色 + Joker × 2)

  2. Fisher-Yates 洗牌:
     for i = 25 down to 1:
       j = random(0, i)
       swap(deck[i], deck[j])

  3. 发牌:
     handSize = playerCount === 4 ? 3 : 4
     for each player:
       hand = deck.splice(0, handSize)
       sort(hand)                       // 按 SortKey 排序
     pool = deck                        // 剩余 = 牌池

  4. 先手确定:
     // 持有全局最小数字牌的玩家先手（Joker 不参与比较）
     firstPlayer = argmin(p ∈ players, min({t.value | t ∈ hands[p], ¬t.isJoker}))
     平局则随机

  5. 返回 gameState
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

  subPool = pool[color]
  if |subPool| === 0:
    return { drawnTile: null, empty: true }  // 该颜色池空

  idx = random(0, |subPool| - 1)
  tile = subPool.splice(idx, 1)[0]
  hands[caller].push(tile)
  tile.position = |hands[caller]| - 1
  drawnTileId = tile.id
  phase = 'inserting'
  turnLog.push({ turnNumber, playerOpenid: caller, action: 'draw', color })

  return { drawnTile: sanitize(tile), poolRemaining: { black: |pool.black|, white: |pool.white| } }

// 若两池皆空 → drawnTileId=null, phase→guessing (跳过插入)
```

### 5.2 插入

```
INSERT_TILE(gameState, position):
  Assert: caller === turnOrder[turnIndex] ∧ phase === 'inserting'
  Assert: drawnTileId ≠ null ∧ 0 ≤ position ≤ |hand|

  hand = hands[caller]
  idx = findIndexById(hand, drawnTileId)
  tile = hand.splice(idx, 1)[0]
  hand.splice(position, 0, tile)

  for i, t in enumerate(hand): t.position = i    // 更新全部位置

  phase = 'guessing'
  turnLog.push({ turnNumber, playerOpenid: caller, action: 'insert', position })

  return { hand: sanitizeOwnHand(hand), poolRemaining: |pool| }
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

### 7.1 难度概览

```
EASY:   随机决策
MEDIUM: 启发式 + 已见牌排除
HARD:   概率矩阵推理
```

### 7.2 简单 AI

```
AI_EASY:
  drawTile() → pos = random(0, |hand|) → insertTile(pos)
  target = random(opponents)
  pos = random(未翻牌位)
  value = random({-1, 0..11})               // 10% 猜 Joker
  makeGuess(target, pos, value)
  pass()                                     // 猜 1 次后放弃
```

### 7.3 中等 AI

```
AI_MEDIUM:
  drawTile() → pos = findBestInsert(hand, tile)  // 启发式排序
  insertTile(pos)

  seenValues = ownHand ∪ allRevealedTiles
  possibleValues = {0..11} \ seenValues          // 排除已见数字
  (target, pos) = pickTarget(opponents)          // 优先选翻牌多的
  value = pickMostLikely(possibleValues)
  result = makeGuess(target, pos, value)

  if result.isCorrect ∧ confidence > 0.5 → continueGuessing
  else → pass
```

### 7.4 困难 AI（概率矩阵）

```
AI_HARD:
  // 维护 P[opponent][position] = { value → probability }
  // 初始化: 排除自己手牌和已翻牌后的均匀分布

  drawTile() → insertTile(findBestInsert(hand, tile))

  updateProbabilityMatrix(P, gameState)       // 用最新信息更新
  (target, pos, value) = argmax(P)     // 选最高置信度
  result = makeGuess(target, pos, value)

  if result.isCorrect:
    removePosition(P, target, pos)            // 位置确定
    excludeTileFromAll(P, revealedTile)       // 该牌从所有候选移除
  else:
    P[target][pos][value] = 0        // 该组合不在该位置
    normalize(P[target][pos])
    excludeTileFromAll(P, myRevealedTile)

  confidence = max(P[target][pos])
  if result.isCorrect ∧ confidence > 0.6 → continueGuessing
  else → pass
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
