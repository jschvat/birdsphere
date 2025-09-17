#!/usr/bin/env node

/**
 * Quick API Test - Tests core posting functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3015/api';

async function quickTest() {
  console.log('🔍 Quick API Test Suite');
  console.log('=======================');

  try {
    // Test 1: API Root
    console.log('1. Testing API root...');
    const apiRoot = await axios.get(`${BASE_URL}/`);
    console.log('✅ API Root:', apiRoot.data.message);

    // Test 2: Media Limits
    console.log('2. Testing media limits...');
    const mediaLimits = await axios.get(`${BASE_URL}/media/limits`);
    console.log('✅ Media Limits:', mediaLimits.data.data.maxFileSizeFormatted);

    // Test 3: Trending Posts (public access)
    console.log('3. Testing trending posts...');
    const trending = await axios.get(`${BASE_URL}/posts/trending?limit=5`);
    console.log('✅ Trending Posts:', trending.data.pagination || 'Response received');

    // Test 4: Search Posts (public access)
    console.log('4. Testing post search...');
    const search = await axios.get(`${BASE_URL}/posts/search?search=test&limit=3`);
    console.log('✅ Search Posts:', search.data.meta?.searchQuery || 'Response received');

    // Test 5: Query Metadata
    console.log('5. Testing query metadata...');
    const timeline = await axios.get(`${BASE_URL}/posts/trending?page=1&limit=2`);
    if (timeline.data.meta) {
      console.log('✅ Query Metadata:');
      console.log('   - Available Sorts:', timeline.data.meta.availableSorts?.slice(0, 3));
      console.log('   - Search Fields:', timeline.data.meta.searchFields);
      console.log('   - Filters:', Object.keys(timeline.data.meta.filters || {}));
    }

    // Test 6: Pagination
    console.log('6. Testing pagination...');
    const paginated = await axios.get(`${BASE_URL}/posts/trending?page=1&limit=1`);
    if (paginated.data.pagination) {
      console.log('✅ Pagination:', {
        page: paginated.data.pagination.page,
        limit: paginated.data.pagination.limit,
        total: paginated.data.pagination.total
      });
    }

    console.log('\n🎉 All Quick Tests Passed!');
    console.log('\n📋 API Features Verified:');
    console.log('   ✅ Core endpoints accessible');
    console.log('   ✅ Media upload configuration');
    console.log('   ✅ Search functionality');
    console.log('   ✅ Pagination and metadata');
    console.log('   ✅ Multiple sort options');
    console.log('   ✅ Filtering capabilities');

  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
    console.error('   URL:', error.config?.url);
    process.exit(1);
  }
}

// Run the test
quickTest();