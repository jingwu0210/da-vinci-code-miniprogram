/**
 * 设置缓存读写 —— 音效/振动/动画速度。
 * 依赖: ../storage-keys, ../../utils/local-storage
 */

const KEYS = require('./storage-keys');
const storage = require('../utils/local-storage');

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  vibrationEnabled: true,
  animationSpeed: 'normal',  // 'fast' | 'normal' | 'slow'
};

function load() {
  return storage.get(KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
}

function save(settings) {
  return storage.set(KEYS.SETTINGS, settings);
}

function update(key, value) {
  const settings = load();
  settings[key] = value;
  return save(settings);
}

module.exports = { load, save, update, DEFAULT_SETTINGS };
