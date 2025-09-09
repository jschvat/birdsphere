const db = require('../config/database');

class ListingMedia {
  static async create(listingId, mediaData) {
    const {
      filePath,
      fileType,
      fileSize,
      mimeType,
      isPrimary = false,
      displayOrder = 0
    } = mediaData;

    const query = `
      INSERT INTO listing_media (
        listing_id, file_path, file_type, file_size, mime_type, is_primary, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [listingId, filePath, fileType, fileSize, mimeType, isPrimary, displayOrder];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByListingId(listingId) {
    const query = `
      SELECT * FROM listing_media 
      WHERE listing_id = $1 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    const result = await db.query(query, [listingId]);
    return result.rows;
  }

  static async setPrimary(listingId, mediaId) {
    // First, unset all primary flags for this listing
    await db.query(
      'UPDATE listing_media SET is_primary = false WHERE listing_id = $1',
      [listingId]
    );

    // Then set the specified media as primary
    const query = `
      UPDATE listing_media 
      SET is_primary = true 
      WHERE id = $1 AND listing_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [mediaId, listingId]);
    return result.rows[0];
  }

  static async updateOrder(listingId, mediaIds) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < mediaIds.length; i++) {
        await client.query(
          'UPDATE listing_media SET display_order = $1 WHERE id = $2 AND listing_id = $3',
          [i, mediaIds[i], listingId]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id, listingId) {
    const query = `
      DELETE FROM listing_media 
      WHERE id = $1 AND listing_id = $2
      RETURNING file_path
    `;
    
    const result = await db.query(query, [id, listingId]);
    return result.rows[0];
  }

  static async deleteByListingId(listingId) {
    const query = `
      DELETE FROM listing_media 
      WHERE listing_id = $1
      RETURNING file_path
    `;
    
    const result = await db.query(query, [listingId]);
    return result.rows;
  }
}

module.exports = ListingMedia;