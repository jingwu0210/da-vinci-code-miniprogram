/**
 * 历史记录服务。
 * 依赖: cloud/cloud-functions/history-call, model/cache/history-cache
 */

const HistoryCall = require('../../cloud/cloud-functions/history-call');
const historyCache = require('../../common/history-cache');
const logger = require('../../utils/logger');

const HistoryService = {
  /**
   * 保存对局记录（游戏结束时调用）。
   */
  async saveRecord(gameId) {
    const resp = await HistoryCall.saveRecord(gameId);
    if (resp.success) {
      historyCache.prepend(resp.data.record);
    }
    return resp;
  },

  /**
   * 分页获取记录。
   */
  async getRecords(page = 1, pageSize = 20) {
    // 优先从云端获取
    const resp = await HistoryCall.getRecords(page, pageSize);
    if (resp.success) {
      // 首页时更新本地缓存
      if (page === 1) {
        historyCache.save(resp.data.records);
      }
      return resp.data;
    }
    // 云端失败则降级到本地缓存
    logger.warn('HistoryService', 'Cloud fetch failed, using local cache');
    const local = historyCache.load();
    return {
      records: local.slice((page - 1) * pageSize, page * pageSize),
      total: local.length,
      page,
      pageSize,
      hasMore: page * pageSize < local.length,
    };
  },
};

module.exports = HistoryService;
