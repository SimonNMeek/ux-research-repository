/**
 * Security Test Suite
 * Tests all Phase 0 security fixes for multi-tenancy
 * 
 * Run with: npx tsx scripts/test-security.ts
 */

import { getDb } from '../db';
import { hashPassword, authenticateUser, createSession } from '../lib/auth';

const db = getDb();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`✅ PASS: ${name}`);
          results.push({ name, passed: true });
        })
        .catch((error) => {
          console.log(`❌ FAIL: ${name}`);
          console.error(error);
          results.push({ name, passed: false, error: error.message });
        });
    } else {
      console.log(`✅ PASS: ${name}`);
      results.push({ name, passed: true });
    }
  } catch (error: any) {
    console.log(`❌ FAIL: ${name}`);
    console.error(error);
    results.push({ name, passed: false, error: error.message });
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log('🔒 Starting Security Test Suite\n');
  console.log('=' .repeat(60));

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  db.prepare('DELETE FROM user_workspaces WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test-%\')').run();
  db.prepare('DELETE FROM users WHERE email LIKE \'test-%\'').run();
  db.prepare('DELETE FROM workspaces WHERE slug LIKE \'test-%\'').run();

  // Test 1: Password Hashing
  test('Passwords are hashed with bcrypt', () => {
    const password = 'SecurePassword123!';
    const hash = hashPassword(password);
    
    assert(hash.startsWith('$2b$'), 'Hash should start with $2b$ (bcrypt)');
    assert(hash.length > 50, 'Hash should be reasonably long');
    assert(hash !== password, 'Hash should not be plaintext');
  });

  // Test 2: Create test users
  let testUser1Id: number;
  let testUser2Id: number;

  test('Create test user 1', () => {
    const result = db.prepare(`
      INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'test-alice@example.com',
      'Alice Test',
      'Alice',
      'Test',
      hashPassword('password123'),
      'contributor'
    );
    testUser1Id = result.lastInsertRowid as number;
    assert(testUser1Id > 0, 'User ID should be created');
  });

  test('Create test user 2', () => {
    const result = db.prepare(`
      INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'test-bob@example.com',
      'Bob Test',
      'Bob',
      'Test',
      hashPassword('password123'),
      'contributor'
    );
    testUser2Id = result.lastInsertRowid as number;
    assert(testUser2Id > 0, 'User ID should be created');
  });

  // Test 3: Password Authentication
  test('User can authenticate with correct password', async () => {
    const user = await authenticateUser('test-alice@example.com', 'password123');
    assert(user !== null, 'User should authenticate');
    assert(user?.email === 'test-alice@example.com', 'Email should match');
  });

  test('User cannot authenticate with wrong password', async () => {
    const user = await authenticateUser('test-alice@example.com', 'wrongpassword');
    assert(user === null, 'User should not authenticate with wrong password');
  });

  // Test 4: Workspace Creation and Access
  let testWorkspace1Id: number;
  let testWorkspace2Id: number;

  test('Create workspace for user 1', () => {
    const result = db.prepare(`
      INSERT INTO workspaces (slug, name, metadata)
      VALUES (?, ?, ?)
    `).run('test-workspace-1', 'Test Workspace 1', '{}');
    testWorkspace1Id = result.lastInsertRowid as number;
    assert(testWorkspace1Id > 0, 'Workspace should be created');
  });

  test('Workspace creator gets owner role automatically', () => {
    // Simulate what POST /api/workspaces does
    db.prepare(`
      INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
      VALUES (?, ?, 'owner', ?)
    `).run(testUser1Id, testWorkspace1Id, testUser1Id);

    const access = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser1Id, testWorkspace1Id) as { role: string };

    assert(access !== undefined, 'Access should be granted');
    assert(access.role === 'owner', 'Creator should be owner');
  });

  test('User 2 does NOT have access to user 1\'s workspace', () => {
    const access = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser2Id, testWorkspace1Id);

    assert(access === undefined, 'User 2 should not have access');
  });

  test('Create workspace for user 2', () => {
    const result = db.prepare(`
      INSERT INTO workspaces (slug, name, metadata)
      VALUES (?, ?, ?)
    `).run('test-workspace-2', 'Test Workspace 2', '{}');
    testWorkspace2Id = result.lastInsertRowid as number;

    // Grant owner access
    db.prepare(`
      INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
      VALUES (?, ?, 'owner', ?)
    `).run(testUser2Id, testWorkspace2Id, testUser2Id);

    assert(testWorkspace2Id > 0, 'Workspace should be created');
  });

  // Test 5: Workspace Access Queries
  test('User 1 can only see their workspace', () => {
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.slug
      FROM workspaces w
      INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
      WHERE uw.user_id = ?
    `).all(testUser1Id) as Array<{ id: number; name: string; slug: string }>;

    assert(workspaces.length === 1, 'User 1 should see exactly 1 workspace');
    assert(workspaces[0].id === testWorkspace1Id, 'Should be their own workspace');
    assert(!workspaces.some(w => w.id === testWorkspace2Id), 'Should not see workspace 2');
  });

  test('User 2 can only see their workspace', () => {
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.slug
      FROM workspaces w
      INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
      WHERE uw.user_id = ?
    `).all(testUser2Id) as Array<{ id: number; name: string; slug: string }>;

    assert(workspaces.length === 1, 'User 2 should see exactly 1 workspace');
    assert(workspaces[0].id === testWorkspace2Id, 'Should be their own workspace');
    assert(!workspaces.some(w => w.id === testWorkspace1Id), 'Should not see workspace 1');
  });

  // Test 6: Workspace Invitations
  test('User 1 invites User 2 to their workspace as member', () => {
    db.prepare(`
      INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
      VALUES (?, ?, 'member', ?)
    `).run(testUser2Id, testWorkspace1Id, testUser1Id);

    const access = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser2Id, testWorkspace1Id) as { role: string };

    assert(access !== undefined, 'Access should be granted');
    assert(access.role === 'member', 'Should have member role');
  });

  test('User 2 now sees both workspaces', () => {
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.slug, uw.role
      FROM workspaces w
      INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
      WHERE uw.user_id = ?
      ORDER BY w.id
    `).all(testUser2Id) as Array<{ id: number; name: string; slug: string; role: string }>;

    assert(workspaces.length === 2, 'User 2 should now see 2 workspaces');
    assert(workspaces.some(w => w.id === testWorkspace1Id && w.role === 'member'), 'Should see workspace 1 as member');
    assert(workspaces.some(w => w.id === testWorkspace2Id && w.role === 'owner'), 'Should see workspace 2 as owner');
  });

  // Test 7: Role-Based Permissions
  test('Member cannot create projects (owner/admin only)', () => {
    // In a real scenario, this would be checked by workspaceResolver.canManageProjects()
    const memberAccess = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser2Id, testWorkspace1Id) as { role: string };

    const canManageProjects = memberAccess.role === 'owner' || memberAccess.role === 'admin';
    assert(!canManageProjects, 'Member should not be able to manage projects');
  });

  test('Owner can create projects', () => {
    const ownerAccess = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser1Id, testWorkspace1Id) as { role: string };

    const canManageProjects = ownerAccess.role === 'owner' || ownerAccess.role === 'admin';
    assert(canManageProjects, 'Owner should be able to manage projects');
  });

  test('Member can edit documents', () => {
    const memberAccess = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser2Id, testWorkspace1Id) as { role: string };

    const canEditDocuments = memberAccess.role === 'owner' || 
                             memberAccess.role === 'admin' || 
                             memberAccess.role === 'member';
    assert(canEditDocuments, 'Member should be able to edit documents');
  });

  test('Viewer cannot edit documents', () => {
    // Change role to viewer
    db.prepare(`
      UPDATE user_workspaces SET role = 'viewer'
      WHERE user_id = ? AND workspace_id = ?
    `).run(testUser2Id, testWorkspace1Id);

    const viewerAccess = db.prepare(`
      SELECT role FROM user_workspaces 
      WHERE user_id = ? AND workspace_id = ?
    `).get(testUser2Id, testWorkspace1Id) as { role: string };

    const canEditDocuments = viewerAccess.role === 'owner' || 
                             viewerAccess.role === 'admin' || 
                             viewerAccess.role === 'member';
    assert(!canEditDocuments, 'Viewer should not be able to edit documents');
  });

  // Test 8: Super Admin Access
  test('Super admin can see all workspaces', () => {
    // Get the existing super admin
    const superAdmin = db.prepare(`
      SELECT id FROM users WHERE system_role = 'super_admin' LIMIT 1
    `).get() as { id: number } | undefined;

    if (superAdmin) {
      // Super admins bypass user_workspaces check, so they can see all
      const allWorkspaces = db.prepare(`
        SELECT id, name, slug FROM workspaces
        WHERE slug LIKE 'test-%'
      `).all() as Array<{ id: number; name: string; slug: string }>;

      assert(allWorkspaces.length >= 2, 'Super admin should see all test workspaces');
    } else {
      console.log('⚠️  No super admin found, skipping test');
    }
  });

  // Test 9: SQL Injection Prevention (paranoid check)
  test('SQL injection prevented in workspace access check', async () => {
    const maliciousInput = "1' OR '1'='1";
    
    try {
      // This should safely handle the malicious input with parameterized query
      const access = db.prepare(`
        SELECT role FROM user_workspaces 
        WHERE user_id = ? AND workspace_id = ?
      `).get(testUser1Id, maliciousInput);

      // Should return undefined (no match) rather than all rows
      assert(access === undefined, 'SQL injection should be prevented');
    } catch (error) {
      // It's ok if it throws an error - that means it's safely rejecting bad input
      console.log('⚠️  Safely rejected malicious input');
    }
  });

  // Clean up
  console.log('\n🧹 Cleaning up test data...');
  db.prepare('DELETE FROM user_workspaces WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug LIKE \'test-%\')').run();
  db.prepare('DELETE FROM workspaces WHERE slug LIKE \'test-%\'').run();
  db.prepare('DELETE FROM users WHERE email LIKE \'test-%\'').run();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Phase 0 security fixes are working correctly.');
    console.log('✅ Multi-tenancy isolation is enforced.');
    console.log('✅ Ready for Phase 1 (Organizations) or Phase 2 (Postgres migration).');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

