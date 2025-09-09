const db = require('../config/database');

class Message {
  static async createConversation(buyerId, sellerId, listingId = null) {
    const query = `
      INSERT INTO conversations (buyer_id, seller_id, listing_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (buyer_id, seller_id, listing_id) 
      DO UPDATE SET last_message_at = NOW()
      RETURNING *
    `;
    
    const result = await db.query(query, [buyerId, sellerId, listingId]);
    return result.rows[0];
  }

  static async findConversation(buyerId, sellerId, listingId = null) {
    let query = 'SELECT * FROM conversations WHERE buyer_id = $1 AND seller_id = $2';
    const values = [buyerId, sellerId];
    
    if (listingId) {
      query += ' AND listing_id = $3';
      values.push(listingId);
    } else {
      query += ' AND listing_id IS NULL';
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getUserConversations(userId) {
    const query = `
      SELECT c.*,
             CASE 
               WHEN c.buyer_id = $1 THEN u_seller.username
               ELSE u_buyer.username
             END as other_username,
             CASE 
               WHEN c.buyer_id = $1 THEN u_seller.first_name
               ELSE u_buyer.first_name
             END as other_first_name,
             CASE 
               WHEN c.buyer_id = $1 THEN u_seller.last_name
               ELSE u_buyer.last_name
             END as other_last_name,
             CASE 
               WHEN c.buyer_id = $1 THEN u_seller.profile_image
               ELSE u_buyer.profile_image
             END as other_profile_image,
             l.title as listing_title,
             l.price as listing_price,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) as unread_count
      FROM conversations c
      JOIN users u_buyer ON c.buyer_id = u_buyer.id
      JOIN users u_seller ON c.seller_id = u_seller.id
      LEFT JOIN listings l ON c.listing_id = l.id
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      ORDER BY c.last_message_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async sendMessage(conversationId, senderId, content) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the message
      const messageQuery = `
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const messageResult = await client.query(messageQuery, [conversationId, senderId, content]);
      
      // Update conversation last_message_at
      await client.query(
        'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
        [conversationId]
      );
      
      await client.query('COMMIT');
      return messageResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
    // Verify user is part of this conversation
    const conversationQuery = `
      SELECT * FROM conversations 
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)
    `;
    
    const conversationResult = await db.query(conversationQuery, [conversationId, userId]);
    
    if (conversationResult.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const offset = (page - 1) * limit;
    
    const messagesQuery = `
      SELECT m.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(messagesQuery, [conversationId, limit, offset]);
    return result.rows.reverse(); // Return in chronological order
  }

  static async markMessagesAsRead(conversationId, userId) {
    const query = `
      UPDATE messages 
      SET is_read = true 
      WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
      RETURNING COUNT(*)
    `;
    
    const result = await db.query(query, [conversationId, userId]);
    return result.rows[0];
  }

  static async deleteConversation(conversationId, userId) {
    // Verify user is part of this conversation
    const conversationQuery = `
      SELECT * FROM conversations 
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)
    `;
    
    const conversationResult = await db.query(conversationQuery, [conversationId, userId]);
    
    if (conversationResult.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    // Delete conversation (messages will be deleted via CASCADE)
    const deleteQuery = 'DELETE FROM conversations WHERE id = $1';
    await db.query(deleteQuery, [conversationId]);
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.buyer_id = $1 OR c.seller_id = $1) 
        AND m.sender_id != $1 
        AND m.is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].unread_count);
  }
}

module.exports = Message;