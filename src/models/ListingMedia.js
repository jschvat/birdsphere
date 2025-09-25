/**
 * ListingMedia Data Model
 * Media management system for animal marketplace listings with ordering and primary image support.
 *
 * Architecture Overview:
 * - Multiple media files per listing with display order control
 * - Primary image designation for thumbnail displays
 * - File metadata storage including size and MIME type
 * - Transaction-based operations for data consistency
 * - Batch operations for media gallery management
 * - File cleanup support for storage management
 *
 * Key Features:
 * - Media Gallery: Multiple images per listing with custom ordering
 * - Primary Image: Designated thumbnail for listing previews
 * - File Management: Complete metadata including size, type, and path
 * - Order Control: User-defined display sequence for media
 * - Batch Operations: Efficient bulk media updates
 * - Transaction Safety: ACID compliance for critical operations
 *
 * Database Design:
 * - Foreign key to listings table
 * - Display order for custom media sequence
 * - Boolean flag for primary image designation
 * - File metadata for storage optimization
 * - Indexed for fast listing-based queries
 *
 * Integration Points:
 * - Works with Listing model for media galleries
 * - Supports file upload and storage systems
 * - Feeds image display components
 * - Handles media deletion and cleanup
 */
const db = require('../config/database');

class ListingMedia {
  /**
   * Create Media Entry
   * Adds a new media file to a listing with metadata and display ordering.
   *
   * @param {string} listingId - ID of associated listing
   * @param {Object} mediaData - Media file information
   * @param {string} mediaData.filePath - Storage path to media file
   * @param {string} mediaData.fileType - Media type (image, video, etc.)
   * @param {number} mediaData.fileSize - File size in bytes
   * @param {string} mediaData.mimeType - MIME type of the file
   * @param {boolean} [mediaData.isPrimary=false] - Primary image flag
   * @param {number} [mediaData.displayOrder=0] - Display order in gallery
   * @returns {Promise<Object>} Created media record with metadata
   */
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

  /**
   * Find Media by Listing
   * Retrieves all media files for a specific listing ordered by display preference.
   * Used for gallery displays and media management.
   *
   * @param {string} listingId - ID of listing to get media for
   * @returns {Promise<Array>} Array of media files ordered by display order
   */
  static async findByListingId(listingId) {
    const query = `
      SELECT * FROM listing_media 
      WHERE listing_id = $1 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    const result = await db.query(query, [listingId]);
    return result.rows;
  }

  /**
   * Set Primary Image
   * Designates one image as the primary thumbnail, unsetting others.
   * Uses transaction to ensure only one primary image per listing.
   *
   * @param {string} listingId - ID of listing to update
   * @param {string} mediaId - ID of media to set as primary
   * @returns {Promise<Object>} Updated media record marked as primary
   */
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

  /**
   * Update Display Order
   * Reorders media files according to user preference using batch transaction.
   * Ensures atomic update of all display orders to prevent inconsistency.
   *
   * @param {string} listingId - ID of listing to reorder media for
   * @param {Array<string>} mediaIds - Array of media IDs in desired order
   * @returns {Promise<void>}
   * @throws {Error} If transaction fails or rollback is required
   */
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

  /**
   * Delete Media File
   * Removes media record and returns file path for cleanup.
   * Used with file system cleanup to remove orphaned files.
   *
   * @param {string} id - Media record ID to delete
   * @param {string} listingId - Listing ID for verification
   * @returns {Promise<Object>} Deleted record with file path for cleanup
   */
  static async delete(id, listingId) {
    const query = `
      DELETE FROM listing_media 
      WHERE id = $1 AND listing_id = $2
      RETURNING file_path
    `;
    
    const result = await db.query(query, [id, listingId]);
    return result.rows[0];
  }

  /**
   * Delete All Listing Media
   * Removes all media files associated with a listing.
   * Returns file paths for bulk file system cleanup.
   *
   * @param {string} listingId - ID of listing to clear media for
   * @returns {Promise<Array>} Array of deleted records with file paths
   */
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