const db = require('../config/database');

class ChatRoom {
  static async create(roomData) {
    const {
      name,
      description,
      roomType = 'public',
      createdBy,
      maxMembers = 100
    } = roomData;

    const query = `
      INSERT INTO chat_rooms (name, description, room_type, created_by, max_members)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [name, description, roomType, createdBy, maxMembers];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT cr.*, u.username as creator_username, u.first_name as creator_first_name
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.id = $1 AND cr.is_active = true
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(limit = 20, offset = 0) {
    const query = `
      SELECT cr.*, u.username as creator_username, u.first_name as creator_first_name,
             COUNT(crm.user_id) as member_count
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.created_by = u.id
      LEFT JOIN chat_room_members crm ON cr.id = crm.room_id
      WHERE cr.is_active = true
      GROUP BY cr.id, u.username, u.first_name
      ORDER BY cr.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  static async findPublicRooms(limit = 20) {
    const query = `
      SELECT cr.*, u.username as creator_username, u.first_name as creator_first_name,
             COUNT(crm.user_id) as member_count,
             COUNT(CASE WHEN crm.is_online = true THEN 1 END) as online_count
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.created_by = u.id
      LEFT JOIN chat_room_members crm ON cr.id = crm.room_id
      WHERE cr.is_active = true AND cr.room_type = 'public'
      GROUP BY cr.id, u.username, u.first_name
      ORDER BY online_count DESC, member_count DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  static async findUserRooms(userId) {
    const query = `
      SELECT cr.*, u.username as creator_username, u.first_name as creator_first_name,
             crm.role, crm.last_seen, crm.is_online,
             COUNT(cm.id) as unread_count
      FROM chat_rooms cr
      LEFT JOIN users u ON cr.created_by = u.id
      INNER JOIN chat_room_members crm ON cr.id = crm.room_id
      LEFT JOIN chat_messages cm ON (
        cm.room_id = cr.id 
        AND cm.created_at > crm.last_seen 
        AND cm.sender_id != $1
      )
      WHERE crm.user_id = $1 AND cr.is_active = true
      GROUP BY cr.id, u.username, u.first_name, crm.role, crm.last_seen, crm.is_online
      ORDER BY cr.updated_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async addMember(roomId, userId, role = 'member') {
    const query = `
      INSERT INTO chat_room_members (room_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (room_id, user_id) 
      DO UPDATE SET role = EXCLUDED.role, joined_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [roomId, userId, role];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async removeMember(roomId, userId) {
    const query = `
      DELETE FROM chat_room_members 
      WHERE room_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [roomId, userId]);
    return result.rows[0];
  }

  static async getRoomMembers(roomId) {
    const query = `
      SELECT crm.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM chat_room_members crm
      INNER JOIN users u ON crm.user_id = u.id
      WHERE crm.room_id = $1
      ORDER BY crm.joined_at ASC
    `;
    
    const result = await db.query(query, [roomId]);
    return result.rows;
  }

  static async getOnlineMembers(roomId) {
    const query = `
      SELECT crm.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM chat_room_members crm
      INNER JOIN users u ON crm.user_id = u.id
      WHERE crm.room_id = $1 AND crm.is_online = true
      ORDER BY crm.last_seen DESC
    `;
    
    const result = await db.query(query, [roomId]);
    return result.rows;
  }

  static async updateMemberStatus(roomId, userId, isOnline, lastSeen = new Date()) {
    const query = `
      UPDATE chat_room_members 
      SET is_online = $3, last_seen = $4
      WHERE room_id = $1 AND user_id = $2
      RETURNING *
    `;

    const values = [roomId, userId, isOnline, lastSeen];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async isMember(roomId, userId) {
    const query = `
      SELECT 1 FROM chat_room_members 
      WHERE room_id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [roomId, userId]);
    return result.rows.length > 0;
  }

  static async getMemberRole(roomId, userId) {
    const query = `
      SELECT role FROM chat_room_members 
      WHERE room_id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [roomId, userId]);
    return result.rows[0]?.role;
  }

  static async update(id, updates) {
    const allowedFields = ['name', 'description', 'max_members'];
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

    values.push(id);
    const query = `
      UPDATE chat_rooms 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `
      UPDATE chat_rooms 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = ChatRoom;