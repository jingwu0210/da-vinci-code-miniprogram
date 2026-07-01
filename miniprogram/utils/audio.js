/**
 * 音效管理 —— 读取 settings 开关，统一控制所有音效播放。
 * 音效文件需放入 assets/audio/ 目录。
 */
var store = require('../common/store');

// 音效文件路径映射
var SOUNDS = {
  draw:          '/assets/audio/draw.mp3',
  guess_correct: '/assets/audio/guess_correct.mp3',
  victory:       '/assets/audio/victory.mp3',
  defeat:        '/assets/audio/defeat.mp3',
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

function vibrateShort() {
  var settings = store.get('settings') || {};
  if (settings.vibrationEnabled === false) return;
  try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
}
function vibrateLong() {
  var settings = store.get('settings') || {};
  if (settings.vibrationEnabled === false) return;
  try { wx.vibrateLong(); } catch (e) { try { wx.vibrateShort({ type: 'heavy' }); } catch (e2) {} }
}

module.exports = { play, vibrate, vibrateShort, vibrateLong };
