/**
 * getRoom — 查询房间信息（不执行加入逻辑）。
 */
module.exports = async (event, caller, db) => {
  const { roomId } = event;
  if (!roomId) return { success: false, error: 'INVALID_PARAMS', errorCode: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('rooms').where({ roomId: roomId.toUpperCase() }).get();
    if (!res.data || res.data.length === 0) {
      return { success: false, error: 'ROOM_NOT_FOUND', errorCode: 'ROOM_NOT_FOUND' };
    }
    const room = res.data[0];
    return { success: true, data: { room } };
  } catch (e) {
    return { success: false, error: 'INTERNAL_ERROR', errorCode: 'INTERNAL_ERROR' };
  }
};
