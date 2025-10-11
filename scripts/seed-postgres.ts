/**
 * Seed PostgreSQL Database with Initial Data
 */

import { getPostgresPool } from '../db/postgres';
import { hashPassword } from '../lib/auth';

async function seedDatabase() {
  const pool = getPostgresPool();
  
  try {
    console.log('🌱 Seeding PostgreSQL database...');

    // Check if we already have users
    const existingUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers.rows[0].count > 0) {
      console.log('✅ Database already has data, skipping seed');
      return;
    }

    // Create admin user
    const adminPasswordHash = hashPassword('admin123');
    const adminResult = await pool.query(`
      INSERT INTO users (email, name, first_name, last_name, password_hash, system_role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['admin@sol.com', 'Admin User', 'Admin', 'User', adminPasswordHash, 'super_admin', true]);

    const adminId = adminResult.rows[0].id;
    console.log(`✅ Created admin user (ID: ${adminId})`);

    // Create a demo organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (slug, name, billing_email, plan, max_workspaces, max_users, max_documents)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['sol-demo', 'SOL Demo Organization', 'admin@sol.com', 'free', 5, 10, 100]);

    const orgId = orgResult.rows[0].id;
    console.log(`✅ Created demo organization (ID: ${orgId})`);

    // Grant admin access to the organization
    await pool.query(`
      INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
      VALUES ($1, $2, $3, $4)
    `, [adminId, orgId, 'owner', adminId]);
    console.log('✅ Granted admin access to organization');

    // Create a demo workspace
    const workspaceResult = await pool.query(`
      INSERT INTO workspaces (slug, name, organization_id, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['demo-workspace', 'Demo Workspace', orgId, JSON.stringify({ description: 'Demo workspace for testing' })]);

    const workspaceId = workspaceResult.rows[0].id;
    console.log(`✅ Created demo workspace (ID: ${workspaceId})`);

    // Grant admin access to the workspace
    await pool.query(`
      INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
      VALUES ($1, $2, $3, $4)
    `, [adminId, workspaceId, 'owner', adminId]);
    console.log('✅ Granted admin access to workspace');

    // Create a demo project
    const projectResult = await pool.query(`
      INSERT INTO projects (slug, name, description, workspace_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['demo-project', 'Demo Project', 'A demo project for testing', workspaceId, JSON.stringify({ type: 'demo' })]);

    const projectId = projectResult.rows[0].id;
    console.log(`✅ Created demo project (ID: ${projectId})`);

    // Create some demo documents
    const documents = [
      {
        title: 'User Research Findings',
        body: 'This is a sample document containing user research findings. It demonstrates how the system handles document storage and retrieval.',
        project_id: projectId,
        is_favorite: true
      },
      {
        title: 'Product Requirements',
        body: 'Product requirements document outlining key features and functionality for the next release.',
        project_id: projectId,
        is_favorite: false
      },
      {
        title: 'Design System Guidelines',
        body: 'Comprehensive guidelines for maintaining consistency across the design system.',
        project_id: projectId,
        is_favorite: true
      }
    ];

    for (const doc of documents) {
      await pool.query(`
        INSERT INTO documents (title, body, project_id, is_favorite, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [doc.title, doc.body, doc.project_id, doc.is_favorite]);
    }
    console.log(`✅ Created ${documents.length} demo documents`);

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Email: admin@sol.com');
    console.log('   Password: admin123');
    console.log('\n🌐 Access your app at: https://ux-repo-50ua8jcc9-simonnmeeks-projects.vercel.app');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}
