# 开发日志

> 最后更新: 2026-07-01

---

## 2026-07-01 产出（续）

### 体验优化

| 变更 | 说明 |
|------|------|
| **登录页重设计** | 4 张牌扇形错落展示 + 暖灰金 `#B8A282` 配色 + 低饱和统一风格 |
| **Lobby 简化** | 两大按钮直达：人机→弹窗选难度直接开局；好友→room/create 页 |
| **Lobby 静默刷新** | 微信回访用户 `onShow` 自动调 `UserCall.login()` 同步 stats |
| **牌推倒动画** | 3D `rotateX` 模拟多米诺被推倒 + 全局 `animatedTiles` 去重复动画 |
| **已翻牌标记** | 红框 `#8B4A4A`（自己）/ 绿框 `#4A7C59`（对手）+ 永久 `rotateX(45deg)` 倾斜 |
| **音效系统** | `utils/audio.js` 统一管理；draw/guess_correct/victory/defeat 四音效接入 |
| **振动系统** | 短振（点击猜测）+ 中振（己牌被翻）+ 长振（胜利/手势上下文内触发） |
| **结算页** | 动态窗口高度 + CSS 光晕动画替代粒子 + 胜者排序 + 文字优化 |
| **教程页** | 6 步滑动引导 + 示例牌图示 + 规则列表 |
| **AI 猜牌高亮** | AI 猜测时手牌自动滚动到目标牌 + 金色边框选中 |
| **房间增强** | 准备/取消乐观更新 + 防双击 + 解散房间 + 创建/加入查昵称头像 |
| **room/create 重设计** | 创建/加入双 tab 替代模式切换 |
| **设置页简化** | 游客显示清除历史对局 + 微信用户隐藏 |
| **Lobby 退出** | 自定义顶栏「‹ 退出」→ 清除登录态 → login 页 |
| **白牌调整** | 浅灰 `#E6E6DE` + 物理微缩补偿光学膨胀 |
| **牌间距** | `--tile-gap:6rpx` 统一 |
| **数字样式** | Georgia 衬线体 + 两位数缩放 + 下划线固定宽度 |

### 文档更新

| 文档 | 更新内容 |
|------|------|
| PRD.md | §5.0 双登录体系 + §16 V2 功能（动画/功能/设计/AI/登录引导/限流） |
| DEV-LOG.md | 今日产出条目 |
| CLAUDE.md | 阶段 7/8 状态更新 |

### 待后续

| 项目 | 说明 |
|------|------|
| 主题统一 | 新分支开发，参照 early-design 建立全局设计 token |
| 音效文件 | `assets/audio/` 中 4 个 mp3 需替换为正式音效 |
| 粒子效果 | 真机 WebView 限制，V2 用 Canvas 方案替代 CSS |

---

## 2026-06-30 产出（续）

### 双登录体系重构：游客模式 + 微信授权登录

| 变更 | 说明 |
|------|------|
| **游客 UUID** | 前端 `app.js` 启动时生成 `t_` + 13位 base36 UUID，storage 持久化。替代旧的 `guest_${Date.now()}` 假ID |
| **store 持久化** | user/userType 写入时自动同步 storage，onLoad 恢复 |
| **三层身份 fallback** | 所有云函数入口：`callerOpenid → OPENID → touristId`，游客 UUID 格式校验 |
| **utils/login.js** | 新建 — getTouristId/wxLogin/logout/migrateLocalRecords/saveLocalRecord/getLocalRecords |
| **调用封装** | game-call/room-call/user-call 自动附加 touristId |
| **history 云函数** | 游客不调（仅本地 cache）；微信用户正常云端查询 |
| **user 云函数** | +getOpenid（游客返回null）+ migrateRecords（游客→微信批量迁移） |
| **auth-service** | tryGuestMode 改用 UUID |
| **settings 页** | 双界面：游客显示「微信登录」+「迁移本地数据」；微信用户显示头像昵称+「退出登录」 |
| **result 页** | 游客本地构造 record → historyCache.prepend；微信用户调 saveRecord 云函数 |
| **history 页** | 游客读本地 cache；微信用户调 getRecords 云函数 |
| **agreement 页** | 隐私政策追加游客/微信数据存储区别说明 |
| **constants** | MAX_LOCAL_HISTORY 20→10 |
| **缓存依赖修复** | history-cache.js 中的 `../common/` → `./`，`../../utils/` → `../utils/` |
| **退出游戏修复** | board 页 onTapQuit 设 _alive=false 防止退出来时 watcher 触发AI |
| **初始Joker修复** | insertTile + getGameState 用 initialJokerTurn 替代 turnIndex |
| **结算输赢修复** | saveRecord 返回服务端 isWinner，不依赖客户端 openid 对比 |
| **分享胜负文案** | resultShareConfig 根据胜负切换分享文案 |
| **CloudBase 配置** | 需开启「未登录用户访问权限」；games/rooms 读权限设为所有用户 |

