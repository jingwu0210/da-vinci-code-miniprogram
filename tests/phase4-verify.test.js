/**
 * 阶段 4 验收测试 —— 函数级，不依赖微信环境。
 * 运行: node tests/phase4-verify.test.js
 */

const { sortKey, compare, findValidInsertPositions } = require('../miniprogram/utils/sort-hand');
const { Color } = require('../miniprogram/common/enums');
const { JOKER_VALUE } = require('../miniprogram/common/constants');

let passed = 0;
let failed = 0;

function assert(desc, condition) {
  if (condition) { passed++; /* console.log(`  ✅ ${desc}`); */ }
  else { failed++; console.log(`  ❌ ${desc}`); }
}

// ═══════════════════════════════════════════════════
// T4A.2: findValidInsertPositions
// ═══════════════════════════════════════════════════

console.log('\n📐 T4A.2 — findValidInsertPositions');

function makeTile(v, c) {
  return { id: 't_test', color: c, value: v, isJoker: v === JOKER_VALUE, position: 0, isRevealed: false };
}

// 1. 空手牌 → 唯一位置 [0]
const emptyHand = [];
assert('空手牌 → [0]', JSON.stringify(findValidInsertPositions(emptyHand, makeTile(5, Color.BLACK))) === '[0]');

// 2. 单张牌，摸更大 → [1]
const hand1 = [makeTile(3, Color.BLACK)];
assert('摸 5 插 [3] 之后 → [1]', JSON.stringify(findValidInsertPositions(hand1, makeTile(5, Color.BLACK))) === '[1]');

// 3. 单张牌，摸更小 → [0]
assert('摸 1 插 [3] 之前 → [0]', JSON.stringify(findValidInsertPositions(hand1, makeTile(1, Color.BLACK))) === '[0]');

// 4. [2黑,5白,9黑] 摸 6白 → 仅位置 2 合法（5白和9黑之间）
const hand3 = [makeTile(2, Color.BLACK), makeTile(5, Color.WHITE), makeTile(9, Color.BLACK)];
assert('[2黑,5白,9黑] 摸 6白 → [2]', JSON.stringify(findValidInsertPositions(hand3, makeTile(6, Color.WHITE))) === '[2]');

// 5. 同值黑左白右: [3黑,3白] 摸 3黑 → 位置 [0,1]（不能插在3白右边=破坏黑左白右）
const hand35 = [makeTile(3, Color.BLACK), makeTile(3, Color.WHITE)];
assert('[3黑,3白] 摸 3黑 → [0,1]', JSON.stringify(findValidInsertPositions(hand35, makeTile(3, Color.BLACK))) === '[0,1]');

// 6. 同值黑左白右: [3黑,3白] 摸 3白 → 位置 [1,2]
assert('[3黑,3白] 摸 3白 → [1,2]', JSON.stringify(findValidInsertPositions(hand35, makeTile(3, Color.WHITE))) === '[1,2]');

// 7. Joker → 全部位置合法
const joker = makeTile(JOKER_VALUE, Color.BLACK);
assert('Joker 插入 [2黑,5白,9黑] → [0,1,2,3]', JSON.stringify(findValidInsertPositions(hand3, joker)) === '[0,1,2,3]');

// 8. Joker 插入空手牌 → [0]
assert('Joker 插入空手牌 → [0]', JSON.stringify(findValidInsertPositions(emptyHand, joker)) === '[0]');

// 9. 摸最小牌 → 仅 [0]
const handHigh = [makeTile(7, Color.BLACK), makeTile(10, Color.WHITE)];
assert('摸 2 插入 [7,10] → [0]', JSON.stringify(findValidInsertPositions(handHigh, makeTile(2, Color.BLACK))) === '[0]');

// 10. 摸最大牌 → 仅 [len]
assert('摸 11 插入 [7,10] → [2]', JSON.stringify(findValidInsertPositions(handHigh, makeTile(11, Color.WHITE))) === '[2]');

// ═══════════════════════════════════════════════════
// T4A.1: theme.wxss 单暗色主题
// ═══════════════════════════════════════════════════

console.log('\n🎨 T4A.1 — theme.wxss');

const fs = require('fs');
const path = require('path');

const themePath = path.join(__dirname, '..', 'miniprogram/common/theme.wxss');
const appWxssPath = path.join(__dirname, '..', 'miniprogram/app.wxss');
const themeCSS = fs.existsSync(themePath) ? fs.readFileSync(themePath, 'utf-8') : '';
const appCSS = fs.existsSync(appWxssPath) ? fs.readFileSync(appWxssPath, 'utf-8') : '';

