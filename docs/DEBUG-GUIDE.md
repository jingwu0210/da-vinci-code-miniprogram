# 调试指南

> AI 策略调试日志 + 快速测试方式

---

## 1. AI 调试日志

所有日志在微信开发者工具 → 云开发 → 云函数 → game → 日志中查看。

### [AI-DEBUG] — AI 视角对手手牌

```
[AI-DEBUG] gameId=xxx opp=oleovxqw... hand=[{"p":0,"c":"black","v":0,"r":true,"j":false},...]
```

| 字段 | 含义 |
|------|------|
| `p` | position 索引 |
| `c` | 牌背颜色 (black/white) |
| `v` | 数值; `"?"`=未翻, `数字`=已翻, `-1`=Joker |
| `r` | `true`=已翻, `false`=未翻 |
| `j` | `true`=Joker, `false`=数字牌 |

**用途**: 验证 AI 读到的 gs 是否过期。对比前端 `[DEBUG]` 中 `✓` 的位置和日志中 `"r":true` 的位置是否一致。

**位置**: `aiMove.js` Step 3 入口

---

### [AI-EVAL] seen — seen 表快照

```
[AI-EVAL] seen=["-1:BW","0:B","1:BW",...]
```

格式 `值:占用颜色`。`B`=黑色已见，`W`=白色已见。`BW`=双色已见（bothSeen=true，该值从所有候选排除）。

**用途**: 验证 AI 的 seen 表是否正确。如果某个值意外为 BW（被排除），检查 AI 手牌或已翻牌是否有该 (value,color)。

**位置**: `ai-common.js` evaluatePositions，所有 mark 调用之后

---

### [AI-EVAL] position — 每位置候选分析

```
[AI-EVAL] pos=1 color=white leftKey=[0,0] rightKey=[3,1] nL=0 nR=1 uJ=0 possible=[0] excluded=["5:bothSeen","7:negTid","10:range"]
```

| 字段 | 含义 |
|------|------|
| `pos` | 对手手牌位置索引 |
| `color` | 牌背颜色 |
| `leftKey` | 左侧最近已翻非Joker牌的 sortKey；`[-2,0]`=无 |
| `rightKey` | 右侧最近已翻非Joker牌的 sortKey；`[13,0]`=无 |
| `nL` | 左侧同色未翻牌数 |
| `nR` | 右侧同色未翻牌数 |
| `uJ` | 未见 Joker 数（0-2） |
| `possible` | 通过所有过滤的候选值列表 |
| `excluded` | 被排除的值及原因 |

**excluded 标记含义**:

| 标记 | 含义 |
|------|------|
| `v:range` | minVal/maxVal 排除 |
| `v:bothSeen` | 双色均已见，该值不可能存在 |
| `v:negTid` | tile ID 否定（曾猜过这张牌的这个值，错了） |
| `v:negPos` | position 否定（旧格式兼容） |

> 注意: `excluded` 不包含 sortKey 失败或 oneSeen 失败的值（那些在 sortKey 检查内部静默跳过）。

**position 输出 `SKIP`**: `possible=[]` 且 Joker 未加入 → 位置被跳过，等待 fallback。

**用途**: 精确定位 AI 为何猜某个值或漏掉某个值。对照 `excluded` 列表逐项排查。

**位置**: `ai-common.js` evaluatePositions，每位置过滤完成后

---

### [AI-HARD] argmax — Hard 概率矩阵选择

```
[AI-HARD] argmax update: opp=xxx pos=1 val=7 conf=0.188
```

**用途**: 查看 Hard 最终选了哪个值及置信度。`conf=-1` 的最高即为最终猜测。

**位置**: `ai-strategy-hard.js` pickGuess

---

## 2. 快速测试

### 2.1 结算页

微信开发者工具控制台直接输入:

```javascript
// 测试胜利页面
wx.redirectTo({ url: '/view/subpackages/result/index?test=win' })

// 测试失败页面
wx.redirectTo({ url: '/view/subpackages/result/index?test=lose' })
```

正常路径: board 页游戏结束 → 自动跳转，传入 `gameId` 和 `winner` 参数。

### 2.2 历史页

正常路径: lobby → 点击"历史对局"。

下拉刷新: 在页面上向下滑动触发 `onPullDownRefresh`。

上拉加载: 滚动到底部触发 `onReachBottom`。

### 2.3 测试牌局 (testHands)

在 `initGame` 中传入 `testHands` 参数可预设手牌，跳过洗牌。详见 `_engine.js` 的 `createControlledState` 函数。

```javascript
// 示例: 预设手牌。通过云函数测试调用 initGame
{
  type: 'initGame',
  roomId: 'test',
  players: [{ openid: 'player1' }, { openid: 'ai_1', isAI: true }],
  mode: 'ai',
  difficulty: 'hard',
  testHands: {
    'player1': [{ color: 'black', value: 0 }, { color: 'white', value: 5 }],
    'ai_1': [{ color: 'black', value: 3, isJoker: true }],
  },
  testFirstPlayer: 'player1'
}
```