**游客限制**: 每小时最多创建 10 个房间，UUID 格式校验，孤儿房间 >6h 自动清理。

**不变项**: login 页、lobby 页、board 页、所有 game/room handler 不修改。

---

## 2026-06-30 产出

### AI 策略：边界优先 + 位置先验

| 变更 | 说明 |
|------|------|
| **边界优先** | 对手无已翻牌时(revealedCount===0)，优先猜两端位置(Medium score-0.5, Hard ×1.2)，确立边界后更容易推理 |
| **位置先验** | Hard 首位 pos=0 → rangeMid 上限=handLen×0.8(倾向小值)；末位 → rangeMid 下限=11-handLen×0.8(倾向大值) |
| **aiWrongJoker 范围修正** | 必然 Joker 路径不再受 aiWrongJoker 限制(只查 jokerColorSeen + jokerNegated)；aiWrongJoker 仅限制随机 Joker 路径 |
| **fallback bothSeen 永不放宽** | 三级级联中 bothSeen 始终检查(双色已占绝不可能)；仅放宽 oneSeen |

---

## 2026-06-29 产出（续四）

### AI 策略持续优化

| 变更 | 说明 |
|------|------|
| **空间约束重构** | 每个相邻空位独立计算合法值范围取并集；阈值加入该色 unseenJ 缓冲 |
| **Joker 双路径** | 必然 Joker（`possible=[]`）不受 `aiWrongJoker` 限制；随机 Joker 受限制 |
| **fallback 三级级联** | `bothSeen` 永不放宽（双色已占绝不可能），仅放宽 `oneSeen` |
| **Hard 中位偏置** | `rangeMid += nLeft - nRight` — 左侧空位多→偏大，右侧空位多→偏小 |
| **Hard pickInsert** | Joker 放置评分：挨已翻牌+3、间隙+1、两端-2、相邻数字间-2 |
| **Hard pickColor 阶段感知** | 早期(翻牌<40%)：Score=己方×2+对手暗牌数；中后期=同Medium |
| **推断降权** | 对手猜测推断从绝对 mark→`inferred` 计数 → penalty=min(0.3×count, 0.9) |
| **shouldContinue 调整** | Medium 70/50/30%，Hard 55/35/20%；池空×1.5，Joker×0.6 |
| **Joker 随机概率** | Easy 10%→3%，Medium/Hard 固定→动态 `unseenJ/(unrevTotal+2)` |
| **文档对齐** | GAME-MODEL.md §7 完全重写，覆盖所有最新策略细节 |

---

## 2026-06-29 产出（续三）

### AI 策略代码重构

| 变更 | 说明 |
|------|------|
| **提取共享核心** | 将 Medium/Hard 中重复的 ~110 行推理逻辑提取到 `ai-common.js`：`evaluatePositions()`（seen表+否定+sortKey上下界+空间约束+Joker推理）、`pickFallback()`（position感知兜底）、`shouldContinueWithProbs()`（置信度决策） |
| **否定追踪升级** | 从 position+color → **tile ID 追踪**（`makeGuess.js` 新增 `targetTileId`），位置偏移不再影响否定有效性 |
| **Medium 精简** | 172 行 → 42 行（-75%），仅保留评分选 best + shouldContinue |
| **Hard 精简** | 108 行 → 90 行，保留阶段感知 pickColor + 概率矩阵中位加权 + argmax |
| **DB 快照修复** | `aiMove.js` Step 3 入口重新读 DB，防止 pickGuess 基于过期快照 |

### 文件行数