// 11. 无明亮主题变量残留
assert('theme.wxss 无 --bg-light', !themeCSS.includes('--bg-light'));
assert('theme.wxss 无 --text-light-primary', !themeCSS.includes('--text-light-primary'));
assert('theme.wxss 无 --panel-light', !themeCSS.includes('--panel-light'));

// 12. 新 token 存在
assert('theme.wxss 含 --tile-thickness', themeCSS.includes('--tile-thickness'));
assert('theme.wxss 含 --insert-gold', themeCSS.includes('--insert-gold'));
assert('theme.wxss 含 --panel-border', themeCSS.includes('--panel-border'));

// 13. app.wxss 无 .page-light
assert('app.wxss 无 .page-light', !appCSS.includes('.page-light'));

// ═══════════════════════════════════════════════════
// T4B.1: game-tile 组件结构
// ═══════════════════════════════════════════════════

console.log('\n🃏 T4B.1 — game-tile 组件');

const tileWxmlPath = path.join(__dirname, '..', 'miniprogram/view/components/game-tile/index.wxml');
const tileWxssPath = path.join(__dirname, '..', 'miniprogram/view/components/game-tile/index.wxss');
const tileJsPath = path.join(__dirname, '..', 'miniprogram/view/components/game-tile/index.js');
const tileWxml = fs.existsSync(tileWxmlPath) ? fs.readFileSync(tileWxmlPath, 'utf-8') : '';
const tileWxss = fs.existsSync(tileWxssPath) ? fs.readFileSync(tileWxssPath, 'utf-8') : '';
const tileJs = fs.existsSync(tileJsPath) ? fs.readFileSync(tileJsPath, 'utf-8') : '';

// 14. WXML 包含关键元素
assert('game-tile WXML 含 .tile-wrapper', tileWxml.includes('tile-wrapper'));
assert('game-tile WXML 含 .tile-thickness (3D厚度)', tileWxml.includes('tile-thickness'));
assert('game-tile WXML 含 .tile-inner', tileWxml.includes('tile-inner'));
assert('game-tile WXML 含 .tile-shine (高光)', tileWxml.includes('tile-shine'));
assert('game-tile WXML 含 face-up 分支', tileWxml.includes('faceUp'));
assert('game-tile WXML 含 face-down 分支', tileWxml.includes('face-down'));
assert('game-tile WXML 含 ≤ 背面', tileWxml.includes('≤'));

// 15. Joker 显示 —
const jokerLine = tileWxml.split('\n').find(l => l.includes('joker-text'));
assert('game-tile Joker 显示 —', jokerLine && jokerLine.includes('—'));

// 16. 无圆点残留
assert('game-tile WXML 无 color-dot', !tileWxml.includes('color-dot'));
assert('game-tile WXSS 无 color-dot', !tileWxss.includes('color-dot'));

// 17. CSS 尺寸（1:2 竖立）
assert('game-tile WXSS 含 .size-large', tileWxss.includes('.size-large'));
assert('game-tile WXSS 含 .size-medium', tileWxss.includes('.size-medium'));
assert('game-tile WXSS 含 .size-small', tileWxss.includes('.size-small'));
// 大牌 96×192 → 高/宽 = 2
assert('game-tile 大牌 96rpx宽', tileWxss.includes('96rpx'));
assert('game-tile 大牌 192rpx高', tileWxss.includes('192rpx'));

// 18. CSS 状态
assert('game-tile WXSS 含 .selected 态', tileWxss.includes('.selected'));
assert('game-tile WXSS 含 .disabled 态', tileWxss.includes('.disabled'));
assert('game-tile WXSS 含 .drawn 态', tileWxss.includes('.drawn'));
assert('game-tile WXSS 含 tile-reveal 动画', tileWxss.includes('tile-reveal'));

// 19. JS 属性
assert('game-tile JS 含 disabled 属性', tileJs.includes('disabled'));
assert('game-tile JS 含 drawn 属性', tileJs.includes('drawn'));

// ═══════════════════════════════════════════════════
// T4B.2: player-hand 组件结构
// ═══════════════════════════════════════════════════

console.log('\n🤚 T4B.2 — player-hand 组件');

const phWxmlPath = path.join(__dirname, '..', 'miniprogram/view/components/player-hand/index.wxml');
const phJsPath = path.join(__dirname, '..', 'miniprogram/view/components/player-hand/index.js');
const phJsonPath = path.join(__dirname, '..', 'miniprogram/view/components/player-hand/index.json');
const phWxssPath = path.join(__dirname, '..', 'miniprogram/view/components/player-hand/index.wxss');
const phWxml = fs.existsSync(phWxmlPath) ? fs.readFileSync(phWxmlPath, 'utf-8') : '';
const phJs = fs.existsSync(phJsPath) ? fs.readFileSync(phJsPath, 'utf-8') : '';
const phJson = fs.existsSync(phJsonPath) ? fs.readFileSync(phJsonPath, 'utf-8') : '';
const phWxss = fs.existsSync(phWxssPath) ? fs.readFileSync(phWxssPath, 'utf-8') : '';

