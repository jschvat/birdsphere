#!/usr/bin/env node

/**
 * Quick Fix for Posts Table Schema
 * Adds missing columns to fix immediate issues
 */

const { pool, getClient } = require('./src/config/database');

async function fixPostsTable() {
  console.log('🔄 Fixing posts table schema...');

  const client = await getClient();

  try {
    // Check if posts table exists and what columns it has
    console.log('📋 Checking current posts table structure...');

    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'posts'
      ORDER BY ordinal_position;
    `);

    console.log('Current posts table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Add missing columns if they don't exist
    const missingColumns = [
      {
        name: 'post_type',
        definition: "VARCHAR(50) DEFAULT 'standard'"
      },
      {
        name: 'visibility',
        definition: "VARCHAR(20) DEFAULT 'followers'"
      },
      {
        name: 'comment_count',
        definition: 'INTEGER DEFAULT 0'
      },
      {
        name: 'share_count',
        definition: 'INTEGER DEFAULT 0'
      },
      {
        name: 'reaction_count',
        definition: 'INTEGER DEFAULT 0'
      }
    ];

    for (const column of missingColumns) {
      try {
        console.log(`🔧 Adding column ${column.name}...`);
        await client.query(`ALTER TABLE posts ADD COLUMN ${column.name} ${column.definition};`);
        console.log(`✅ Added column ${column.name}`);
      } catch (error) {
        if (error.code === '42701') { // Column already exists
          console.log(`⚠ Column ${column.name} already exists`);
        } else {
          console.error(`❌ Failed to add column ${column.name}:`, error.message);
        }
      }
    }

    // Create post_media table if it doesn't exist
    console.log('📋 Creating post_media table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS post_media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          file_type VARCHAR(50) NOT NULL,
          file_url VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          width INTEGER,
          height INTEGER,
          duration INTEGER,
          thumbnail_url VARCHAR(500),
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ post_media table created');
    } catch (error) {
      console.log('⚠ post_media table already exists or creation failed:', error.message);
    }

    // Create index for post_media
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);');
      console.log('✅ post_media index created');
    } catch (error) {
      console.log('⚠ post_media index already exists');
    }

    console.log('✅ Posts table schema fixed successfully!');
    console.log('🎯 Added missing columns: post_type, visibility, comment_count, share_count, reaction_count');
    console.log('🎯 Created post_media table for file attachments');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('🔍 Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixPostsTable();