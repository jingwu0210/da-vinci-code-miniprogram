/**
 * 本地历史记录缓存 —— 最近 20 局。
 * 依赖: ../storage-keys, ../../utils/local-storage, ../../common/constants
 */

const KEYS = require('./storage-keys');
const storage = require('../utils/local-storage');
const { MAX_LOCAL_HISTORY } = require('./constants');

function load() {
  return storage.get(KEYS.LOCAL_HISTORY, []);
}

function save(records) {
  const trimmed = records.slice(0, MAX_LOCAL_HISTORY);
  return storage.set(KEYS.LOCAL_HISTORY, trimmed);
}

/**
 * 在列表头部插入一条新记录。
 */
function prepend(record) {
  const records = load();
  records.unshift(record);
  return save(records);
}

module.exports = { load, save, prepend };
