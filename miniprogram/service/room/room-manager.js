/**
 * 房间生命周期管理。
 * 依赖: cloud/cloud-functions/room-call, cloud/watch/room-watcher, cloud/share/share-helper
 */

const RoomCall = require('../../cloud/cloud-functions/room-call');
const { watchRoom } = require('../../cloud/watch/room-watcher');
const { roomShareConfig } = require('../../cloud/share/share-helper');
const logger = require('../../utils/logger');

const RoomManager = {
  async createAndJoin(config) {
    const resp = await RoomCall.createRoom(config);
    this._handleError(resp);
    return resp.data.room;
  },

  async getRoom(roomId) {
    const resp = await RoomCall.getRoom(roomId);
    this._handleError(resp);
    return resp.data.room;
  },

  async joinRoom(roomId, password) {
    const resp = await RoomCall.joinRoom(roomId, password);
    this._handleError(resp);
    return resp.data.room;
  },

  async disbandRoom(roomId) {
    const resp = await RoomCall.disbandRoom(roomId);
    return resp.success ? resp.data : null;
  },

  async leaveRoom(roomId) {
    const resp = await RoomCall.leaveRoom(roomId);
    this._handleError(resp);
    return resp.data;
  },

  async toggleReady(roomId, isReady) {
    const resp = await RoomCall.toggleReady(roomId, isReady);
    this._handleError(resp);
    return resp.data;
  },

  async startGame(roomId) {
    const resp = await RoomCall.startGame(roomId);
    this._handleError(resp);
    return resp.data;
  },

  subscribe(roomId, onUpdate, onError) {
    return watchRoom(roomId, onUpdate, onError);
  },

  getShareConfig(roomId) {
    return roomShareConfig(roomId);
  },

  _handleError(resp) {
    if (!resp.success) {
      logger.error('RoomManager', `Operation failed: ${resp.error}`);
      throw new Error(resp.error || 'ROOM_OPERATION_FAILED');
    }
  },
};

module.exports = RoomManager;
