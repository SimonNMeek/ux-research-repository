const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function backupSugarData() {
  try {
    console.log('🔍 Checking Sugar org data in production...');
    
    // Check Sugar organization
    const orgResult = await pool.query("SELECT * FROM organizations WHERE slug = 'sugar-llp' OR name ILIKE '%sugar%'");
    console.log('Sugar organizations:', orgResult.rows);
    
    if (orgResult.rows.length > 0) {
      const org = orgResult.rows[0];
      console.log('📊 Found Sugar org:', org.name, '(ID:', org.id, ')');
      
      // Check workspaces
      const workspacesResult = await pool.query('SELECT * FROM workspaces WHERE organization_id = $1', [org.id]);
      console.log('📁 Sugar workspaces (' + workspacesResult.rows.length + '):');
      workspacesResult.rows.forEach(w => console.log('  -', w.name, '(' + w.slug + ')'));
      
      // Check projects
      const projectsResult = await pool.query(`
        SELECT p.*, w.name as workspace_name 
        FROM projects p 
        JOIN workspaces w ON p.workspace_id = w.id 
        WHERE w.organization_id = $1
      `, [org.id]);
      console.log('📋 Sugar projects (' + projectsResult.rows.length + '):');
      projectsResult.rows.forEach(p => console.log('  -', p.name, 'in', p.workspace_name));
      
      // Check documents
      const docsResult = await pool.query(`
        SELECT d.*, p.name as project_name, w.name as workspace_name
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        WHERE w.organization_id = $1
      `, [org.id]);
      console.log('📄 Sugar documents (' + docsResult.rows.length + '):');
      docsResult.rows.forEach(d => console.log('  -', d.title, 'in', d.project_name));
      
      // Check users
      const usersResult = await pool.query(`
        SELECT u.*, uo.role
        FROM users u
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = $1
      `, [org.id]);
      console.log('👥 Sugar users (' + usersResult.rows.length + '):');
      usersResult.rows.forEach(u => console.log('  -', u.name, '(' + u.email + ') -', u.role));
      
      // Create backup SQL
      console.log('\n💾 Creating backup SQL...');
      let backupSQL = '-- Sugar Organization Data Backup\n';
      backupSQL += '-- Generated on: ' + new Date().toISOString() + '\n\n';
      
      // Organization
      backupSQL += '-- Organization\n';
      backupSQL += `INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${org.id}, '${org.name}', '${org.slug}', '${org.created_at}', '${org.updated_at}');\n\n`;
      
      // Workspaces
      if (workspacesResult.rows.length > 0) {
        backupSQL += '-- Workspaces\n';
        workspacesResult.rows.forEach(w => {
          backupSQL += `INSERT INTO workspaces (id, name, slug, organization_id, created_at, updated_at) VALUES (${w.id}, '${w.name}', '${w.slug}', ${w.organization_id}, '${w.created_at}', '${w.updated_at}');\n`;
        });
        backupSQL += '\n';
      }
      
      // Projects
      if (projectsResult.rows.length > 0) {
        backupSQL += '-- Projects\n';
        projectsResult.rows.forEach(p => {
          backupSQL += `INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (${p.id}, '${p.name}', '${p.slug}', ${p.workspace_id}, '${p.created_at}', '${p.updated_at}');\n`;
        });
        backupSQL += '\n';
      }
      
      // Documents
      if (docsResult.rows.length > 0) {
        backupSQL += '-- Documents\n';
        docsResult.rows.forEach(d => {
          backupSQL += `INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (${d.id}, '${d.title}', '${d.content}', ${d.project_id}, '${d.created_at}', '${d.updated_at}');\n`;
        });
        backupSQL += '\n';
      }
      
      // Users
      if (usersResult.rows.length > 0) {
        backupSQL += '-- Users\n';
        usersResult.rows.forEach(u => {
          backupSQL += `INSERT INTO users (id, name, email, created_at, updated_at) VALUES (${u.id}, '${u.name}', '${u.email}', '${u.created_at}', '${u.updated_at}');\n`;
        });
        backupSQL += '\n';
        
        backupSQL += '-- User Organizations\n';
        usersResult.rows.forEach(u => {
          backupSQL += `INSERT INTO user_organizations (user_id, organization_id, role, created_at) VALUES (${u.id}, ${org.id}, '${u.role}', '${u.created_at}');\n`;
        });
      }
      
      // Write backup file
      const fs = require('fs');
      fs.writeFileSync('sugar-data-backup.sql', backupSQL);
      console.log('✅ Backup saved to sugar-data-backup.sql');
      
    } else {
      console.log('❌ No Sugar organization found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

backupSugarData();
