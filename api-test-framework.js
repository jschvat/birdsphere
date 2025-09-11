#!/usr/bin/env node

/**
 * BirdSphere API Comprehensive Testing Framework
 * Tests all endpoints and captures detailed JSON responses
 * Focus on authentication data flow analysis
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  },
  tests: {},
  authFlow: {
    registrationData: null,
    loginData: null,
    profileData: null,
    tokens: []
  }
};

// Global auth token storage
let authTokens = {
  userToken: null,
  testUser: null
};

// Test user data
const testUserData = {
  email: 'testuser@birdsphere.test',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser_' + Date.now(),
  phone: '+1234567890',
  bio: 'I am a test user for API testing',
  locationCity: 'Test City',
  locationState: 'Test State',
  locationCountry: 'Test Country',
  isBreeder: false
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    auth: '🔐',
    data: '📊'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const saveResults = () => {
  const fileName = `api-test-results-${Date.now()}.json`;
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, JSON.stringify(testResults, null, 2));
  log(`Test results saved to: ${fileName}`, 'success');
  return fileName;
};

const makeRequest = async (method, endpoint, data = null, headers = {}, isMultipart = false) => {
  const config = {
    method: method.toLowerCase(),
    url: endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`,
    headers: {
      ...headers
    },
    validateStatus: () => true // Don't throw on any status code
  };

  if (authTokens.userToken) {
    config.headers['Authorization'] = `Bearer ${authTokens.userToken}`;
  }

  if (data) {
    if (isMultipart) {
      config.data = data;
      // Let axios handle multipart headers
    } else {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers,
      config: {
        method: config.method,
        url: config.url,
        sentHeaders: config.headers,
        sentData: isMultipart ? '[FormData]' : data
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      config: {
        method: config.method,
        url: config.url,
        sentHeaders: config.headers,
        sentData: isMultipart ? '[FormData]' : data
      }
    };
  }
};

const runTest = async (testName, testFunction) => {
  log(`Running test: ${testName}`, 'info');
  testResults.summary.total++;
  
  try {
    const result = await testFunction();
    testResults.tests[testName] = {
      passed: true,
      result,
      timestamp: new Date().toISOString()
    };
    testResults.summary.passed++;
    log(`✅ ${testName}: PASSED`, 'success');
    return result;
  } catch (error) {
    testResults.tests[testName] = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    testResults.summary.failed++;
    testResults.summary.errors.push(`${testName}: ${error.message}`);
    log(`❌ ${testName}: FAILED - ${error.message}`, 'error');
    return null;
  }
};

// Test suites
const testHealthEndpoints = async () => {
  const tests = [
    ['GET /', () => makeRequest('GET', BASE_URL)],
    ['GET /health', () => makeRequest('GET', `${BASE_URL}/health`)],
    ['GET /api/', () => makeRequest('GET', '/')]
  ];

  const results = {};
  for (const [name, test] of tests) {
    results[name] = await runTest(name, test);
  }
  return results;
};

const testAuthenticationFlow = async () => {
  log('🔐 Starting comprehensive authentication flow test...', 'auth');
  
  // Step 1: Register new user
  const registration = await runTest('POST /api/auth/register', async () => {
    const result = await makeRequest('POST', '/auth/register', testUserData);
    
    if (result.success && result.status === 201) {
      testResults.authFlow.registrationData = result.data;
      if (result.data.token) {
        authTokens.userToken = result.data.token;
        testResults.authFlow.tokens.push({
          source: 'registration',
          token: result.data.token.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        });
      }
      if (result.data.user) {
        authTokens.testUser = result.data.user;
      }
      log(`🎉 User registered successfully: ${result.data.user?.email}`, 'auth');
      log(`📋 User data structure: ${JSON.stringify(result.data.user, null, 2)}`, 'data');
    }
    return result;
  });

  // Step 2: Login with same credentials
  const login = await runTest('POST /api/auth/login', async () => {
    const result = await makeRequest('POST', '/auth/login', {
      email: testUserData.email,
      password: testUserData.password
    });
    
    if (result.success && result.status === 200) {
      testResults.authFlow.loginData = result.data;
      if (result.data.token) {
        authTokens.userToken = result.data.token;
        testResults.authFlow.tokens.push({
          source: 'login',
          token: result.data.token.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        });
      }
      log(`🔑 Login successful for: ${result.data.user?.email}`, 'auth');
      log(`📊 Login user data: ${JSON.stringify(result.data.user, null, 2)}`, 'data');
      
      // Compare registration and login user data
      if (registration && registration.data && registration.data.user && result.data.user) {
        const regUser = registration.data.user;
        const loginUser = result.data.user;
        log(`🔍 Data comparison:`, 'data');
        log(`   Registration location: City=${regUser.locationCity}, State=${regUser.locationState}, Country=${regUser.locationCountry}`, 'data');
        log(`   Login location: City=${loginUser.locationCity}, State=${loginUser.locationState}, Country=${loginUser.locationCountry}`, 'data');
        log(`   Bio comparison: Reg="${regUser.bio}" vs Login="${loginUser.bio}"`, 'data');
      }
    }
    return result;
  });

  // Step 3: Get Profile
  const profile = await runTest('GET /api/auth/profile', async () => {
    const result = await makeRequest('GET', '/auth/profile');
    
    if (result.success && result.status === 200) {
      testResults.authFlow.profileData = result.data;
      log(`👤 Profile fetch successful`, 'auth');
      log(`📋 Profile data structure: ${JSON.stringify(result.data, null, 2)}`, 'data');
    }
    return result;
  });

  // Step 4: Update Profile with location data
  const profileUpdate = await runTest('PUT /api/auth/profile', async () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'TestUser',
      bio: 'Updated bio for testing',
      locationCity: 'Updated City',
      locationState: 'Updated State',
      locationCountry: 'Updated Country',
      phone: '+9876543210'
    };
    
    const result = await makeRequest('PUT', '/auth/profile', updateData);
    
    if (result.success && result.status === 200) {
      log(`✏️  Profile update successful`, 'auth');
      log(`📋 Updated profile data: ${JSON.stringify(result.data, null, 2)}`, 'data');
      
      // Update local test user data
      if (result.data.user) {
        authTokens.testUser = result.data.user;
      }
    }
    return result;
  });

  // Step 5: Get Profile Again (verify update persistence)
  const profileAfterUpdate = await runTest('GET /api/auth/profile (after update)', async () => {
    const result = await makeRequest('GET', '/auth/profile');
    
    if (result.success && result.status === 200) {
      log(`📋 Profile after update: ${JSON.stringify(result.data, null, 2)}`, 'data');
      
      // Check if updates persisted
      const userData = result.data.user || result.data;
      log(`🔍 Persistence check:`, 'data');
      log(`   Location: ${userData.locationCity}, ${userData.locationState}, ${userData.locationCountry}`, 'data');
      log(`   Bio: "${userData.bio}"`, 'data');
      log(`   Phone: ${userData.phone}`, 'data');
    }
    return result;
  });

  // Step 6: Simulate logout (clear token) and login again
  const originalToken = authTokens.userToken;
  authTokens.userToken = null;
  
  const reLogin = await runTest('POST /api/auth/login (re-login)', async () => {
    const result = await makeRequest('POST', '/auth/login', {
      email: testUserData.email,
      password: testUserData.password
    });
    
    if (result.success && result.status === 200) {
      authTokens.userToken = result.data.token;
      testResults.authFlow.tokens.push({
        source: 're-login',
        token: result.data.token.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      log(`🔄 Re-login successful`, 'auth');
      log(`📊 Re-login user data: ${JSON.stringify(result.data.user, null, 2)}`, 'data');
    }
    return result;
  });

  // Step 7: Final profile check
  const finalProfile = await runTest('GET /api/auth/profile (final check)', async () => {
    const result = await makeRequest('GET', '/auth/profile');
    
    if (result.success && result.status === 200) {
      log(`🏁 Final profile data: ${JSON.stringify(result.data, null, 2)}`, 'data');
      
      // Final data integrity check
      const userData = result.data.user || result.data;
      log(`🔍 Final integrity check:`, 'data');
      log(`   Location intact: ${userData.locationCity}, ${userData.locationState}, ${userData.locationCountry}`, 'data');
      log(`   Bio intact: "${userData.bio}"`, 'data');
      log(`   Profile image: "${userData.profileImage || 'none'}"`, 'data');
    }
    return result;
  });

  return {
    registration,
    login,
    profile,
    profileUpdate,
    profileAfterUpdate,
    reLogin,
    finalProfile
  };
};

const testAvatarUpload = async () => {
  // Create a simple test image buffer
  const createTestImage = () => {
    // Create a minimal PNG buffer (1x1 pixel black PNG)
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0xFF,
      0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
  };

  return await runTest('POST /api/upload/avatar', async () => {
    const form = new FormData();
    form.append('avatar', createTestImage(), {
      filename: 'test-avatar.png',
      contentType: 'image/png'
    });

    const result = await makeRequest('POST', '/upload/avatar', form, {
      ...form.getHeaders()
    }, true);

    if (result.success && result.status === 200) {
      log(`📸 Avatar upload successful`, 'success');
      log(`📋 Avatar response: ${JSON.stringify(result.data, null, 2)}`, 'data');
      
      // Test profile after avatar upload
      setTimeout(async () => {
        const profileCheck = await makeRequest('GET', '/auth/profile');
        if (profileCheck.success) {
          log(`👤 Profile after avatar upload: ${JSON.stringify(profileCheck.data, null, 2)}`, 'data');
        }
      }, 1000);
    }
    
    return result;
  });
};

const testPublicEndpoints = async () => {
  const tests = [
    ['GET /api/listings/', () => makeRequest('GET', '/listings/')],
    ['GET /api/listings/categories', () => makeRequest('GET', '/listings/categories')],
    ['GET /api/users/', () => makeRequest('GET', '/users/')],
    ['GET /api/location/search', () => makeRequest('GET', '/location/search?q=Test+City')],
    ['GET /api/chat/test', () => makeRequest('GET', '/chat/test')]
  ];

  const results = {};
  for (const [name, test] of tests) {
    results[name] = await runTest(name, test);
  }
  return results;
};

const analyzeFrontendAuthFlow = () => {
  log('🔍 Analyzing Authentication Data Flow Issues...', 'data');
  
  const { authFlow } = testResults;
  
  if (authFlow.registrationData && authFlow.loginData) {
    const regUser = authFlow.registrationData.user;
    const loginUser = authFlow.loginData.user;
    
    log('📊 CRITICAL ANALYSIS:', 'data');
    log('='.repeat(50), 'data');
    
    // Check field mapping consistency
    const fieldsToCheck = ['locationCity', 'locationState', 'locationCountry', 'bio', 'phone', 'profileImage'];
    
    fieldsToCheck.forEach(field => {
      const regValue = regUser?.[field];
      const loginValue = loginUser?.[field];
      
      if (regValue !== loginValue) {
        log(`⚠️  INCONSISTENCY DETECTED in ${field}:`, 'warning');
        log(`   Registration: "${regValue}"`, 'data');
        log(`   Login: "${loginValue}"`, 'data');
      } else {
        log(`✅ ${field}: Consistent across reg/login`, 'success');
      }
    });
    
    // Check token differences
    log(`🔑 Token Analysis:`, 'data');
    authFlow.tokens.forEach((token, index) => {
      log(`   ${index + 1}. ${token.source}: ${token.token} (${token.timestamp})`, 'data');
    });
  }
  
  log('='.repeat(50), 'data');
  log('🎯 RECOMMENDATIONS:', 'data');
  log('1. Check database field mappings in authController.js', 'data');
  log('2. Verify frontend localStorage token/user storage', 'data');
  log('3. Ensure consistent API response structure', 'data');
  log('4. Test browser refresh authentication state', 'data');
};

// Main execution
const main = async () => {
  log('🚀 Starting BirdSphere API Comprehensive Testing Framework', 'info');
  log('=' * 60, 'info');
  
  try {
    // Test server health
    await testHealthEndpoints();
    
    // Comprehensive authentication flow test
    await testAuthenticationFlow();
    
    // Avatar upload test (if authenticated)
    if (authTokens.userToken) {
      await testAvatarUpload();
    }
    
    // Test public endpoints
    await testPublicEndpoints();
    
    // Analysis
    analyzeFrontendAuthFlow();
    
  } catch (error) {
    log(`💥 Critical error during testing: ${error.message}`, 'error');
    testResults.summary.errors.push(`Critical: ${error.message}`);
  }
  
  // Final summary
  log('📊 TEST SUMMARY', 'info');
  log('=' * 30, 'info');
  log(`Total Tests: ${testResults.summary.total}`, 'info');
  log(`Passed: ${testResults.summary.passed}`, 'success');
  log(`Failed: ${testResults.summary.failed}`, testResults.summary.failed > 0 ? 'error' : 'success');
  
  if (testResults.summary.errors.length > 0) {
    log('❌ ERRORS:', 'error');
    testResults.summary.errors.forEach(error => {
      log(`   • ${error}`, 'error');
    });
  }
  
  // Save results
  const fileName = saveResults();
  log(`📄 Complete test results saved to: ${fileName}`, 'success');
  
  // Cleanup: Delete test user
  if (authTokens.userToken) {
    try {
      await makeRequest('DELETE', '/auth/account');
      log('🧹 Test user cleaned up successfully', 'info');
    } catch (error) {
      log(`⚠️  Could not clean up test user: ${error.message}`, 'warning');
    }
  }
};

// Handle graceful exit
process.on('SIGINT', () => {
  log('⚡ Test interrupted. Saving current results...', 'warning');
  saveResults();
  process.exit(0);
});

// Error handling
process.on('unhandledRejection', (error) => {
  log(`💥 Unhandled rejection: ${error.message}`, 'error');
  testResults.summary.errors.push(`Unhandled: ${error.message}`);
});

// Run if called directly
if (require.main === module) {
  main().then(() => {
    log('🎉 Testing framework completed successfully!', 'success');
    process.exit(0);
  }).catch((error) => {
    log(`💥 Framework failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  main,
  makeRequest,
  testResults,
  authTokens
};