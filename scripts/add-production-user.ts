#!/usr/bin/env tsx

/**
 * Add Tony James user to production PostgreSQL database
 */

import { getDbAdapter, getDbType } from '../db/adapter';
import { hashPassword } from '../lib/auth';

async function addProductionUser() {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  console.log(`Database type: ${dbType}`);
  
  if (dbType !== 'postgres') {
    console.log('This script is for PostgreSQL production database only');
    process.exit(1);
  }
  
  try {
    // Check if user already exists
    const existingUser = await adapter.query(
      'SELECT id FROM users WHERE email = $1',
      ['tonyjames@mail.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('User already exists, updating role to super_admin');
      await adapter.query(
        'UPDATE users SET system_role = $1 WHERE email = $2',
        ['super_admin', 'tonyjames@mail.com']
      );
    } else {
      console.log('Creating new user');
      const hashedPassword = hashPassword('password123');
      
      await adapter.query(
        `INSERT INTO users (email, first_name, last_name, name, password_hash, is_active, system_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['tonyjames@mail.com', 'Tony', 'James', 'Tony James', hashedPassword, true, 'super_admin']
      );
    }
    
    // Add workspace permissions
    const userResult = await adapter.query('SELECT id FROM users WHERE email = $1', ['tonyjames@mail.com']);
    const userId = userResult.rows[0].id;
    
    // Get workspace IDs
    const workspaces = await adapter.query('SELECT id FROM workspaces');
    
    for (const workspace of workspaces.rows) {
      // Check if permission already exists
      const existing = await adapter.query(
        'SELECT id FROM user_workspaces WHERE user_id = $1 AND workspace_id = $2',
        [userId, workspace.id]
      );
      
      if (existing.rows.length === 0) {
        await adapter.query(
          'INSERT INTO user_workspaces (user_id, workspace_id, role, granted_at) VALUES ($1, $2, $3, NOW())',
          [userId, workspace.id, 'owner']
        );
        console.log(`Added workspace ${workspace.id} permission`);
      }
    }
    
    console.log('✅ User setup complete!');
    console.log('Email: tonyjames@mail.com');
    console.log('Password: password123');
    console.log('Role: super_admin');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addProductionUser();
