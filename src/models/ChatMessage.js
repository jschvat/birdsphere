const db = require('../config/database');

class ChatMessage {
  static async create(messageData) {
    const {
      roomId,
      senderId,
      content,
      messageType = 'text',
      replyTo = null
    } = messageData;

    const query = `
      INSERT INTO chat_messages (room_id, sender_id, content, message_type, reply_to)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [roomId, senderId, content, messageType, replyTo];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT cm.*, u.username, u.first_name, u.last_name, u.profile_image,
             rm.content as reply_content, ru.username as reply_username
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      LEFT JOIN chat_messages rm ON cm.reply_to = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE cm.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByRoom(roomId, limit = 50, offset = 0) {
    const query = `
      SELECT cm.*, u.username, u.first_name, u.last_name, u.profile_image,
             rm.content as reply_content, ru.username as reply_username
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      LEFT JOIN chat_messages rm ON cm.reply_to = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE cm.room_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [roomId, limit, offset]);
    return result.rows.reverse(); // Return in chronological order
  }

  static async findByRoomSince(roomId, since, limit = 100) {
    const query = `
      SELECT cm.*, u.username, u.first_name, u.last_name, u.profile_image,
             rm.content as reply_content, ru.username as reply_username
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      LEFT JOIN chat_messages rm ON cm.reply_to = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE cm.room_id = $1 AND cm.created_at > $2
      ORDER BY cm.created_at ASC
      LIMIT $3
    `;
    
    const result = await db.query(query, [roomId, since, limit]);
    return result.rows;
  }

  static async getUnreadCount(roomId, userId, lastSeen) {
    const query = `
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE room_id = $1 AND sender_id != $2 AND created_at > $3
    `;
    
    const result = await db.query(query, [roomId, userId, lastSeen]);
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(messageId, userId) {
    const query = `
      INSERT INTO message_read_status (message_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (message_id, user_id) DO NOTHING
      RETURNING *
    `;

    const result = await db.query(query, [messageId, userId]);
    return result.rows[0];
  }

  static async markRoomAsRead(roomId, userId, upToTime = new Date()) {
    // Update user's last seen time in room
    const updateLastSeenQuery = `
      UPDATE chat_room_members 
      SET last_seen = $3
      WHERE room_id = $1 AND user_id = $2
    `;
    await db.query(updateLastSeenQuery, [roomId, userId, upToTime]);

    // Mark all messages in room as read up to the specified time
    const markReadQuery = `
      INSERT INTO message_read_status (message_id, user_id)
      SELECT cm.id, $2
      FROM chat_messages cm
      WHERE cm.room_id = $1 
        AND cm.created_at <= $3
        AND cm.sender_id != $2
        AND NOT EXISTS (
          SELECT 1 FROM message_read_status mrs 
          WHERE mrs.message_id = cm.id AND mrs.user_id = $2
        )
    `;
    
    const result = await db.query(markReadQuery, [roomId, userId, upToTime]);
    return result.rowCount;
  }

  static async getReadStatus(messageId) {
    const query = `
      SELECT mrs.*, u.username, u.first_name
      FROM message_read_status mrs
      INNER JOIN users u ON mrs.user_id = u.id
      WHERE mrs.message_id = $1
      ORDER BY mrs.read_at ASC
    `;
    
    const result = await db.query(query, [messageId]);
    return result.rows;
  }

  static async update(id, senderId, updates) {
    const allowedFields = ['content'];
    const setClause = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${++paramCount}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) return null;

    values.push(id, senderId);
    const query = `
      UPDATE chat_messages 
      SET ${setClause.join(', ')}, is_edited = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${++paramCount} AND sender_id = $${++paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id, senderId) {
    const query = `
      DELETE FROM chat_messages 
      WHERE id = $1 AND sender_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, senderId]);
    return result.rows[0];
  }

  static async search(roomId, searchTerm, limit = 20) {
    const query = `
      SELECT cm.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM chat_messages cm
      INNER JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = $1 
        AND cm.message_type = 'text'
        AND cm.content ILIKE $2
      ORDER BY cm.created_at DESC
      LIMIT $3
    `;
    
    const result = await db.query(query, [roomId, `%${searchTerm}%`, limit]);
    return result.rows;
  }

  static async getRoomStats(roomId) {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT sender_id) as unique_senders,
        MIN(created_at) as first_message_at,
        MAX(created_at) as last_message_at
      FROM chat_messages
      WHERE room_id = $1
    `;
    
    const result = await db.query(query, [roomId]);
    return result.rows[0];
  }
}

module.exports = ChatMessage;