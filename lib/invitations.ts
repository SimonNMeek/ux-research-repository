import { getDbAdapter, getDbType } from '@/db/adapter';
import { randomBytes } from 'crypto';

export interface Invitation {
  id: number;
  email: string;
  organization_id: number;
  invited_by: number;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export async function createInvitation(data: {
  email: string;
  organizationId: number;
  invitedBy: number;
  role: string;
}): Promise<{ success: boolean; invitation?: Invitation; error?: string }> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    let invitation;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `INSERT INTO invitations (email, organization_id, invited_by, role, token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.email, data.organizationId, data.invitedBy, data.role, token, expiresAt.toISOString()]
      );
      invitation = result.rows[0];
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO invitations (email, organization_id, invited_by, role, token, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      stmt.run([data.email, data.organizationId, data.invitedBy, data.role, token, expiresAt.toISOString()]);
      
      // Get the created invitation
      const getStmt = adapter.prepare('SELECT * FROM invitations WHERE token = ?');
      invitation = getStmt.get([token]);
    }

    return { success: true, invitation };
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    let invitation;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        'SELECT * FROM invitations WHERE token = $1 AND status = $2',
        [token, 'pending']
      );
      invitation = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT * FROM invitations WHERE token = ? AND status = ?');
      invitation = stmt.get([token, 'pending']);
    }

    if (!invitation) return null;

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (now > expiresAt) {
      // Mark as expired
      await markInvitationAsExpired(token);
      return null;
    }

    return invitation;
  } catch (error) {
    console.error('Failed to get invitation:', error);
    return null;
  }
}

export async function markInvitationAsAccepted(token: string): Promise<boolean> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    const now = new Date().toISOString();
    
    if (dbType === 'postgres') {
      await adapter.query(
        'UPDATE invitations SET status = $1, accepted_at = $2 WHERE token = $3',
        ['accepted', now, token]
      );
    } else {
      const stmt = adapter.prepare(
        'UPDATE invitations SET status = ?, accepted_at = ? WHERE token = ?'
      );
      stmt.run(['accepted', now, token]);
    }

    return true;
  } catch (error) {
    console.error('Failed to mark invitation as accepted:', error);
    return false;
  }
}

export async function markInvitationAsExpired(token: string): Promise<boolean> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    if (dbType === 'postgres') {
      await adapter.query(
        'UPDATE invitations SET status = $1 WHERE token = $2',
        ['expired', token]
      );
    } else {
      const stmt = adapter.prepare('UPDATE invitations SET status = ? WHERE token = ?');
      stmt.run(['expired', token]);
    }

    return true;
  } catch (error) {
    console.error('Failed to mark invitation as expired:', error);
    return false;
  }
}

export async function getPendingInvitationsForOrganization(organizationId: number): Promise<Invitation[]> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    let invitations;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        'SELECT * FROM invitations WHERE organization_id = $1 AND status = $2 ORDER BY created_at DESC',
        [organizationId, 'pending']
      );
      invitations = result.rows;
    } else {
      const stmt = adapter.prepare(
        'SELECT * FROM invitations WHERE organization_id = ? AND status = ? ORDER BY created_at DESC'
      );
      invitations = stmt.all([organizationId, 'pending']);
    }

    return invitations || [];
  } catch (error) {
    console.error('Failed to get pending invitations:', error);
    return [];
  }
}

export async function checkInvitationLimits(organizationId: number, limit: number = 10): Promise<boolean> {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();

    let count;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        'SELECT COUNT(*) as count FROM invitations WHERE organization_id = $1 AND status = $2',
        [organizationId, 'pending']
      );
      count = parseInt(result.rows[0].count);
    } else {
      const stmt = adapter.prepare(
        'SELECT COUNT(*) as count FROM invitations WHERE organization_id = ? AND status = ?'
      );
      const result = stmt.get([organizationId, 'pending']);
      count = result.count;
    }

    return count < limit;
  } catch (error) {
    console.error('Failed to check invitation limits:', error);
    return false;
  }
}
