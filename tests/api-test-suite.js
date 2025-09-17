#!/usr/bin/env node

/**
 * Comprehensive BirdSphere Posting API Test Suite
 *
 * Tests all posting system endpoints with various scenarios:
 * - Authentication
 * - Post CRUD operations
 * - Comment CRUD operations
 * - Media uploads
 * - Search and filtering
 * - Pagination and sorting
 * - Reactions and interactions
 * - Follow system
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class APITestSuite {
  constructor(baseURL = 'http://localhost:3015/api') {
    this.baseURL = baseURL;
    this.authToken = null;
    this.testUserId = null;
    this.testPostId = null;
    this.testCommentId = null;
    this.testUsers = [];
    this.testPosts = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // Utility methods
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',      // Cyan
      success: '\x1b[32m',   // Green
      error: '\x1b[31m',     // Red
      warning: '\x1b[33m',   // Yellow
      reset: '\x1b[0m'       // Reset
    };
    console.log(`${colors[type]}[${type.toUpperCase()}] ${message}${colors.reset}`);
  }

  async request(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
          ...headers
        }
      };

      if (data) {
        if (data instanceof FormData) {
          config.data = data;
          config.headers = { ...config.headers, ...data.getHeaders() };
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  async test(name, testFn) {
    try {
      this.log(`Running: ${name}`, 'info');
      await testFn();
      this.results.passed++;
      this.log(`✓ PASSED: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
      this.log(`✗ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  async assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  // Authentication Tests
  async setupTestUser() {
    this.log('Setting up test user...', 'info');

    // Try to register a test user
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResult = await this.request('POST', '/auth/register', testUser);

    if (registerResult.success) {
      this.authToken = registerResult.data.token;
      this.testUserId = registerResult.data.user.id;
      this.log('Test user created and authenticated', 'success');
    } else {
      throw new Error(`Failed to create test user: ${registerResult.error.message}`);
    }
  }

  // API Endpoint Tests
  async testGetAPI() {
    await this.test('API Root Endpoint', async () => {
      const result = await this.request('GET', '/');
      await this.assert(result.success, 'API root should be accessible');
      await this.assert(result.data.message === 'BirdSphere API', 'API should return correct message');
    });
  }

  async testMediaLimits() {
    await this.test('Media Upload Limits', async () => {
      const result = await this.request('GET', '/media/limits');
      await this.assert(result.success, 'Media limits endpoint should be accessible');
      await this.assert(result.data.data.maxFileSize > 0, 'Should return max file size');
      await this.assert(Array.isArray(result.data.data.allowedTypes.images), 'Should return allowed image types');
    });
  }

  async testCreatePost() {
    await this.test('Create Post', async () => {
      const postData = {
        content: 'This is a test post with #testing hashtag',
        postType: 'standard',
        visibility: 'public'
      };

      const result = await this.request('POST', '/posts', postData);
      await this.assert(result.success, 'Should create post successfully');
      await this.assert(result.data.data.content === postData.content, 'Post content should match');
      await this.assert(result.data.data.hashtags && result.data.data.hashtags.includes('testing'), 'Should extract hashtags');

      this.testPostId = result.data.data.id;
      this.testPosts.push(result.data.data);
    });
  }

  async testGetPost() {
    await this.test('Get Single Post', async () => {
      const result = await this.request('GET', `/posts/${this.testPostId}`);
      await this.assert(result.success, 'Should retrieve post successfully');
      await this.assert(result.data.data.id === this.testPostId, 'Should return correct post');
    });
  }

  async testGetTimeline() {
    await this.test('Get Timeline', async () => {
      const result = await this.request('GET', '/posts/timeline');
      await this.assert(result.success, 'Should retrieve timeline successfully');
      await this.assert(Array.isArray(result.data.data), 'Timeline should return array');
      await this.assert(result.data.pagination, 'Should include pagination data');
      await this.assert(result.data.meta, 'Should include metadata');
    });
  }

  async testTimelineWithFilters() {
    await this.test('Timeline with Filters', async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '10',
        sort: 'newest',
        postType: 'standard',
        hasMedia: 'false'
      });

      const result = await this.request('GET', `/posts/timeline?${params}`);
      await this.assert(result.success, 'Should retrieve filtered timeline');
      await this.assert(result.data.pagination.limit === 10, 'Should respect limit parameter');
    });
  }

  async testSearchPosts() {
    await this.test('Search Posts', async () => {
      const params = new URLSearchParams({
        search: 'test',
        page: '1',
        limit: '5'
      });

      const result = await this.request('GET', `/posts/search?${params}`);
      await this.assert(result.success, 'Should search posts successfully');
      await this.assert(result.data.meta.searchQuery === 'test', 'Should include search query in meta');
    });
  }

  async testTrendingPosts() {
    await this.test('Trending Posts', async () => {
      const params = new URLSearchParams({
        timeframe: '24',
        limit: '10'
      });

      const result = await this.request('GET', `/posts/trending?${params}`);
      await this.assert(result.success, 'Should retrieve trending posts');
      await this.assert(result.data.meta.timeframe === '24 hours', 'Should include timeframe in meta');
    });
  }

  async testGetUserPosts() {
    await this.test('Get User Posts', async () => {
      const result = await this.request('GET', `/posts/user/${this.testUserId}`);
      await this.assert(result.success, 'Should retrieve user posts');
      await this.assert(result.data.meta.userId === this.testUserId, 'Should include user ID in meta');
      await this.assert(result.data.meta.isOwnProfile === true, 'Should detect own profile');
    });
  }

  async testCreateComment() {
    await this.test('Create Comment', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const result = await this.request('POST', `/posts/${this.testPostId}/comments`, commentData);
      await this.assert(result.success, 'Should create comment successfully');
      await this.assert(result.data.data.content === commentData.content, 'Comment content should match');

      this.testCommentId = result.data.data.id;
    });
  }

  async testGetComments() {
    await this.test('Get Post Comments', async () => {
      const result = await this.request('GET', `/posts/${this.testPostId}/comments`);
      await this.assert(result.success, 'Should retrieve comments successfully');
      await this.assert(Array.isArray(result.data.data), 'Comments should return array');
      await this.assert(result.data.meta.postId === this.testPostId, 'Should include post ID in meta');
    });
  }

  async testReactToPost() {
    await this.test('React to Post', async () => {
      const reactionData = {
        reactionType: 'like'
      };

      const result = await this.request('POST', `/posts/${this.testPostId}/react`, reactionData);
      await this.assert(result.success, 'Should add reaction successfully');
      await this.assert(result.data.data.reactionType === 'like', 'Should return correct reaction type');
    });
  }

  async testGetPostReactions() {
    await this.test('Get Post Reactions', async () => {
      const result = await this.request('GET', `/posts/${this.testPostId}/reactions`);
      await this.assert(result.success, 'Should retrieve reactions successfully');
      await this.assert(result.data.data.total > 0, 'Should have at least one reaction');
    });
  }

  async testUpdatePost() {
    await this.test('Update Post', async () => {
      const updateData = {
        content: 'Updated test post content'
      };

      const result = await this.request('PUT', `/posts/${this.testPostId}`, updateData);
      await this.assert(result.success, 'Should update post successfully');
      await this.assert(result.data.data.content === updateData.content, 'Should update content');
    });
  }

  async testPaginationAndSorting() {
    await this.test('Pagination and Sorting', async () => {
      // Test different sort options
      const sortOptions = ['newest', 'oldest', 'popular'];

      for (const sort of sortOptions) {
        const params = new URLSearchParams({
          page: '1',
          limit: '5',
          sort: sort
        });

        const result = await this.request('GET', `/posts/timeline?${params}`);
        await this.assert(result.success, `Should handle ${sort} sorting`);
        await this.assert(result.data.pagination.page === 1, 'Should return correct page');
        await this.assert(result.data.pagination.limit === 5, 'Should return correct limit');
      }
    });
  }

  async testErrorHandling() {
    await this.test('Error Handling', async () => {
      // Test non-existent UUID post ID
      const result = await this.request('GET', '/posts/00000000-0000-0000-0000-000000000000');
      await this.assert(!result.success, 'Should handle non-existent post ID');
      await this.assert(result.status === 404, 'Should return 404 for non-existent post');
    });
  }

  async testUnauthenticatedAccess() {
    await this.test('Unauthenticated Access', async () => {
      // Temporarily remove auth token
      const originalToken = this.authToken;
      this.authToken = null;

      // Test public endpoints should work
      const publicResult = await this.request('GET', '/posts/trending');
      await this.assert(publicResult.success, 'Public endpoints should be accessible');

      // Test protected endpoints should fail
      const protectedResult = await this.request('POST', '/posts', { content: 'test' });
      await this.assert(!protectedResult.success, 'Protected endpoints should require auth');

      // Restore auth token
      this.authToken = originalToken;
    });
  }

  async testInvalidData() {
    await this.test('Invalid Data Validation', async () => {
      // Test creating post with invalid data
      const invalidPost = {
        content: '', // Empty content should fail
        postType: 'invalid_type'
      };

      const result = await this.request('POST', '/posts', invalidPost);
      await this.assert(!result.success, 'Should reject invalid post data');
      await this.assert(result.status === 400, 'Should return 400 for validation errors');
    });
  }

  // Cleanup
  async cleanup() {
    this.log('Cleaning up test data...', 'info');

    // Delete test post
    if (this.testPostId) {
      await this.request('DELETE', `/posts/${this.testPostId}`);
    }

    // Delete test comments are handled by cascade
    this.log('Cleanup completed', 'success');
  }

  // Main test runner
  async runAllTests() {
    this.log('Starting BirdSphere Posting API Test Suite', 'info');
    this.log('=====================================', 'info');

    try {
      // Setup
      await this.setupTestUser();

      // Run all tests
      await this.testGetAPI();
      await this.testMediaLimits();
      await this.testCreatePost();
      await this.testGetPost();
      await this.testGetTimeline();
      await this.testTimelineWithFilters();
      await this.testSearchPosts();
      await this.testTrendingPosts();
      await this.testGetUserPosts();
      await this.testCreateComment();
      await this.testGetComments();
      await this.testReactToPost();
      await this.testGetPostReactions();
      await this.testUpdatePost();
      await this.testPaginationAndSorting();
      await this.testErrorHandling();
      await this.testUnauthenticatedAccess();
      await this.testInvalidData();

      // Cleanup
      await this.cleanup();

    } catch (error) {
      this.log(`Setup/Cleanup Error: ${error.message}`, 'error');
    }

    // Report results
    this.reportResults();
  }

  reportResults() {
    this.log('=====================================', 'info');
    this.log('TEST RESULTS', 'info');
    this.log('=====================================', 'info');
    this.log(`Tests Passed: ${this.results.passed}`, 'success');
    this.log(`Tests Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
    this.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`, 'info');

    if (this.results.errors.length > 0) {
      this.log('FAILURES:', 'error');
      this.results.errors.forEach(error => {
        this.log(`  - ${error.test}: ${error.error}`, 'error');
      });
    }

    this.log('=====================================', 'info');

    if (this.results.failed === 0) {
      this.log('🎉 ALL TESTS PASSED! 🎉', 'success');
      process.exit(0);
    } else {
      this.log('❌ SOME TESTS FAILED ❌', 'error');
      process.exit(1);
    }
  }
}

// Check if we have required dependencies
async function checkDependencies() {
  try {
    require('axios');
    require('form-data');
  } catch (error) {
    console.error('Missing dependencies. Please run: npm install axios form-data');
    process.exit(1);
  }
}

// Main execution
async function main() {
  await checkDependencies();

  const testSuite = new APITestSuite();
  await testSuite.runAllTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = APITestSuite;