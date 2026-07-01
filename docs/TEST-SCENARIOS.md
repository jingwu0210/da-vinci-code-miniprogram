# 快速测试场景

在微信开发者工具控制台直接粘贴执行。`testHands` 预设手牌 + `poolTiles` 精确控制牌池，每人 1 张牌即开局。

## 场景 1：玩家必胜（2 张牌池）

```javascript
(function() {
var saved = wx.getStorageSync('app_user') || {};
var MY_OID = (saved.user && saved.user.openid) || 't_test0000000000';
var tid = wx.getStorageSync('touristId') || MY_OID;
var hands = {};
hands[MY_OID] = [{ color: 'white', value: 0 }];
hands['ai_1'] = [{ color: 'white', value: 1 }];
wx.cloud.callFunction({ name: 'game', data: {
  type: 'initGame', roomId: 'test001', mode: 'ai', difficulty: 'hard',
  players: [{ openid: MY_OID }, { openid: 'ai_1', isAI: true }],
  testHands: hands, testFirstPlayer: MY_OID, callerOpenid: MY_OID,
  touristId: tid, userType: (saved.userType || 'tourist'),
  poolTiles: [{ color: 'black', value: 2 }, { color: 'black', value: 3 }]
}}).then(function(r) {
  console.log('RAW_RESULT:', JSON.stringify(r.result));
  if (r.result && r.result.success && r.result.data) {
    console.log('GAME_ID=' + r.result.data.gameId);
    wx.redirectTo({ url: '/view/pages/board/index?gameId=' + r.result.data.gameId + '&roomId=test001' });
  } else {
    console.log('FAIL:', r.result ? r.result.error : 'NO_RESULT');
  }
}).catch(function(e) {
  console.log('CALL_FAILED:', e.message);
});
})();
```

结果：池 2 张 → 摸牌 → 猜 AI pos=0 为 **1** → 赢 → 结算页。

---

## 场景 2：玩家必败

同上开局。猜 AI 为 **0** → 猜错 → AI 回合（~5 秒）→ AI 猜对 → 输。

---

## 场景 3：多张牌 + 黑牌

每人 2 张，玩家先手：

```javascript
(function() {
var saved = wx.getStorageSync('app_user') || {};
var MY_OID = (saved.user && saved.user.openid) || 't_test0000000000';
var MY_TYPE = saved.userType || 'tourist';
var tid = wx.getStorageSync('touristId') || MY_OID;
var hands = {};
hands[MY_OID] = [{ color: 'black', value: 0 }, { color: 'white', value: 2 }];
hands['ai_1'] = [{ color: 'black', value: 1 }, { color: 'white', value: 3 }];
wx.cloud.callFunction({ name: 'game', data: {
  type: 'initGame', roomId: 'test002', mode: 'ai', difficulty: 'hard',
  players: [{ openid: MY_OID }, { openid: 'ai_1', isAI: true }],
  testHands: hands, testFirstPlayer: MY_OID, callerOpenid: MY_OID,
  touristId: tid, userType: MY_TYPE
}}).then(function(r) {
  if (r && r.result && r.result.data) {
    console.log('GAME_ID=' + r.result.data.gameId);
    wx.redirectTo({ url: '/view/pages/board/index?gameId=' + r.result.data.gameId + '&roomId=test002' });
  } else {
    console.log('FAIL:', JSON.stringify(r));
  }
});
})();
```

---

## 场景 4：结算页直接测试

不创建对局，直接 mock 数据测试结算 UI：

```javascript
wx.redirectTo({ url: '/view/subpackages/result/index?test=win' })   // 胜利
wx.redirectTo({ url: '/view/subpackages/result/index?test=lose' })  // 失败
```

---

## 注意事项

- `testHands` 的 key 必须与 `players[].openid` 一致（使用 `[MY_OID]` 动态键）
- `callerOpenid` 必须传，否则 game 云函数用 touristId 做 caller 会与 players 不匹配
- 不传 Joker（`isJoker: true`）即可跳过初始 Joker 摆放回合
- 每人手牌数相等（1v1=4 张，但 testHands 不限制，可自定义任意张数）

---

# 双登录体系验收用例

## 游客模式

| # | 用例 | 预期 |
|:--:|------|------|
| 1 | 首次打开小程序 → 直接进 lobby | 无弹窗，无登录页，控制台 `[lobby] userType=tourist` |
| 2 | 游客创建 AI 房间 → 完整对局 → 赢 | 结算页 `isWinner=true`，显示 🏆 你赢了 |
| 3 | 游客对局 AI 失败 | 结算页 `isWinner=false`（AI 赢时 `options.winner=ai_xxx ≠ touristId`），💔 再接再厉 |
| 4 | 游客历史页 | 显示本地缓存对局，总场次/胜场/胜率正确 |
| 5 | 游客 settings | 显示「微信登录」按钮 +「清除本地对局记录」|
| 6 | 游客退出对局 | prompt"将不计入历史对局"→ lobby，历史记录不变 |
| 7 | lobby 点「‹ 退出」→ login 页 | `userType=tourist` 时直接跳转 |
| 8 | 清除缓存后游客 | touristId 重置，历史记录清空 |

## 微信登录

| # | 用例 | 预期 |
|:--:|------|------|
| 9 | settings →「微信登录」→ 授权 | `userType=wechat`，lobby 显示头像昵称 |
| 10 | 微信用户对局 → 赢 | 结算页正确，`game_records` 集合新增记录 |
| 11 | 微信用户历史页 | 查询 `game_records`，新对局在列表中 |
| 12 | 微信用户退出登录 | settings →「退出登录」→ lobby 切回游客 |
| 13 | 再次微信登录 → 历史 | 之前云端记录恢复 |

## 数据隔离

| # | 用例 | 预期 |
|:--:|------|------|
| 14 | 游客对局 → 切微信 → 历史 | 游客本地记录不出现（除非迁移） |
| 15 | settings →「迁移游客数据」 | 本地记录批量写入 `game_records` |
| 16 | rooms 集合 | 游客房间 `creatorType='tourist'`, creatorId=UUID |

## Test Scripts 快速验证

```javascript
// 检查当前身份
(function() {
var saved = wx.getStorageSync('app_user') || {};
console.log('userType=' + (saved.userType || 'tourist'));
console.log('isGuest=' + ((saved.user && saved.user.isGuest) ? true : false));
console.log('touristId=' + wx.getStorageSync('touristId'));
})();

// 检查 game_records 数量
wx.cloud.callFunction({ name: 'history', data: { type: 'getRecords', page: 1, pageSize: 1 }}).then(r => console.log('records:', r.result));
```
