import { NextRequest, NextResponse } from 'next/server';
import { getInvitationByToken } from '@/lib/invitations';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Get organization details
    const adapter = getDbAdapter();
    const dbType = getDbType();

    let organization;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        'SELECT id, name, slug FROM organizations WHERE id = $1',
        [invitation.organization_id]
      );
      organization = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare('SELECT id, name, slug FROM organizations WHERE id = ?');
      organization = orgStmt.get([invitation.organization_id]);
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        organization: organization,
        role: invitation.role,
        expiresAt: invitation.expires_at
      }
    });

  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}
