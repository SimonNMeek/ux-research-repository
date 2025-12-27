import { NextResponse } from 'next/server';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { canCreateWorkspace, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    const sessionId = await getSessionCookie();
    const user = await validateSession(sessionId);
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Debug permission checks
    const debug = {
      user: {
        id: user.id,
        email: user.email,
        system_role: user.system_role,
      },
      permissions: {
        canCreateWorkspace: canCreateWorkspace(user),
        hasCreateWorkspacePermission: hasPermission(user, PERMISSIONS.CREATE_WORKSPACE),
      },
      rolePermissions: {
        super_admin: ['CREATE_WORKSPACE', 'MANAGE_WORKSPACE', 'CREATE_PROJECT', 'MANAGE_PROJECT', 'CREATE_DOCUMENT', 'EDIT_DOCUMENT', 'DELETE_DOCUMENT', 'MANAGE_USERS', 'MANAGE_ROLES', 'VIEW_ALL'],
        admin: ['CREATE_WORKSPACE', 'MANAGE_WORKSPACE', 'CREATE_PROJECT', 'MANAGE_PROJECT', 'CREATE_DOCUMENT', 'EDIT_DOCUMENT', 'DELETE_DOCUMENT'],
      }
    };
    
    return NextResponse.json(debug);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
