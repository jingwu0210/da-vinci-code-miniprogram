/**
 * games 集合 Watch —— 对局状态实时同步。
 * 依赖: ./watcher-base, ../../utils/logger
 */

const { createWatcher } = require('./watcher-base');
const logger = require('../../utils/logger');

function watchGame(gameId, onUpdate, onError) {
  const db = wx.cloud.database();
  const collection = db.collection('games');

  const fallbackPoll = async () => {
    const res = await collection.doc(gameId).get();
    return res.data;
  };

  return createWatcher({
    collection,
    docId: gameId,
    onUpdate: (doc) => {
      logger.debug('GameWatcher', `Update for ${gameId}`, { phase: doc.phase });
      onUpdate(doc);
    },
    onError,
    fallbackPoll,
  });
}

module.exports = { watchGame };
