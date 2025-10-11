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
    const organizations = organizationRepo.listForUser(user.id);
    
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

