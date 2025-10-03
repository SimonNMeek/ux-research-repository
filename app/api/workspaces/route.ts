import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/index';

export async function GET() {
  try {
    const db = getDb();
    const workspaces = db
      .prepare(`
        SELECT id, name, slug, created_at
        FROM workspaces
        ORDER BY name
      `)
      .all();

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, slug, description } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric + hyphens only)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const db = getDb();
    // Check if slug already exists
    const existing = db
      .prepare(`SELECT id FROM workspaces WHERE slug = ?`)
      .get(slug);

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }

    // Create workspace (store description in metadata JSON)
    db.prepare(
      `INSERT INTO workspaces (slug, name, metadata) VALUES (?, ?, ?)`
    ).run(slug, name, JSON.stringify({ description: description || '' }));

    const newWorkspace = db
      .prepare(`SELECT id, name, slug, created_at FROM workspaces WHERE slug = ?`)
      .get(slug);

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
