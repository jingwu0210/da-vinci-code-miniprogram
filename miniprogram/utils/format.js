/**
 * 格式化工具 —— 纯函数。
 */

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s.toString().padStart(2, '0')}秒`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const M = (d.getMonth() + 1).toString().padStart(2, '0');
  const D = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${M}月${D}日 ${h}:${mi}`;
}

function formatWinRate(wins, total) {
  if (total === 0) return '0%';
  return `${Math.round((wins / total) * 100)}%`;
}

function formatRoomCode(code) {
  return (code || '').toUpperCase().replace(/(.{3})/g, '$1 ').trim();
}

module.exports = { formatDuration, formatDate, formatWinRate, formatRoomCode };
