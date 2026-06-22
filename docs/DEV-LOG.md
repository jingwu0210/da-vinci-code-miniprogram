# 开发日志

> 最后更新: 2026-06-22

---

## 今日产出

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

## TODO — 下次任务

### 阶段 3 — 登录 & 用户系统 + 房间管理 + 大厅页面

| # | 任务 | 状态 |
|:--:|------|:---:|
| T3.1 | `cloudfunctions/user/` — login / getProfile / updateProfile | ⏳ |
| T3.2 | `cloudfunctions/room/` — createRoom / joinRoom / leaveRoom / toggleReady / startGame | ⏳ |
| T3.3 | 登录页 UI (`view/pages/login/`) — 微信登录 + 游客 + 协议 | ⏳ |
| T3.4 | 大厅页 UI (`view/pages/lobby/`) — 模式选择 + 创建/加入房间 | ⏳ |
| T3.5 | 创建房间页 UI (`view/subpackages/room/create/`) | ⏳ |
| T3.6 | 房间等待室 UI (`view/subpackages/room/detail/`) | ⏳ |
| T3.7 | 端到端串联 — login→lobby→create→detail→board | ⏳ |
| T3.8 | 部署 user + room 云函数 | ⏳ |

### 后续阶段

| 阶段 | 内容 | 预估 |
|:----:|------|:---:|
| 4 | Board 游戏界面 (全部组件 + DB watch + 完整回合流程) | 4 天 |
| 5 | AI 对战 (三种难度策略) | 2 天 |
| 6 | 结算 + 历史 + 分享 | 2 天 |
| 7 | 教程 + 设置 + 音效振动 + 动画打磨 + 弱网 + 审核提交 | 6 天 |
