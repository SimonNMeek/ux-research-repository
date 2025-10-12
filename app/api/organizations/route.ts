import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db/index';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { OrganizationRepo } from '@/src/server/repo/organization';

const organizationRepo = new OrganizationRepo();

export async function GET() {
  try {
    // Get authenticated user
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Super admins see all organizations
    if (user.system_role === 'super_admin') {
      const adapter = getDbAdapter();
      const dbType = getDbType();
      
      let organizations;
      if (dbType === 'postgres') {
        const result = await adapter.query('SELECT * FROM organizations ORDER BY name');
        organizations = result.rows;
      } else {
        const db = getDb();
        organizations = db.prepare('SELECT * FROM organizations ORDER BY name').all();
      }
      
      return NextResponse.json({ organizations });
    }

    // Regular users see only organizations they belong to
    const organizations = await organizationRepo.listForUser(user.id);
    
    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Only admins and super admins can create organizations
    if (user.system_role !== 'admin' && user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only admins can create organizations' },
        { status: 403 }
      );
    }

    const { name, slug, billing_email, plan } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = organizationRepo.getBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Create organization
    const organization = organizationRepo.create({
      slug,
      name,
      billing_email: billing_email || user.email,
      plan: plan || 'free'
    });

    // Grant creator as owner
    organizationRepo.addUser(organization.id, user.id, 'owner', user.id);

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Only super admins can edit organizations
    if (user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can edit organizations' },
        { status: 403 }
      );
    }

    const { id, name, slug, billing_email, plan, max_workspaces, max_users, max_documents } = await request.json();

    if (!id || !name || !slug) {
      return NextResponse.json(
        { error: 'ID, name, and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if slug already exists on a different org
    const existing = await organizationRepo.getBySlug(slug);
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Update organization
    await organizationRepo.update(id, {
      slug,
      name,
      billing_email,
      plan,
      max_workspaces,
      max_users,
      max_documents
    });

    const updated = await organizationRepo.getById(id);
    return NextResponse.json({ organization: updated });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Only super admins can delete organizations
    if (user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete organizations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check if organization has workspaces
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let workspaceCount: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT COUNT(*) as count FROM workspaces WHERE organization_id = $1', [parseInt(id)]);
      workspaceCount = result.rows[0];
    } else {
      const db = getDb();
      workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces WHERE organization_id = ?').get(parseInt(id));
    }

    if (workspaceCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with existing workspaces' },
        { status: 400 }
      );
    }

    await organizationRepo.delete(parseInt(id));

    return NextResponse.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}