| 文件 | 重构前 | 重构后 |
|------|:------:|:------:|
| `ai-common.js` | 115 | 275 (+160 共享函数) |
| `ai-strategy-medium.js` | 172 | **42** (-130) |
| `ai-strategy-hard.js` | 108 | **90** (-18) |
| `ai-strategy-easy.js` | 20 | 25 (+5) |

### 阶段 4 & 5 状态

| 阶段 | 状态 | 备注 |
|:----:|:---:|------|
| 4 — Board 游戏界面 | ✅ 基本完成 | 前端细节待调整（动画、引导文字、选中态） |
| 5 — AI 对战 | ✅ 基本完成 | Easy/Medium/Hard 三难度策略完善，后续可持续调优概率参数 |

---

## 2026-06-29 产出（续二）

### AI 策略统一 & shouldContinue 重构

| 变更 | 说明 |
|------|------|
| **Hard pickColor** | 改为同 Medium（对手暗牌多的颜色优先），不再用均衡消耗策略 |
| **Hard pickGuess** | 完全重写：包含 Medium 全部逻辑（seen[v][c] + sortKey上下界 + 空间约束 + Joker推理 + 否定信息 + position感知fallback），再叠加概率矩阵 P[opp][pos][val] + argmax |
| **shouldContinue** | Medium 更激进（90/80/65%），Hard 更谨慎（80/65/50%）；两者终局 ≤2 暗牌均 100% 冲胜；均无连猜上限；minCount=1 均 100% 必猜 |
| **ai-common.js** | 新增 `estimateConfidence(tiles, aiPlayer)` — 扫描对手所有位置，返回最佳候选数 minCount 和总暗牌数 totalUnrev |
| **设计原理** | Hard 专家 AI 更懂风险控制（猜错亮己牌），不确定时见好就收；Medium 模拟普通玩家，猜对后容易"上头" |

### ⚠️ 待持续优化

| # | 内容 |
|:--:|------|
| 1 | 概率矩阵未跨回合持久化（当前每轮重新计算），应跨回合跟踪并动态更新 |
| 2 | `shouldContinue` 未利用概率矩阵历史推理结果 |
| 3 | `estimateConfidence` 每轮独立计算，Hard 模式下应结合持久化概率矩阵 |

### GAME-MODEL.md §7 更新

完全重写 AI 决策算法章节：策略对比总表（pickColor/pickGuess/shouldContinue 三维度）+ 各难度详细描述 + 待优化标注。

---

## 2026-06-29 产出（续）

### AI 回合 Bug 修复

| 问题 | 根因 | 修复 |
|------|------|------|
| Medium AI 跳过猜测直接 pass | `pickGuess` 中某位置 `possible` 为空（空间约束过滤后无候选，且该色 Joker 已见无法猜-1），但 `best` 仍被选中，导致 `value=undefined` → makeGuess 返回 `INVALID_PARAMS` → 静默 fall through 到 pass | `ai-strategy-medium.js`: Joker 添加后新增 `if (possible.length === 0) continue` 跳过无候选位置，确保 `best` 永远指向有有效猜测的位置 |

### PRD 文档对齐

| 章节 | 变更 |
|------|------|
| §2.3 回合流程 | 重构：摸牌→**暂不插入**→猜测→猜错时自动/手动插入（与当前实现一致） |
| §5.4 状态机 | 更新：移除 DRAWING→INSERTING 路径，改为 DRAWING→GUESSING（摸牌直入猜测） |
| §5.4 回合流程 | 新增猜错/结束回合的详细插入和亮牌逻辑 |
| §5.4 AI 回合 | 更新：AI 现在执行完整回合（摸牌→猜测→pass），非旧版"摸牌即结束" |
| §8 games 集合 | `tilePool`+`playerHands` → `tiles[]`（`owner` 字段），新增 Joker 字段 |
| §9 云函数 | 重写 `drawTile`/`insertTile`/`makeGuess`/`passTurn`/`aiMove` 描述以匹配当前实现 |

### 文档交叉验证

