/**
 * 分级日志 —— 生产环境自动关闭 debug/info。
 * 依赖: 无（仅 common 常量）
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

// 可在此切换日志级别
const CURRENT_LEVEL = LOG_LEVELS.DEBUG;

function log(level, tag, ...args) {
  if (level < CURRENT_LEVEL) return;
  const prefix = `[${tag}]`;
  switch (level) {
    case LOG_LEVELS.DEBUG: console.debug(prefix, ...args); break;
    case LOG_LEVELS.INFO:  console.log(prefix, ...args); break;
    case LOG_LEVELS.WARN:  console.warn(prefix, ...args); break;
    case LOG_LEVELS.ERROR: console.error(prefix, ...args); break;
  }
}

const logger = {
  debug: (tag, ...args) => log(LOG_LEVELS.DEBUG, tag, ...args),
  info:  (tag, ...args) => log(LOG_LEVELS.INFO,  tag, ...args),
  warn:  (tag, ...args) => log(LOG_LEVELS.WARN,  tag, ...args),
  error: (tag, ...args) => log(LOG_LEVELS.ERROR, tag, ...args),
};

module.exports = logger;