assert('player-hand WXML 含 .insert-slot', phWxml.includes('insert-slot'));
assert('player-hand WXML 含 validPositions 判断', phWxml.includes('validPositions'));
assert('player-hand WXML 含 ▲ 三角', phWxml.includes('▲'));
assert('player-hand WXML 含 .hand-row', phWxml.includes('hand-row'));
assert('player-hand WXML 含 .drawn-area', phWxml.includes('drawn-area'));
assert('player-hand WXML drawnTile faceUp=true', phWxml.includes('faceUp="{{true}}"'));
assert('player-hand WXML 自己的牌 faceUp=true', (phWxml.match(/faceUp="{{true}}"/g) || []).length >= 2);
assert('player-hand WXSS 含 pulse-opacity 动画', phWxss.includes('pulse-opacity'));
assert('player-hand WXSS 含 .insert-slot flex-end', phWxss.includes('flex-end'));
assert('player-hand JS 含 findValidInsertPositions', phJs.includes('findValidInsertPositions'));
assert('player-hand JS 含 observers', phJs.includes('observers'));
assert('player-hand JSON 注册 game-tile', phJson.includes('game-tile'));

// ═══════════════════════════════════════════════════
// T4B.3: opponent-hand 组件结构
// ═══════════════════════════════════════════════════

console.log('\n👤 T4B.3 — opponent-hand 组件');

const ohWxmlPath = path.join(__dirname, '..', 'miniprogram/view/components/opponent-hand/index.wxml');
const ohJsPath = path.join(__dirname, '..', 'miniprogram/view/components/opponent-hand/index.js');
const ohJsonPath = path.join(__dirname, '..', 'miniprogram/view/components/opponent-hand/index.json');
const ohWxml = fs.existsSync(ohWxmlPath) ? fs.readFileSync(ohWxmlPath, 'utf-8') : '';
const ohJs = fs.existsSync(ohJsPath) ? fs.readFileSync(ohJsPath, 'utf-8') : '';
const ohJson = fs.existsSync(ohJsonPath) ? fs.readFileSync(ohJsonPath, 'utf-8') : '';

assert('opponent-hand WXML 含 .opponent-section', ohWxml.includes('opponent-section'));
assert('opponent-hand WXML 含 .opponent-label', ohWxml.includes('opponent-label'));
assert('opponent-hand WXML 含 isCurrentTarget', ohWxml.includes('isCurrentTarget'));
assert('opponent-hand WXML size="small"', ohWxml.includes('size="small"'));
assert('opponent-hand WXML faceUp绑定 isRevealed', ohWxml.includes('faceUp="{{item.isRevealed}}"'));
assert('opponent-hand WXML 已翻开 disabled=true', ohWxml.includes('disabled="{{item.isRevealed}}"'));
assert('opponent-hand JS 含 selectedPosition', ohJs.includes('selectedPosition'));
assert('opponent-hand JS 含 clearSelection', ohJs.includes('clearSelection'));
assert('opponent-hand JS 已翻开牌不可选', ohJs.includes('isRevealed'));
assert('opponent-hand JSON 注册 game-tile', ohJson.includes('game-tile'));

// ═══════════════════════════════════════════════════
// T4B.4: guess-panel 组件结构
// ═══════════════════════════════════════════════════

console.log('\n🎯 T4B.4 — guess-panel 组件');

const gpWxmlPath = path.join(__dirname, '..', 'miniprogram/view/components/guess-panel/index.wxml');
const gpJsPath = path.join(__dirname, '..', 'miniprogram/view/components/guess-panel/index.js');
const gpWxml = fs.existsSync(gpWxmlPath) ? fs.readFileSync(gpWxmlPath, 'utf-8') : '';
const gpJs = fs.existsSync(gpJsPath) ? fs.readFileSync(gpJsPath, 'utf-8') : '';

assert('guess-panel WXML 含 .guess-mask', gpWxml.includes('guess-mask'));
assert('guess-panel WXML 含 .number-grid', gpWxml.includes('number-grid'));
assert('guess-panel WXML 含 Joker 按钮 -1', gpWxml.includes('-1'));
assert('guess-panel WXML 含 "确认猜测"', gpWxml.includes('确认猜测'));
assert('guess-panel WXML 含 "结束回合"', gpWxml.includes('结束回合'));
assert('guess-panel WXML 确认按钮 disabled', gpWxml.includes('disabled="{{selectedValue === null}}"'));
assert('guess-panel JS 含 numbers 数组', gpJs.includes('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, -1]'));
assert('guess-panel JS 含 observers', gpJs.includes('observers'));
assert('guess-panel JS 含 onEndTurn + wx.showModal', gpJs.includes('wx.showModal'));

