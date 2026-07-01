/**
 * disbandRoom —— 房主解散房间，从数据库彻底删除。
 */
module.exports = async function (event, caller, db) {
  var roomId = (event.roomId || '').toUpperCase();
  if (!roomId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    var res = await db.collection('rooms').where({ roomId: roomId }).get();
    if (res.data.length === 0) return { success: false, error: 'ROOM_NOT_FOUND' };

    var room = res.data[0];
    if (room.creatorOpenid !== caller) return { success: false, error: 'NOT_ROOM_CREATOR' };

    await db.collection('rooms').doc(room._id).remove();
    return { success: true, data: { deleted: true } };
  } catch (e) {
    return { success: false, error: e.message || 'DISBAND_FAILED' };
  }
};
