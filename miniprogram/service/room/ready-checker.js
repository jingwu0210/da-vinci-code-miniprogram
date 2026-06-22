/**
 * 准备状态校验。
 */

function canStartGame(room) {
  const humanPlayers = room.players.filter(p => !p.isAI);
  const allReady = humanPlayers.every(p => p.isReady);
  const minPlayers = room.mode === 'ai' ? 1 : 2;
  const enoughPlayers = humanPlayers.length >= minPlayers;
  return allReady && enoughPlayers;
}

function isRoomFull(room) {
  return room.players.length >= room.maxPlayers;
}

module.exports = { canStartGame, isRoomFull };