// ═══════════════════════════════════════════════════
// T4C: board 页面结构
// ═══════════════════════════════════════════════════

console.log('\n📋 T4C — Board 页面组装');

const boardWxmlPath = path.join(__dirname, '..', 'miniprogram/view/pages/board/index.wxml');
const boardJsPath = path.join(__dirname, '..', 'miniprogram/view/pages/board/index.js');
const boardJsonPath = path.join(__dirname, '..', 'miniprogram/view/pages/board/index.json');
const boardWxml = fs.existsSync(boardWxmlPath) ? fs.readFileSync(boardWxmlPath, 'utf-8') : '';
const boardJs = fs.existsSync(boardJsPath) ? fs.readFileSync(boardJsPath, 'utf-8') : '';
const boardJson = fs.existsSync(boardJsonPath) ? fs.readFileSync(boardJsonPath, 'utf-8') : '';

// 60. JSON 注册
assert('board JSON 注册 4 组件', boardJson.includes('game-tile') && boardJson.includes('player-hand') && boardJson.includes('opponent-hand') && boardJson.includes('guess-panel'));

// 61-67. WXML 5 阶段
assert('board WXML 含 .top-bar', boardWxml.includes('top-bar'));
assert('board WXML 含 .offline-banner', boardWxml.includes('offline-banner'));
assert('board WXML 含 opponent-hand 组件', boardWxml.includes('opponent-hand'));
assert('board WXML 含 player-hand 组件', boardWxml.includes('player-hand'));
assert('board WXML 含 guess-panel 组件', boardWxml.includes('guess-panel'));

// 关键: myTurn 优先判断（非己回合显示等待）
assert('board WXML myTurn 优先判断', boardWxml.includes('!game.myTurn'));
assert('board WXML 非己回合等待文字', boardWxml.includes('等待对手行动中'));

// phase 分支
assert('board WXML DRAWING 按钮', boardWxml.includes('draw-choices'));
assert('board WXML INSERTING 提示', boardWxml.includes('insert-hint'));
assert('board WXML poolRemaining.black', boardWxml.includes('poolRemaining.black'));
assert('board WXML poolRemaining.white', boardWxml.includes('poolRemaining.white'));

// 68-78. JS 关键逻辑
assert('board JS 含 onSelectColor', boardJs.includes('onSelectColor'));
assert('board JS 含 onOpponentTileSelected', boardJs.includes('onOpponentTileSelected'));
assert('board JS 含 onCancelGuess', boardJs.includes('onCancelGuess'));
assert('board JS 含 onTapPass', boardJs.includes('onTapPass'));
assert('board JS 含 _triggerAi + 防重', boardJs.includes('_aiPending'));
assert('board JS 含 _onWatchUpdate → AI检测', boardJs.includes('!state.game.myTurn && this._isAi && !this._aiPending'));
assert('board JS onTapLobby 无确认弹窗', !boardJs.includes('保留 5 分钟'));
	assert('board JS import findValidInsertPositions', boardJs.includes('findValidInsertPositions'));
	assert('board JS 插入前合法性校验', boardJs.includes('请按从小到大的顺序插入'));
// ═══════════════════════════════════════════════════
// T4D: 动画 & 实时同步
// ═══════════════════════════════════════════════════

console.log('\n🎬 T4D — 动画 & 实时同步');

// 79. 牌翻开动画 CSS
assert('game-tile WXSS 含 @keyframes tile-reveal', tileWxss.includes('@keyframes tile-reveal'));
assert('game-tile WXSS face-up 触发动画', tileWxss.includes('.face-up') && tileWxss.includes('animation'));

// 80. AI 延迟常量
const constantsPath = path.join(__dirname, '..', 'miniprogram/common/constants.js');
const constants = fs.existsSync(constantsPath) ? fs.readFileSync(constantsPath, 'utf-8') : '';
assert('constants.js 含 AI_ACTION_INTERVAL: 800', constants.includes('AI_ACTION_INTERVAL: 800'));

// ═══════════════════════════════════════════════════
// 结果
// ═══════════════════════════════════════════════════

console.log('\n═══════════════════════');
console.log(`  通过: ${passed}  失败: ${failed}`);
console.log('═══════════════════════');

process.exit(failed > 0 ? 1 : 0);
