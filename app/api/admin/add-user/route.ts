import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    // Check if user already exists
    let existingUser;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id FROM users WHERE email = $1', ['tonyjames@mail.com']);
      existingUser = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT id FROM users WHERE email = ?');
      existingUser = stmt.get(['tonyjames@mail.com']);
    }
    
    if (existingUser) {
      // Update existing user to super_admin
      if (dbType === 'postgres') {
        await adapter.query('UPDATE users SET system_role = $1 WHERE email = $2', ['super_admin', 'tonyjames@mail.com']);
      } else {
        const stmt = adapter.prepare('UPDATE users SET system_role = ? WHERE email = ?');
        stmt.run(['super_admin', 'tonyjames@mail.com']);
      }
    } else {
      // Create new user
      const hashedPassword = hashPassword('password123');
      
      if (dbType === 'postgres') {
        await adapter.query(
          `INSERT INTO users (email, first_name, last_name, name, password_hash, is_active, system_role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['tonyjames@mail.com', 'Tony', 'James', 'Tony James', hashedPassword, true, 'super_admin']
        );
      } else {
        const stmt = adapter.prepare(
          `INSERT INTO users (email, first_name, last_name, name, password_hash, is_active, system_role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        stmt.run(['tonyjames@mail.com', 'Tony', 'James', 'Tony James', hashedPassword, true, 'super_admin']);
      }
    }
    
    // Get user ID
    let userId;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id FROM users WHERE email = $1', ['tonyjames@mail.com']);
      userId = result.rows[0].id;
    } else {
      const stmt = adapter.prepare('SELECT id FROM users WHERE email = ?');
      const user = stmt.get(['tonyjames@mail.com']);
      userId = user.id;
    }
    
    // Add workspace permissions
    let workspaces;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id FROM workspaces');
      workspaces = result.rows;
    } else {
      const stmt = adapter.prepare('SELECT id FROM workspaces');
      workspaces = stmt.all();
    }
    
    for (const workspace of workspaces) {
      // Check if permission already exists
      let existing;
      if (dbType === 'postgres') {
        const result = await adapter.query(
          'SELECT id FROM user_workspaces WHERE user_id = $1 AND workspace_id = $2',
          [userId, workspace.id]
        );
        existing = result.rows[0];
      } else {
        const stmt = adapter.prepare('SELECT id FROM user_workspaces WHERE user_id = ? AND workspace_id = ?');
        existing = stmt.get([userId, workspace.id]);
      }
      
      if (!existing) {
        if (dbType === 'postgres') {
          await adapter.query(
            'INSERT INTO user_workspaces (user_id, workspace_id, role, granted_at) VALUES ($1, $2, $3, NOW())',
            [userId, workspace.id, 'owner']
          );
        } else {
          const stmt = adapter.prepare('INSERT INTO user_workspaces (user_id, workspace_id, role, granted_at) VALUES (?, ?, ?, datetime("now"))');
          stmt.run([userId, workspace.id, 'owner']);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User added successfully',
      credentials: {
        email: 'tonyjames@mail.com',
        password: 'password123'
      }
    });
    
  } catch (error: any) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