| 文档 | 状态 |
|------|:--:|
| `PRD.md` | ✅ 回合流程、状态机、数据库、云函数已对齐 |
| `GAME-MODEL.md` | ✅ tiles[] 模型、状态转移表、AI 策略已对齐（上次更新） |
| `API.md` | ✅ games 文档结构、aiMove 返回格式已对齐（上次更新） |
| `CLAUDE.md` | ✅ 数据模型、回合流程、Joker 摆放、进度表已对齐（上次更新） |
| `ARCHITECTURE.md` | ✅ 无变更需求（分层架构未变） |
| `DESIGN-SPEC.md` | ✅ 无变更需求（视觉规范未变） |
| `DEV-LOG.md` | ✅ 当前条目 |

---

## 2026-06-24 ~ 2026-06-29 产出

### 阶段 4 — Board 游戏界面 🏗 (主要完工)

| 任务 | 产出 | 状态 |
|------|------|:--:|
| T4A.1 主题统一 | 移除明亮主题 → 全局暗色 `#2C3A4A`；新增面板/卡牌/插入槽 CSS token | ✅ |
| T4A.2 插入位置判定 | `sort-hand.js` 新增 `findValidInsertPositions` 按排序规则过滤合法位置 | ✅ |
| T4B.1 game-tile 组件 | 1:2 竖立牌（96×192 / 80×160 / 64×128rpx）、3D 厚度效果、正面/背面（≤ 标记）、5 状态 | ✅ |
| T4B.2 player-hand 组件 | flex 大号牌排列 + ▲ 三角插入槽（仅合法位置、脉冲动画）+ 正面朝上浮牌 | ✅ |
| T4B.3 opponent-hand 组件 | flex 小号牌排列 + 玩家标签 + 选中态金色边框 + clearSelection | ✅ |
| T4B.4 guess-panel 组件 | 数字网格（4×3）+ Joker 全宽按钮 + 确认/撤销（结束回合独立在外） | ✅ |
| T4C board 页面组装 | 5 阶段布局 + 盘面样式 + 全量刷新交互 + AI 回合自动推进 | ✅ |
| T4D 实时同步 | DB watch 刷新 + AI toast 提示 + opponent-hand watch 更新 | ✅ |

**~50 文件修改**。单元测试 20 项全部通过。

### 数据结构重构

| 变更 | 说明 |
|------|------|
| `pool` + `hands` → `tiles[]` | 扁平数组，每牌带 `owner` 字段（`'pool'` \| `openid`），从根本上杜绝牌重复 |
| `_engine.js` 重写 | 新增 `getPlayerHand(tiles, oid)`、`poolRemaining(tiles)`、`drawFromPool(tiles, color, caller)`、`reorderHand` |
| 云函数全量适配 | 8 个 handler 全部改用 `tiles` 数组：`gs.tiles.map(t => ...)`、`gs.tiles.filter(t => t.owner === ...)` |

### Joker 架构重构

| 变更 | 说明 |
|------|------|
| 初始 Joker 摆放回合 | 新机制：`initialJokers` + `initialJokerTurn` — 所有玩家按 turnOrder 依次放置初始 Joker |
| Joker 处理收拢 | 仅 `initGame` + `insertTile` 涉及初始 Joker；其他 handler 不再有 scattered Joker checks |
| `jokerPendingReveal` | 猜错 Joker 后标记 → insertTile 放置后自动翻开 → 结束回合 |
| 移除 `allJokersToPlace` | passTurn、makeGuess、aiMove 中所有 scattered checks 已清理 |
| `insertTile` 重写 | 三段式：A. 初始 Joker 摆放 → B. 猜错 Joker 揭示 → C. 正常插入数字牌 |

### AI 策略完善

| 难度 | 策略 | 文件 |
|:---:|------|------|
| Easy | 纯随机 — pickColor 随机、pickGuess 随机位置+值、10% 猜 Joker | `ai-strategy-easy.js` |
| Medium | 启发式 — sortKey 上下界 + (value,color) 精确排除 + 空间约束过滤 + 否定信息 + 对手猜测推断 | `ai-strategy-medium.js` |
| Hard | 概率矩阵 — Medium 上下界 + 概率矩阵 P[opp][pos][val] + argmax 置信度 + 否定信息更新 | `ai-strategy-hard.js` |
| 公共层 | 共享 helpers：`getHand`、`getOpponents`、`doMove`（完整回合编排） | `ai-common.js` |

### AI 策略 Bug 修复

