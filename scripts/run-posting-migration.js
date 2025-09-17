#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runPostingMigration() {
  console.log('🚀 Running Posting System Migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/migrations/create_posting_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Executing migration SQL...');

    // Execute the migration
    await db.query(migrationSQL);

    console.log('✅ Posting system migration completed successfully!');
    console.log('📊 Created tables: posts, post_media, comments, comment_edit_history, reactions, follows, moderation_flags');
    console.log('⚡ Created indexes for performance optimization');
    console.log('🔄 Created triggers for automatic count updates and data processing');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runPostingMigration().then(() => {
  console.log('🎉 Migration process completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration process failed:', error);
  process.exit(1);
});