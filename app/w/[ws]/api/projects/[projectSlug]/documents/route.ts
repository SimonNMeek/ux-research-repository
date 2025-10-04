import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../../../src/server/workspace-resolver';
import { ProjectRepo } from '../../../../../../../src/server/repo/project';
import { DocumentRepo } from '../../../../../../../src/server/repo/document';
import { TagRepo } from '../../../../../../../src/server/repo/tag';

export const runtime = 'nodejs';

const projectRepo = new ProjectRepo();
const documentRepo = new DocumentRepo();
const tagRepo = new TagRepo();

const handler: WorkspaceRouteHandler = async (context, req, routeParams) => {
  const { workspace } = context;
  const resolved = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
  const { projectSlug } = resolved;

  // Validate project exists and belongs to workspace
  const project = projectRepo.getBySlug(workspace.id, projectSlug);
  if (!project) {
    return new Response(
      JSON.stringify({ error: 'Project not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const documents = documentRepo.list(project.id, { limit, offset });
      
      // Get tags for each document
      const documentsWithTags = documents.map(doc => ({
        ...doc,
        tags: tagRepo.getForDocument(doc.id).map(tag => ({
          id: tag.id,
          name: tag.name
        }))
      }));

      return new Response(
        JSON.stringify({ 
          documents: documentsWithTags,
          project: {
            id: project.id,
            slug: project.slug,
            name: project.name
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to fetch documents' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { title, body: docBody, source_url, author, tags, anonymize, anonymizationConfig } = body;

      if (!title || !docBody) {
        return new Response(
          JSON.stringify({ error: 'title and body are required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      let processedBody = docBody;

      // Apply anonymization if enabled
      if (anonymize && anonymizationConfig) {
        try {
          const { anonymizeText } = await import('@/packages/anonymizer');
          
          console.log('Applying anonymization with config:', anonymizationConfig);
          const anonymizationResult = await anonymizeText(docBody, anonymizationConfig);
          processedBody = anonymizationResult.anonymizedText;
          
          console.log('Anonymization applied:', anonymizationResult.summary);
        } catch (err: any) {
          console.error('Anonymization failed:', err.message, err.stack);
          // Continue with original text if anonymization fails
        }
      }

      // Create document
      const document = documentRepo.create(project.id, {
        title,
        body: processedBody,
        source_url,
        author
      });

      // Handle tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagIds = tagRepo.upsertMany(workspace.id, tags);
        tagRepo.attach(document.id, tagIds);
      }

      // Get document with tags for response
      const documentTags = tagRepo.getForDocument(document.id);

      return new Response(
        JSON.stringify({ 
          document: {
            ...document,
            tags: documentTags.map(tag => tag.name)
          }
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to create document' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function GET(
  req: NextRequest, 
  params: { params: { ws: string; projectSlug: string } | Promise<{ ws: string; projectSlug: string }> }
) {
  return withWorkspace(handler, req, params);
}

export async function POST(
  req: NextRequest, 
  params: { params: { ws: string; projectSlug: string } | Promise<{ ws: string; projectSlug: string }> }
) {
  return withWorkspace(handler, req, params);
}