| 问题 | 根因 | 修复 |
|------|------|------|
| Medium AI 重复猜同位置 Joker | Joker (-1) 添加逻辑绕过了 `negated` 否定检查（否定排除仅对 0~11 循环有效） | Joker 添加前检查 `negated[opp+'_'+pos+'_-1']` |
| Medium AI 文件 SyntaxError | 错误编辑导致重复代码 + 多余 `}` | 重构控制流：`if (best) return` 提前返回 + 兜底 fallback |
| console.log 引用未声明变量 | `nRight`/`nLeft` 在声明前被引用 | 移除提前的 console.log |

### passTurn 重构

| 变更 | 说明 |
|------|------|
| `reveal` 参数 | `reveal=true`（默认/猜错）：亮摸牌 + 自动插入 → 切回合；`reveal=false`（猜对后主动结束）：不亮牌 → 切回合 |
| WAITING/INSERTING 直通 | AI Joker 放置场景下允许直接切回合 |
| 自动插入 | 数字牌猜错后自动找到唯一合法插入位；Joker 进入 INSERTING 阶段手动放置 |

### makeGuess 重构

| 变更 | 说明 |
|------|------|
| 猜错数字牌 | 自动插入唯一正确位置 → 亮牌 → 切回合 |
| 猜错 Joker | 设置 `jokerPendingReveal` → 进入 INSERTING → 用户手动放置 → 亮牌 → 切回合 |
| 猜对 | 翻开对手牌 → 留在 GUESSING 可继续猜 → 胜负检查 |

### DESIGN-SPEC 更新

| 变更 | 说明 |
|------|------|
| 取消双主题 | 全局统一暗色毛毡 `#2C3A4A` |
| 卡牌 1:2 竖立 | 替代 2:1 横宽 |
| 暗牌 "≤" | 替代 "?"，表示排序方向 |
| 插入槽 ▲ 三角 | 替代虚线，金色脉冲动画 |
| 摸牌正面朝上 | 玩家直接可见数字 |
| 仅合法插入位 | 按排序规则过滤不合规位置 |

---
## 2026-06-23 产出

### 阶段 3 — 登录 & 用户系统 + 房间管理 + 大厅页面 ✅

| 任务 | 产出 |
|------|------|
| T3.1 user 云函数 | `cloudfunctions/user/` — login / getProfile / updateProfile |
| T3.2 room 云函数 | `cloudfunctions/room/` — createRoom / joinRoom / leaveRoom / toggleReady / startGame (含 callerOpenid 跨云函数身份转发修复) |
| T3.3 登录页 UI | Figma 还原：品牌标题 + 微信一键登录 + 头像昵称设置（chooseAvatar/nickname 组件 + 云存储上传）+ 游客模式 |
| T3.4 大厅页 UI | Figma 还原：用户卡（可点击进设置）+ 双模式选择 + 创建/加入房间 + 加入房间码弹窗 + 底部导航 |
| T3.5 创建房间页 | 模式切换（AI/好友）+ 玩家数/难度/密码配置 |
| T3.6 房间等待室 | 房间码展示+复制 + 微信分享 + 玩家列表 + 准备/取消 + 开始游戏 + DB watch 实时同步 |
| T3.7 端到端验证 | login→lobby→room/create→room/detail→board 完整链路通过 |
| T3.8 部署 | user / room / game 三个云函数已部署至 CloudBase |

**commits**: `5487562` / `9350ada`（路由修复）+ 若干修复提交

### 关键 Bug 修复

| 问题 | 解决 |
|------|------|
| 跨云函数调用丢失 OPENID | `game/index.js` 支持 `callerOpenid` 覆盖参数，`room.startGame` 显式传入 |
| 头像临时文件不可持久化 | 登录确认时上传至云存储，`cloud://` fileID 写入 DB |
| 头像预览呈椭圆形 | 图片与按钮分离：`<image>` 独立圆形渲染 + 透明 `<button>` 覆盖 |
| 页面内标题栏与系统导航重复 | 删除 lobby/room/create/detail 自定义 top-bar，新增 §1.2 导航栏规范 |
| 横向溢出 | `app.wxss` 全局 + 各页添加 `overflow-x:hidden` + `width:100vw` |
| lobby 无返回登录入口 | 用户卡点击→设置页→退出登录 |
| 协议/隐私点击无内容 | 新建 `view/pages/agreement/` 页面，注册到 app.json |
| room startGame NOT_AUTHORIZED | `game/index.js` 接受事件传入的 `callerOpenid` 覆盖系统 OPENID |
| 路由路径不匹配 app.json | `routes.js` 全部路径增加 `view/` 前缀 |
| app.js 缺少 wx.login | `onLaunch` 新增 `wx.login()` 建立用户身份 |

