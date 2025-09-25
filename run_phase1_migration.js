const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function runPhase1Migration() {
    try {
        console.log('🚀 Starting Phase 1 Enhanced Comments Migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'src/migrations/phase_1_enhanced_comments.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await query(migrationSQL);

        console.log('✅ Phase 1 Enhanced Comments Migration completed successfully!');
        console.log('📝 Summary of changes:');
        console.log('   - Added comment_type field for categorization');
        console.log('   - Added has_media flag for media detection');
        console.log('   - Created comment_media table for file storage');
        console.log('   - Added performance indexes');
        console.log('   - Created helper function get_comments_with_media()');
        console.log('🎉 Comments can now support media attachments!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runPhase1Migration();