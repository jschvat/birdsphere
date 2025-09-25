const { query } = require('./src/config/database');

async function completeMigration() {
  try {
    console.log('🔧 Running complete database migration...');

    // Add all missing columns to posts table
    const missingColumns = [
      'location_lat DECIMAL(10, 8)',
      'location_lng DECIMAL(11, 8)',
      'location_name VARCHAR(255)',
      'hashtags TEXT[]',
      'search_keywords TEXT[]'
    ];

    for (const column of missingColumns) {
      const [columnName] = column.split(' ');
      try {
        console.log(`🔧 Adding column: ${columnName}`);
        await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${column}`);
        console.log(`✅ Added: ${columnName}`);
      } catch (error) {
        console.log(`⚠️  Column ${columnName} might already exist or error:`, error.message);
      }
    }

    // Ensure comments table exists with proper structure
    console.log('🔧 Creating/updating comments table...');
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL,
        author_id UUID NOT NULL,
        content TEXT NOT NULL,
        parent_comment_id UUID,
        reaction_count INTEGER DEFAULT 0,
        is_edited BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster comment queries
    await query('CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id)');

    console.log('✅ Complete migration finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

completeMigration();