---

## 2026-06-22 产出

### 阶段 1 — 项目基础搭建 ✅

| 任务 | 产出 |
|------|------|
| 环境配置 | `miniprogram/app.js` → env: `testenv001-d7gtpfjahfa6ab5f6` |
| 数据库 | `rooms` / `games` / `players` / `game_records` 4 集合 + 安全规则 + 唯一索引 |
| 路由 + 分包 | `app.json` → 6 主包 + 2 分包 + preloadRule |
| 主题体系 | `common/theme.wxss` — 双主题变量（暗色毛毡/明亮白色） |
| 分层架构 | 6 层目录骨架 (common/utils/model/cloud/service/view) |
| 通用模块 | `common/` — enums/constants/routes/theme/store/cache/modal |
| 工具模块 | `utils/` — shuffle/sort-hand/logger/debounce/throttle/format/local-storage |
| 数据模型 | `model/entities/` — Tile/Player/GameState/Room |
| 通信层 | `cloud/` — 4 云函数调用封装 + DB watch + 微信授权 + 分享 |
| 业务层 | `service/` — game/room/ai/auth/history 全部骨架 |
| 表现层 | `view/` — 9 页面 + 8 组件 + 3 动画模块骨架 |
| 规范文档 | `docs/` — PRD / GAME-MODEL / API / ARCHITECTURE / DESIGN-SPEC |

**commit**: `a4d7c23`

---

### 文档体系建立 ✅

| 文档 | 定位 |
|------|------|
| `docs/PRD.md` | 产品需求 — 功能、页面、交互、合规 |
| `docs/GAME-MODEL.md` | 数学规范 — 牌数据结构、状态机、判定算法 |
| `docs/API.md` | 接口契约 — 云函数 I/O、Watch 协议、类型 |
| `docs/ARCHITECTURE.md` | 系统架构 — 6 层分层 + 依赖约束 |
| `docs/DESIGN-SPEC.md` | 设计规范 — Figma 可用的视觉/交互规范 |

---

### 关键设计决策（已确认并统一到所有文档）

| # | 决策 | 来源 |
|:--:|------|------|
| 1 | 猜牌无需选颜色（牌背有色可见） | 实物规则 |
| 2 | 牌比例 2:1 长条形 + 立体厚度效果 | DESIGN-SPEC §5 |
| 3 | 摸牌可选黑/白（颜色分池） | DESIGN-SPEC §7.5.2 |
| 4 | pass = 亮摸牌（等同猜错） | DESIGN-SPEC §7.5.4 |
| 5 | 登录+Board 暗色毛毡 / 其余页面白色明亮 | DESIGN-SPEC §1.1 |
| 6 | 不显示牌池（仅摸牌阶段显示分色剩余数） | DESIGN-SPEC §7.5 |
| 7 | 手牌超屏自动等比缩放 | DESIGN-SPEC §5.1 |
| 8 | 登录页 + 游客模式 | DESIGN-SPEC §7.1 |

---

### 阶段 2 — 核心游戏逻辑 ✅

| 任务 | 产出 |
|------|------|
| 颜色分池 | `pool: { black: [Tile], white: [Tile] }` |
| 回合状态机 | `PASS_REVEALS_TILE` — pass 时亮摸牌 |
| 前端引擎 | `utils/game-engine.js` — 收拢 6 个模块为统一入口 |
| 云函数入口 | `cloudfunctions/game/index.js` + `config.json` |
| initGame | 创建 games 文档、更新 rooms、返回客户端视图 |
| drawTile | 分色摸牌（`color='black'\|'white'`）、池空提示 |
| insertTile | 插牌入指定位置、更新 position 字段 |
| makeGuess | 仅数值判定、猜对继续/猜错亮牌、胜负检查 |
| passTurn | 亮摸牌 + 切换回合 |
| quitGame | 退出者全部亮牌 + 判负 |
| getGameState | sanitized 客户端视图（对手未翻牌仅暴露颜色+位置） |
| aiMove | easy 随机策略骨架 |
| 云函数引擎 | `_engine.js` — 云函数内纯逻辑副本 |
| 单元测试 | `tests/game-engine.test.js` — 20 项全部通过 |

