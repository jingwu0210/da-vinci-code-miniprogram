/**
 * Player 实体。
 * 依赖: common/enums
 */

function createPlayer({ openid, nickName = '', avatarUrl = '', isAI = false, seatIndex = 0 }) {
  return {
    openid,
    nickName,
    avatarUrl,
    isAI,
    seatIndex,
    isReady: false,
    hand: [],
  };
}

function updateProfile(player, { nickName, avatarUrl }) {
  return {
    ...player,
    nickName: nickName ?? player.nickName,
    avatarUrl: avatarUrl ?? player.avatarUrl,
  };
}

function toggleReady(player) {
  return { ...player, isReady: !player.isReady };
}

module.exports = { createPlayer, updateProfile, toggleReady };
