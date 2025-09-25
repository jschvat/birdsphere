const { query } = require('./src/config/database');

async function addIsPinnedColumn() {
  try {
    console.log('🔧 Adding is_pinned column to posts table...');

    await query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ is_pinned column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding is_pinned column:', error);
    process.exit(1);
  }
}

addIsPinnedColumn();