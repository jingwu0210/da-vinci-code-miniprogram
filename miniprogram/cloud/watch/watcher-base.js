/**
 * 数据库 Watch 基类 —— 自动重连 + 降级轮询。
 * 依赖: ../../utils/logger
 */

const logger = require('../../utils/logger');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;   // ms
const POLL_INTERVAL = 3000; // 降级轮询间隔

function createWatcher({ collection, docId, onUpdate, onError, fallbackPoll }) {
  let watcher = null;
  let retryCount = 0;
  let pollTimer = null;
  let closed = false;

  function startWatch() {
    if (closed) return;
    try {
      watcher = collection.doc(docId).watch({
        onChange: (snapshot) => {
          retryCount = 0; // 重置重试计数
          const doc = snapshot.docs[0];
          if (doc) onUpdate(doc);
        },
        onError: (err) => {
          logger.error('Watcher', `Error for ${docId}`, err);
          watcher = null;
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            logger.info('Watcher', `Retry ${retryCount}/${MAX_RETRIES} for ${docId}`);
            setTimeout(startWatch, RETRY_DELAY);
          } else {
            logger.warn('Watcher', `Falling back to polling for ${docId}`);
            startPolling();
          }
          onError && onError(err);
        },
      });
    } catch (e) {
      logger.error('Watcher', `Failed to start for ${docId}`, e);
      startPolling();
    }
  }

  function startPolling() {
    if (closed) return;
    pollTimer = setInterval(async () => {
      try {
        const doc = await fallbackPoll();
        if (doc) onUpdate(doc);
      } catch (e) {
        logger.error('Watcher', `Poll error for ${docId}`, e);
      }
    }, POLL_INTERVAL);
  }

  function close() {
    closed = true;
    if (watcher) {
      try { watcher.close(); } catch (e) { /* ignore */ }
      watcher = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  startWatch();
  return { close };
}

module.exports = { createWatcher };