**commit**: `4cc07ed`

---

## 2026-06-23（续）产出

### 阶段 4 — Board 游戏界面 🏗

| 任务 | 产出 | 状态 |
|------|------|:--:|
| T4A.1 主题更新 | 移除明亮主题 → 统一暗色 `#2C3A4A`；新增面板/卡牌/插入槽 CSS token | ✅ |
| T4A.2 插入位置判定 | `sort-hand.js` 新增 `findValidInsertPositions` 按排序规则过滤合法位置 | ✅ |
| T4B.1 game-tile 组件 | 1:2 竖立牌（96×192 / 80×160 / 64×128rpx）、3D 厚度效果、正面/背面（≤ 标记）、5 状态 | ✅ |
| T4B.2 player-hand 组件 | flex 大号牌排列 + ▲ 三角插入槽（仅合法位置、脉冲动画）+ 正面朝上浮牌 | ✅ |
| T4B.3 opponent-hand 组件 | flex 小号牌排列 + 玩家标签 + 选中态金色边框 + clearSelection | 🏗 |
| T4B.4 guess-panel 组件 | 数字网格（4×3）+ Joker 全宽按钮 + 确认/撤销（结束回合独立在外） | ✅ |
| T4C board 页面组装 | 5 阶段布局 + 盘面样式 + 全量刷新交互 + 猜对后继续/结束选项 | 🏗 |
| T4D 实时同步 & 动画 | DB watch 刷新；AI mock 800ms → passTurn；牌翻开 scaleY CSS 动画 | 🏗 |
| 数据结构重构 | `pool`+`hands` → `tiles[]` 数组 + `owner` 字段，杜绝牌重复 | ✅ |
| 游戏流程调整 | 摸牌→直接猜测（跳过插入）；猜错/数字牌自动插入、万能牌手动插入 | ✅ |
| 调试脚本 | `testHands` + `testFirstPlayer` 云函数参数，5 场景一键切换 | ✅ |

**~30 文件修改**。单元测试 142+ 项通过。

### DESIGN-SPEC 更新（同日）

| 变更 | 说明 |
|------|------|
| 取消双主题 | 全局统一暗色毛毡 `#2C3A4A` |
| 卡牌 1:2 竖立 | 替代 2:1 横宽 |
| 暗牌 "≤" | 替代 "?"，表示排序方向 |
| 插入槽 ▲ 三角 | 替代虚线，金色脉冲动画 |
| 摸牌正面朝上 | 玩家直接可见数字 |
| 仅合法插入位 | 按排序规则过滤不合规位置 |
| 移除激励视频 | 结算页去掉广告入口 |


## TODO — 下次任务

### 阶段 4 剩余项

| # | 内容 | 优先级 |
|:--:|------|:--:|
| 1 | 倒牌动画修正：仅被翻开时触发（was-revealed），摸牌不触发；动画效果站→倒→站 | 高 |
| 2 | 游戏状态/环节引导文字："等待对手猜牌" / "你的回合" / "请摸牌" 等 | 高 |
| 3 | opponent-hand 选中态金色边框 + clearSelection 完善 | 中 |
| 4 | board 页面猜对后继续/结束选项交互完善 | 中 |
| 5 | gameTile 白色牌和黑色牌阴影风格一致 | 低 |
| 6 | 移除右上角大厅 icon（不需要返回大厅功能） | 低 |

### 近期 Bug 待修复

| # | 问题 | 优先级 |
|:--:|------|:--:|
| 1 | Hard AI 从不猜 Joker（`for v = leftMax+1; v < rightMin` 永远 >= 0） | 中 |
| 2 | Easy AI 只猜 1 次后 pass（可故意连续猜错以迷惑玩家） | 低 |

### 后续阶段

| 阶段 | 内容 | 预估 |
|:----:|------|:---:|
| 5 | AI 对战 — Hard Joker 修复 + shouldContinue 调优 | 1 天 |
| 6 | 结算 + 历史 + 分享 | 2 天 |
| 7 | 教程 + 动画打磨 + 弱网 + 审核提交 | 4 天 |
