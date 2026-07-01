/**
 * 音效管理 —— 读取 settings 开关，统一控制所有音效播放。
 * 音效文件需放入 assets/audio/ 目录。
 */
var store = require('../common/store');

// 音效文件路径映射
var SOUNDS = {
  draw:          '/assets/audio/draw.mp3',
  insert:        '/assets/audio/insert.mp3',
  guess_correct: '/assets/audio/guess_correct.mp3',
  guess_wrong:   '/assets/audio/guess_wrong.mp3',
  turn_start:    '/assets/audio/turn_start.mp3',
  victory:       '/assets/audio/victory.mp3',
  defeat:        '/assets/audio/defeat.mp3',
  tile_flip:     '/assets/audio/tile_flip.mp3',
};

var ctx = null;

function getCtx() {
  if (!ctx) ctx = wx.createInnerAudioContext();
  return ctx;
}

function enabled() {
  var settings = store.get('settings') || {};
  return settings.soundEnabled !== false;
}

function play(name) {
  if (!enabled()) return;
  var src = SOUNDS[name];
  if (!src) return;
  try {
    var audio = getCtx();
    audio.src = src;
    audio.play();
  } catch (e) { /* 音效非关键，静默失败 */ }
}

function vibrate(type) {
  var settings = store.get('settings') || {};
  if (settings.vibrationEnabled === false) return;
  try {
    if (type === 'light') wx.vibrateShort({ type: 'light' });
    else if (type === 'medium') wx.vibrateShort({ type: 'medium' });
    else wx.vibrateLong();
  } catch (e) { /* ignore */ }
}

module.exports = { play, vibrate };
