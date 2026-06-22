/**
 * 新手教程 6 步数据。
 * 依赖: 无（纯数据）。
 */
const STEPS = [
  {
    title: '牌组介绍',
    content: '牌组由 26 张密码牌组成。黑色和白色各 13 张，包含数字 0~11 各一张，以及一张 Joker 牌（"—"）。',
    image: '/images/tutorial/deck.png',
  },
  {
    title: '游戏准备',
    content: '洗牌后每人抽 4 张（4 人游戏则 3 张）。手牌从小到大排列，同数字时黑色在左、白色在右。Joker 可插入任意位置。',
    image: '/images/tutorial/setup.png',
  },
  {
    title: '回合流程',
    content: '每个回合分为两步：第一步摸一张暗牌插入手牌序列；第二步选择一位对手，猜测其某张牌的数字。',
    image: '/images/tutorial/turn.png',
  },
  {
    title: '猜测规则',
    content: '指定对手某张牌并猜数字：猜对则对手翻开该牌，你可以继续猜；猜错则自己刚摸的牌翻开展示，回合结束。',
    image: '/images/tutorial/guess.png',
  },
  {
    title: 'Joker 规则',
    content: 'Joker 没有固定数值，可以插入手牌任意位置混淆对手。猜测时猜中颜色即可判定猜对，数字随意。',
    image: '/images/tutorial/joker.png',
  },
  {
    title: '胜负判定',
    content: '率先猜出所有对手全部手牌的玩家获胜！手牌被全部翻开的玩家出局，游戏继续直到决出最终赢家。',
    image: '/images/tutorial/win.png',
  },
];

module.exports = { STEPS };
