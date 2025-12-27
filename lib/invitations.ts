import { randomBytes } from 'crypto';
import { query } from '@/db/postgres';

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
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await query<Invitation>(
      `INSERT INTO invitations (email, organization_id, invited_by, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.email, data.organizationId, data.invitedBy, data.role, token, expiresAt.toISOString()]
    );

    return { success: true, invitation: result.rows[0] };
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    const result = await query<Invitation>(
      'SELECT * FROM invitations WHERE token = $1 AND status = $2',
      [token, 'pending']
    );

    const invitation = result.rows[0];
    if (!invitation) return null;

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
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
    const now = new Date().toISOString();
    await query('UPDATE invitations SET status = $1, accepted_at = $2 WHERE token = $3', [
      'accepted',
      now,
      token,
    ]);
    return true;
  } catch (error) {
    console.error('Failed to mark invitation as accepted:', error);
    return false;
  }
}

export async function markInvitationAsExpired(token: string): Promise<boolean> {
  try {
    await query('UPDATE invitations SET status = $1 WHERE token = $2', ['expired', token]);
    return true;
  } catch (error) {
    console.error('Failed to mark invitation as expired:', error);
    return false;
  }
}

export async function getPendingInvitationsForOrganization(organizationId: number): Promise<Invitation[]> {
  try {
    const result = await query<Invitation>(
      `SELECT * FROM invitations
       WHERE organization_id = $1 AND status = $2
       ORDER BY created_at DESC`,
      [organizationId, 'pending']
    );
    return result.rows;
  } catch (error) {
    console.error('Failed to get pending invitations:', error);
    return [];
  }
}

export async function checkInvitationLimits(
  organizationId: number,
  limit: number = 10
): Promise<boolean> {
  try {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM invitations WHERE organization_id = $1 AND status = $2',
      [organizationId, 'pending']
    );
    const count = parseInt(result.rows[0]?.count ?? '0', 10);
    return count < limit;
  } catch (error) {
    console.error('Failed to check invitation limits:', error);
    return false;
  }
}
