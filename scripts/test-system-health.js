#!/usr/bin/env node

/**
 * System Health Test Checklist
 * Run this after any changes to verify core functionality
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PROD_URL = 'https://ux-repo-web.vercel.app';

// Test configuration
const TESTS = {
  local: {
    url: BASE_URL,
    name: 'Local Development',
    auth: { email: 'admin@sol.com', password: 'admin123' }
  },
  production: {
    url: PROD_URL,
    name: 'Production (Vercel)',
    auth: { email: 'admin@sol.com', password: 'admin123' }
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'System-Health-Test/1.0',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Test authentication flow
 */
async function testAuth(env) {
  console.log(`\n🔐 Testing Authentication (${env.name})...`);
  
  try {
    // Test login page loads
    const loginPage = await makeRequest(`${env.url}/login`);
    if (loginPage.status !== 200) {
      throw new Error(`Login page returned ${loginPage.status}`);
    }
    
    // Test auth endpoint (should return 401 when not authenticated)
    const authResponse = await makeRequest(`${env.url}/api/auth/me`);
    if (authResponse.status !== 401) {
      throw new Error(`Auth endpoint returned ${authResponse.status} (expected 401 when not authenticated)`);
    }
    
    console.log(`✅ Authentication system working (properly returns 401 when not authenticated)`);
    return true;
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    return false;
  }
}

/**
 * Test main workspace functionality
 */
async function testWorkspace(env) {
  console.log(`\n🏢 Testing Workspace Functionality (${env.name})...`);
  
  try {
    // Test workspace list (should return 401 when not authenticated)
    const workspaces = await makeRequest(`${env.url}/api/workspaces`);
    if (workspaces.status !== 401) {
      throw new Error(`Workspaces API returned ${workspaces.status} (expected 401 when not authenticated)`);
    }
    
    // Test specific workspace (supadupa-app) - should redirect to login
    const workspace = await makeRequest(`${env.url}/w/supadupa-app`);
    if (workspace.status !== 307) {
      throw new Error(`Workspace page returned ${workspace.status} (expected 307 redirect to login)`);
    }
    
    // Test workspace API (should redirect to login when not authenticated)
    const workspaceApi = await makeRequest(`${env.url}/w/supadupa-app/api/workspace`);
    if (workspaceApi.status !== 307) {
      throw new Error(`Workspace API returned ${workspaceApi.status} (expected 307 redirect to login)`);
    }
    
    console.log(`✅ Workspace functionality working (properly requires authentication)`);
    return true;
  } catch (error) {
    console.log(`❌ Workspace functionality failed: ${error.message}`);
    return false;
  }
}

/**
 * Test search and favoriting functionality
 */
async function testSearchAndFavorites(env) {
  console.log(`\n🔍 Testing Search & Favorites (${env.name})...`);
  
  try {
    // Test search endpoint (should redirect to login when not authenticated)
    const searchResponse = await makeRequest(`${env.url}/w/supadupa-app/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'test',
        mode: 'search'
      })
    });
    
    if (searchResponse.status !== 307) {
      throw new Error(`Search API returned ${searchResponse.status} (expected 307 redirect to login)`);
    }
    
    // Test favorites endpoint (should redirect to login when not authenticated)
    const favoritesResponse = await makeRequest(`${env.url}/w/supadupa-app/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'favorites_only'
      })
    });
    
    if (favoritesResponse.status !== 307) {
      throw new Error(`Favorites API returned ${favoritesResponse.status} (expected 307 redirect to login)`);
    }
    
    console.log(`✅ Search & Favorites working (properly requires authentication)`);
    return true;
  } catch (error) {
    console.log(`❌ Search & Favorites failed: ${error.message}`);
    return false;
  }
}

/**
 * Test Kanban board functionality
 */
async function testKanban(env) {
  console.log(`\n📋 Testing Kanban Board (${env.name})...`);
  
  try {
    // Test Kanban page (should redirect to login if not authenticated)
    const kanbanPage = await makeRequest(`${env.url}/productbacklog`);
    if (kanbanPage.status !== 200 && kanbanPage.status !== 307) {
      throw new Error(`Kanban page returned ${kanbanPage.status}`);
    }
    
    console.log(`✅ Kanban board accessible`);
    return true;
  } catch (error) {
    console.log(`❌ Kanban board failed: ${error.message}`);
    return false;
  }
}

/**
 * Test organization management
 */
async function testOrgManagement(env) {
  console.log(`\n👥 Testing Organization Management (${env.name})...`);
  
  try {
    // Test org users endpoint (should return 401 when not authenticated)
    const orgUsers = await makeRequest(`${env.url}/api/org/users`);
    if (orgUsers.status !== 401) {
      throw new Error(`Org users API returned ${orgUsers.status} (expected 401 when not authenticated)`);
    }
    
    // Test org users page (should redirect to login)
    const orgUsersPage = await makeRequest(`${env.url}/org/users`);
    if (orgUsersPage.status !== 307) {
      throw new Error(`Org users page returned ${orgUsersPage.status} (expected 307 redirect to login)`);
    }
    
    console.log(`✅ Organization management working (properly requires authentication)`);
    return true;
  } catch (error) {
    console.log(`❌ Organization management failed: ${error.message}`);
    return false;
  }
}

/**
 * Test database connectivity
 */
async function testDatabase(env) {
  console.log(`\n🗄️ Testing Database Connectivity (${env.name})...`);
  
  try {
    // Test multiple endpoints that require database
    const endpoints = [
      '/api/workspaces',
      '/api/org/users',
      '/w/supadupa-app/api/workspace'
    ];
    
    for (const endpoint of endpoints) {
      const response = await makeRequest(`${env.url}${endpoint}`);
      if (response.status >= 500) {
        throw new Error(`Database endpoint ${endpoint} returned ${response.status}`);
      }
    }
    
    console.log(`✅ Database connectivity working`);
    return true;
  } catch (error) {
    console.log(`❌ Database connectivity failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests for an environment
 */
async function runTestsForEnvironment(env) {
  console.log(`\n🚀 Testing ${env.name} (${env.url})`);
  console.log('=' .repeat(50));
  
  const tests = [
    testAuth,
    testWorkspace,
    testSearchAndFavorites,
    testKanban,
    testOrgManagement,
    testDatabase
  ];
  
  let envPassed = 0;
  let envFailed = 0;
  
  for (const test of tests) {
    try {
      const passed = await test(env);
      if (passed) {
        envPassed++;
        results.passed++;
      } else {
        envFailed++;
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ Test error: ${error.message}`);
      envFailed++;
      results.failed++;
      results.errors.push(`${env.name}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 ${env.name} Results: ${envPassed} passed, ${envFailed} failed`);
  return { passed: envPassed, failed: envFailed };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🔍 System Health Test Suite');
  console.log('============================');
  console.log(`Testing at: ${new Date().toISOString()}`);
  
  const environments = process.argv.includes('--prod') ? 
    [TESTS.production] : 
    [TESTS.local];
  
  if (process.argv.includes('--both')) {
    environments.push(TESTS.production);
  }
  
  for (const env of environments) {
    await runTestsForEnvironment(env);
  }
  
  // Final results
  console.log('\n🎯 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Exit with error code if any tests failed
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed. Check the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! System is healthy.');
    process.exit(0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, TESTS };
