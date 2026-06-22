/**
 * rooms 集合 Watch —— 房间状态实时同步。
 * 依赖: ./watcher-base, ../../utils/logger
 */

const { createWatcher } = require('./watcher-base');
const logger = require('../../utils/logger');

function watchRoom(roomId, onUpdate, onError) {
  const db = wx.cloud.database();
  const collection = db.collection('rooms');

  const fallbackPoll = async () => {
    const res = await collection.doc(roomId).get();
    return res.data;
  };

  return createWatcher({
    collection,
    docId: roomId,
    onUpdate: (doc) => {
      logger.debug('RoomWatcher', `Update for ${roomId}`, { status: doc.status });
      onUpdate(doc);
    },
    onError,
    fallbackPoll,
  });
}

module.exports = { watchRoom };
