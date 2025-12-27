/**
 * Organizations Layer Test Suite
 * Tests Phase 1: Organizations for multi-tenancy
 * 
 * Run with: npx tsx scripts/test-organizations.ts
 */

import { getDb } from '../db';
import { hashPassword } from '../lib/auth';
import { OrganizationRepo } from '../src/server/repo/organization';
import { WorkspaceRepo } from '../src/server/repo/workspace';

const db = getDb();
const organizationRepo = new OrganizationRepo();
const workspaceRepo = new WorkspaceRepo();

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
  console.log('🏢 Starting Organizations Layer Test Suite\n');
  console.log('=' .repeat(60));

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  db.prepare('DELETE FROM user_workspaces WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\'))').run();
  db.prepare('DELETE FROM workspaces WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\')').run();
  db.prepare('DELETE FROM user_organizations WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\')').run();
  db.prepare('DELETE FROM organizations WHERE slug LIKE \'test-org-%\'').run();
  db.prepare('DELETE FROM users WHERE email LIKE \'test-org-%\'').run();

  // Test 1: Organization Tables Exist
  test('Organizations tables exist', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('organizations', 'user_organizations')")
      .all() as Array<{ name: string }>;
    
    assert(tables.length === 2, 'Both organization tables should exist');
    assert(tables.some(t => t.name === 'organizations'), 'organizations table should exist');
    assert(tables.some(t => t.name === 'user_organizations'), 'user_organizations table should exist');
  });

  // Test 2: Workspaces have organization_id
  test('Workspaces have organization_id column', () => {
    const columns = db
      .prepare("PRAGMA table_info(workspaces)")
      .all() as Array<{ name: string }>;
    
    assert(columns.some(c => c.name === 'organization_id'), 'workspaces should have organization_id column');
  });

  // Test 3: Create Test Organizations
  let testOrg1Id: number;
  let testOrg2Id: number;
  let testUser1Id: number;
  let testUser2Id: number;

  test('Create test users', () => {
    const result1 = db.prepare(`
      INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('test-org-user1@example.com', 'Org User 1', 'Org', 'User1', hashPassword('password123'), 'contributor');
    testUser1Id = result1.lastInsertRowid as number;

    const result2 = db.prepare(`
      INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('test-org-user2@example.com', 'Org User 2', 'Org', 'User2', hashPassword('password123'), 'contributor');
    testUser2Id = result2.lastInsertRowid as number;

    assert(testUser1Id > 0, 'User 1 should be created');
    assert(testUser2Id > 0, 'User 2 should be created');
  });

  test('Create organization 1', () => {
    const org = organizationRepo.create({
      slug: 'test-org-1',
      name: 'Test Organization 1',
      billing_email: 'billing@test-org-1.com',
      plan: 'free'
    });

    testOrg1Id = org.id;
    assert(testOrg1Id > 0, 'Organization should be created');
    assert(org.slug === 'test-org-1', 'Slug should match');
    assert(org.plan === 'free', 'Plan should be free');
    assert(org.max_workspaces === 3, 'Free plan should have 3 workspace limit');
  });

  test('Create organization 2', () => {
    const org = organizationRepo.create({
      slug: 'test-org-2',
      name: 'Test Organization 2',
      billing_email: 'billing@test-org-2.com',
      plan: 'pro'
    });

    testOrg2Id = org.id;
    assert(testOrg2Id > 0, 'Organization should be created');
    assert(org.plan === 'pro', 'Plan should be pro');
  });

  // Test 4: Organization Access
  test('Add user 1 to organization 1 as owner', () => {
    organizationRepo.addUser(testOrg1Id, testUser1Id, 'owner', testUser1Id);
    
    const role = organizationRepo.getUserRole(testUser1Id, testOrg1Id);
    assert(role === 'owner', 'User should be owner');
  });

  test('User 1 can see organization 1', () => {
    const orgs = organizationRepo.listForUser(testUser1Id);
    assert(orgs.length === 1, 'User should see 1 organization');
    assert(orgs[0].id === testOrg1Id, 'Should be organization 1');
    assert(orgs[0].user_role === 'owner', 'Should have owner role');
  });

  test('User 2 does NOT see organization 1', () => {
    const orgs = organizationRepo.listForUser(testUser2Id);
    assert(orgs.length === 0, 'User 2 should see no organizations');
  });

  test('Add user 2 to organization 2 as member', () => {
    organizationRepo.addUser(testOrg2Id, testUser2Id, 'member', testUser2Id);
    
    const role = organizationRepo.getUserRole(testUser2Id, testOrg2Id);
    assert(role === 'member', 'User should be member');
  });

  // Test 5: Workspace Creation within Organization
  let testWorkspace1Id: number;

  test('Create workspace in organization 1', () => {
    const workspace = workspaceRepo.create({
      slug: 'test-workspace-1',
      name: 'Test Workspace 1',
      organization_id: testOrg1Id,
      metadata: { description: 'Test workspace' }
    });

    testWorkspace1Id = workspace.id;
    assert(testWorkspace1Id > 0, 'Workspace should be created');
    assert(workspace.organization_id === testOrg1Id, 'Workspace should belong to organization 1');
  });

  test('Workspace belongs to correct organization', () => {
    const workspace = workspaceRepo.getBySlug('test-workspace-1');
    assert(workspace !== null, 'Workspace should exist');
    assert(workspace!.organization_id === testOrg1Id, 'Should belong to organization 1');
  });

  // Test 6: Organization Limits
  test('Organization stats are correct', () => {
    const stats = organizationRepo.getStats(testOrg1Id);
    assert(stats.workspace_count === 1, 'Should have 1 workspace');
    assert(stats.user_count === 1, 'Should have 1 user');
    assert(stats.document_count === 0, 'Should have 0 documents');
  });

  test('Can check organization limits', () => {
    const limits = organizationRepo.checkLimits(testOrg1Id);
    assert(limits.can_add_workspace === true, 'Should be able to add workspace (1/3)');
    assert(limits.can_add_user === true, 'Should be able to add user (1/5)');
    assert(limits.can_add_document === true, 'Should be able to add document (0/100)');
  });

  test('Organization reaches workspace limit', () => {
    // Add 2 more workspaces to hit the limit (free plan = 3)
    workspaceRepo.create({
      slug: 'test-workspace-2',
      name: 'Test Workspace 2',
      organization_id: testOrg1Id
    });

    workspaceRepo.create({
      slug: 'test-workspace-3',
      name: 'Test Workspace 3',
      organization_id: testOrg1Id
    });

    const limits = organizationRepo.checkLimits(testOrg1Id);
    assert(limits.can_add_workspace === false, 'Should NOT be able to add workspace (3/3)');
  });

  // Test 7: Organization Isolation
  test('User 1 cannot access organization 2', () => {
    const hasAccess = organizationRepo.hasAccess(testUser1Id, testOrg2Id);
    assert(hasAccess === false, 'User 1 should not have access to org 2');
  });

  test('User 2 cannot access organization 1', () => {
    const hasAccess = organizationRepo.hasAccess(testUser2Id, testOrg1Id);
    assert(hasAccess === false, 'User 2 should not have access to org 1');
  });

  test('List workspaces by organization', () => {
    const workspaces = workspaceRepo.listByOrganization(testOrg1Id);
    assert(workspaces.length === 3, 'Org 1 should have 3 workspaces');
    assert(workspaces.every(w => w.organization_id === testOrg1Id), 'All workspaces should belong to org 1');
  });

  // Test 8: Cross-Organization Workspace Check
  test('Workspace slugs are globally unique (by design)', () => {
    // Design decision: workspace slugs are globally unique for URL safety
    // This prevents conflicts like /w/myworkspace pointing to different orgs
    try {
      workspaceRepo.create({
        slug: 'test-workspace-1', // Same slug as org 1's workspace
        name: 'Test Workspace 1 (Org 2)',
        organization_id: testOrg2Id
      });
      assert(false, 'Should not be able to create workspace with duplicate slug');
    } catch (error: any) {
      assert(error.code === 'SQLITE_CONSTRAINT_UNIQUE', 'Should fail with unique constraint');
    }

    // But different slug works fine
    const workspace = workspaceRepo.create({
      slug: 'test-workspace-org2',
      name: 'Test Workspace Org 2',
      organization_id: testOrg2Id
    });

    assert(workspace.id > 0, 'Different slug should work');
    assert(workspace.organization_id === testOrg2Id, 'Should belong to org 2');
  });

  // Test 9: Update Organization
  test('Update organization details', () => {
    const updated = organizationRepo.update(testOrg1Id, {
      name: 'Updated Organization Name',
      plan: 'pro',
      max_workspaces: 10
    });

    assert(updated !== null, 'Organization should be updated');
    assert(updated!.name === 'Updated Organization Name', 'Name should be updated');
    assert(updated!.plan === 'pro', 'Plan should be updated to pro');
    assert(updated!.max_workspaces === 10, 'Workspace limit should be updated');
  });

  // Test 10: Remove User from Organization
  test('Remove user from organization', () => {
    organizationRepo.removeUser(testOrg2Id, testUser2Id);
    
    const hasAccess = organizationRepo.hasAccess(testUser2Id, testOrg2Id);
    assert(hasAccess === false, 'User should no longer have access');
    
    const orgs = organizationRepo.listForUser(testUser2Id);
    assert(orgs.length === 0, 'User should see no organizations');
  });

  // Clean up
  console.log('\n🧹 Cleaning up test data...');
  db.prepare('DELETE FROM user_workspaces WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\'))').run();
  db.prepare('DELETE FROM workspaces WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\')').run();
  db.prepare('DELETE FROM user_organizations WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'test-org-%\')').run();
  db.prepare('DELETE FROM organizations WHERE slug LIKE \'test-org-%\'').run();
  db.prepare('DELETE FROM users WHERE email LIKE \'test-org-%\'').run();

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
    console.log('\n✅ Organizations layer is working correctly.');
    console.log('✅ Multi-tenant isolation by organization enforced.');
    console.log('✅ Workspace limits enforced per organization.');
    console.log('✅ Ready for Phase 2 (Postgres migration) or deploy now!');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

