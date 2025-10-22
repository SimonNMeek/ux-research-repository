const { execSync } = require('child_process');
const path = require('path');

// Use the existing scripts approach
const scriptPath = path.join(__dirname, 'scripts', 'test-db-connection.ts');

async function clearInvitations() {
  try {
    console.log('Clearing pending invitations for Sugar organization...');
    
    // Use a simple SQL approach via the existing database connection
    const sql = `
      -- Find Sugar organization
      SELECT id, name FROM organizations WHERE name LIKE '%sugar%' OR name LIKE '%Sugar%';
      
      -- Count pending invitations (replace ORG_ID with actual ID)
      SELECT COUNT(*) as count FROM invitations WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%sugar%' OR name LIKE '%Sugar%' LIMIT 1) AND status = 'pending';
      
      -- Delete pending invitations (replace ORG_ID with actual ID)
      DELETE FROM invitations WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%sugar%' OR name LIKE '%Sugar%' LIMIT 1) AND status = 'pending';
    `;
    
    console.log('Executing SQL to clear invitations...');
    
    // For now, let's use a direct approach with the database
    const { getDbAdapter, getDbType } = require('./db/adapter.ts');
    
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    console.log('Database type:', dbType);
    
    // Find Sugar organization
    let orgResult;
    if (dbType === 'postgres') {
      orgResult = await adapter.query('SELECT id, name FROM organizations WHERE name ILIKE $1', ['%sugar%']);
    } else {
      const orgStmt = adapter.prepare('SELECT id, name FROM organizations WHERE name LIKE ?');
      orgResult = { rows: orgStmt.all(['%sugar%']) };
    }
    
    if (orgResult.rows.length === 0) {
      console.log('No Sugar organization found');
      return;
    }
    
    const org = orgResult.rows[0];
    console.log('Found organization:', org.name, '(ID:', org.id + ')');
    
    // Count and delete pending invitations
    if (dbType === 'postgres') {
      const countResult = await adapter.query(
        'SELECT COUNT(*) as count FROM invitations WHERE organization_id = $1 AND status = $2',
        [org.id, 'pending']
      );
      const currentCount = countResult.rows[0].count;
      console.log('Current pending invitations:', currentCount);
      
      if (currentCount > 0) {
        const deleteResult = await adapter.query(
          'DELETE FROM invitations WHERE organization_id = $1 AND status = $2',
          [org.id, 'pending']
        );
        console.log('Deleted', deleteResult.rowCount, 'pending invitations');
      }
    } else {
      const countStmt = adapter.prepare('SELECT COUNT(*) as count FROM invitations WHERE organization_id = ? AND status = ?');
      const countResult = countStmt.get([org.id, 'pending']);
      console.log('Current pending invitations:', countResult.count);
      
      if (countResult.count > 0) {
        const deleteStmt = adapter.prepare('DELETE FROM invitations WHERE organization_id = ? AND status = ?');
        const deleteResult = deleteStmt.run([org.id, 'pending']);
        console.log('Deleted', deleteResult.changes, 'pending invitations');
      }
    }
    
    console.log('✅ Invitations cleared successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

clearInvitations();
