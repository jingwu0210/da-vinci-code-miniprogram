/**
 * Room 实体。
 * 依赖: common/enums, common/constants
 */

const { RoomStatus } = require('../../common/enums');
const { ROOM_CODE_LENGTH } = require('../../common/constants');

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom({ creatorOpenid, mode, maxPlayers = 2, password = '', difficulty = null }) {
  return {
    roomId:         generateRoomCode(),
    status:         RoomStatus.WAITING,
    mode,
    maxPlayers,
    password,
    difficulty,
    creatorOpenid,
    players:         [],
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };
}

function addPlayer(room, player) {
  if (room.players.length >= room.maxPlayers) {
    throw new Error('ROOM_FULL');
  }
  room.players.push({ ...player, isReady: false, seatIndex: room.players.length });
  room.updatedAt = new Date().toISOString();
  return room;
}

function removePlayer(room, openid) {
  room.players = room.players.filter(p => p.openid !== openid);
  // 房主离开则顺延
  if (room.creatorOpenid === openid && room.players.length > 0) {
    room.creatorOpenid = room.players[0].openid;
  }
  room.updatedAt = new Date().toISOString();
  return room;
}

module.exports = { generateRoomCode, createRoom, addPlayer, removePlayer };
