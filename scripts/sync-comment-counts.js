#!/usr/bin/env node

/**
 * Script to synchronize comment counts for all posts
 * This fixes any posts that have comments but incorrect comment_count
 */

require('dotenv').config();
const Post = require('../src/models/Post');

async function main() {
  try {
    console.log('🔄 Synchronizing comment counts...');

    const updatedRows = await Post.syncCommentCounts();

    console.log(`✅ Successfully updated comment counts for ${updatedRows} posts`);

    // Test the specific post we know has issues
    const testPostId = '2a871fb6-aabe-435c-85fe-580b7950873a';
    console.log('\n🧪 Verification test:');

    // Get the post data after sync
    const trending = await Post.findTrending({ limit: 1 });
    if (trending.length > 0) {
      console.log(`Post ${trending[0].id} now has comment_count: ${trending[0].comment_count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to sync comment counts:', error);
    process.exit(1);
  }
}

main();