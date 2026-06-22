/**
 * Tile 实体 —— 牌的唯一工厂 + 属性校验 + 客户端视图转换。
 * 依赖: common/enums, common/constants
 */

const { Color } = require('../../common/enums');
const { JOKER_VALUE, MIN_VALUE, MAX_VALUE } = require('../../common/constants');

/**
 * 工厂方法 —— 创建一张牌。
 * 这是系统中创建 Tile 的唯一入口。
 */
function create({ id, color, value, isJoker = false, position = null, isRevealed = false }) {
  if (color !== Color.BLACK && color !== Color.WHITE) {
    throw new Error(`Invalid color: ${color}`);
  }
  const actualIsJoker = (value === JOKER_VALUE);
  if (isJoker && !actualIsJoker) {
    throw new Error(`isJoker=true but value=${value} !== JOKER_VALUE`);
  }
  if (!isJoker && (value < MIN_VALUE || value > MAX_VALUE)) {
    throw new Error(`Value out of range: ${value}`);
  }
  return {
    id,
    color,
    value,
    isJoker: actualIsJoker,
    position,
    isRevealed,
  };
}

/**
 * 从牌组模板批量创建。
 */
function createDeckTiles() {
  const tiles = [];
  let idx = 0;
  for (const color of [Color.BLACK, Color.WHITE]) {
    for (let v = MIN_VALUE; v <= MAX_VALUE; v++) {
      tiles.push(create({ id: `t_${idx++}`, color, value: v }));
    }
    tiles.push(create({ id: `t_${idx++}`, color, value: JOKER_VALUE, isJoker: true }));
  }
  return tiles;
}

/**
 * 转换为客户端自己的牌视图（完整信息）。
 */
function toSelfTile(tile) {
  return {
    id:         tile.id,
    color:      tile.color,
    value:      tile.value,
    isJoker:    tile.isJoker,
    position:   tile.position,
    isRevealed: tile.isRevealed,
  };
}

/**
 * 转换为客户端对手的牌视图（信息受限）。
 */
function toOpponentTile(tile) {
  if (tile.isRevealed) {
    return {
      position:   tile.position,
      color:      tile.color,
      value:      tile.value,
      isJoker:    tile.isJoker,
      isRevealed: true,
    };
  }
  // 未翻开：仅暴露位置和颜色（牌背与正面同色，颜色可见）
  return {
    position:   tile.position,
    color:      tile.color,
    isRevealed: false,
  };
}

/**
 * 根据查看者身份 sanitize 牌数据。
 */
function sanitizeForClient(tile, viewerOpenid, tileOwnerOpenid) {
  if (viewerOpenid === tileOwnerOpenid) {
    return toSelfTile(tile);
  }
  return toOpponentTile(tile);
}

module.exports = { create, createDeckTiles, toSelfTile, toOpponentTile, sanitizeForClient };
