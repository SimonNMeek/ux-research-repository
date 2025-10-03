import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/src/server/workspace-resolver';
import { ProjectRepo } from '@/src/server/repo/project';

const projectRepo = new ProjectRepo();

export async function POST(
  req: NextRequest,
  { params }: { params: { ws: string; projectSlug: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const workspaceId = await resolveWorkspace(resolved.ws);
    const project = projectRepo.getBySlug(workspaceId, resolved.projectSlug);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const success = projectRepo.update(project.id, {
      name: name.trim(),
      description: description?.trim() || null
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    // Return updated project data
    const updatedProject = projectRepo.getById(project.id);
    return NextResponse.json({ 
      project: updatedProject,
      message: 'Project updated successfully' 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
