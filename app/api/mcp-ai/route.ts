import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getDbAdapter, getDbType } from '@/db/adapter';

// OpenAI API integration with timeout
async function callOpenAI(
  messages: Array<{role: string, content: string}>, 
  context: string,
  workspaceSlug: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const systemPrompt = `You are an intelligent research assistant for the "${workspaceSlug}" workspace.

GOAL:
- Help the user investigate the whole workspace, synthesize insights, and decide next steps.

PERSONALITY & APPROACH:
- Be proactive and helpful.
- Ask clarifying questions when context is insufficient or ambiguous.
- Suggest next steps and related angles to explore.

GROUNDING RULES:
- Use ONLY the document content and metadata provided in CONTEXT below.
- Do NOT invent document titles, project names, facts, or numbers.
- If no relevant documents are provided, explicitly say you lack sources and ask what to search.
- Prefer quoting short, relevant snippets and always cite titles.

WORKSPACE AWARENESS:
- The context may include project lists, document titles, snippets, or full text.
- When comparing or synthesizing, reference specific documents and projects.

RESPONSE STYLE:
- Be concise, accurate, and cite sources like: (Title — Project).
- If multiple sources, enumerate them and keep each citation tied to its point.
- For broad questions, propose a short plan (themes, gaps, anomalies) and ask to proceed.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      
      if (error.includes('quota') || error.includes('billing')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing details.');
      } else if (error.includes('invalid_api_key')) {
        throw new Error('OpenAI API key is invalid.');
      } else {
        throw new Error(`OpenAI API error: ${error}`);
      }
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('AI request timed out. Please try again.');
    }
    
    throw error;
  }
}

/**
 * MCP AI Assistant endpoint
 * Uses OpenAI to provide intelligent responses based on workspace documents
 */

export async function POST(request: NextRequest) {
  try {
    const { message, workspaceSlug, conversationHistory = [] } = await request.json();

    if (!message || !workspaceSlug) {
      return NextResponse.json({ error: 'Message and workspace slug are required' }, { status: 400 });
    }

    // Authenticate user
    let user = null;
    try {
      const sessionId = request.cookies.get('session_id')?.value;
      user = await validateSession(sessionId);
    } catch (error) {
      console.error('Authentication error (non-fatal):', error);
      // Continue without user context
    }

    // Get workspace context
    const db = getDbAdapter();
    const dbType = getDbType();
    
    // Get workspace ID
    let workspaceId;
    const workspaceQuery = dbType === 'postgres'
      ? `SELECT id FROM workspaces WHERE slug = $1`
      : `SELECT id FROM workspaces WHERE slug = ?`;
    
    const workspaceResult = await db.query(workspaceQuery, [workspaceSlug]);
    const workspace = dbType === 'postgres' ? workspaceResult.rows[0] : workspaceResult[0];
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    workspaceId = workspace.id;

    // Extract project names from the user's message and get all projects in workspace
    const { ProjectRepo } = await import('@/src/server/repo/project');
    const { DocumentRepo } = await import('@/src/server/repo/document');
    const projectRepo = new ProjectRepo();
    const documentRepo = new DocumentRepo();
    
    // Get all projects in the workspace to match against
    const allProjects = await projectRepo.listByWorkspace(workspaceId);
    
    // Try to extract project names from the user's query
    // Look for patterns like "in [Project Name]", "[Project Name] project", etc., with fuzzy matching
    let matchedProjectSlugs: string[] = [];
    const messageLower = message.toLowerCase();

    // Candidate phrase before keywords like "project", "documents", "docs"
    const phraseMatch = messageLower.match(/(?:in|for|on|about)?\s*([^\n]*?)\s*(?:project|documents|docs)\b/);
    const candidatePhrase = (phraseMatch?.[1] || messageLower)
      .replace(/^(what|which|show|list|all|my|the|a|an)\s+/g, '')
      .trim();

    const normalizeText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const tokens = (s: string) => normalizeText(s).split(/\s+/).filter(Boolean);

    // Simple synonyms to help user phrasing
    const synonyms: Record<string, string[]> = {
      ux: ['user experience', 'user-experience'],
      'user experience': ['ux'],
      research: ['user research', 'research'],
      'user research': ['research']
    };

    const candidateTokens = new Set(tokens(candidatePhrase));
    for (const [k, vs] of Object.entries(synonyms)) {
      if (candidateTokens.has(k)) vs.forEach(v => candidateTokens.add(v));
      vs.forEach(v => { if (candidateTokens.has(v)) candidateTokens.add(k); });
    }

    // Score each project by token overlap and substring includes
    type Scored = { slug: string; score: number };
    const scored: Scored[] = allProjects.map((p) => {
      const name = normalizeText(p.name);
      const slug = normalizeText(p.slug);
      const nameTokens = new Set(tokens(name));
      let score = 0;
      // token overlap
      candidateTokens.forEach((t) => { if (nameTokens.has(t)) score += 2; });
      // substring includes
      const cand = [...candidateTokens].join(' ');
      if (cand && (name.includes(cand) || slug.includes(cand))) score += 3;
      // direct includes from original message
      if (messageLower.includes(p.name.toLowerCase()) || messageLower.includes(p.slug.toLowerCase())) score += 5;
      return { slug: p.slug, score };
    }).sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 3) {
      matchedProjectSlugs = [scored[0].slug];
    }
    
    // Check if user wants to read documents from previous conversation
    const isReadingRequest = messageLower.includes('read') || 
                             messageLower.includes('show') || 
                             messageLower.includes('what\'s in') ||
                             messageLower.includes('what is in') ||
                             messageLower.includes('tell me about') ||
                             messageLower.match(/those|these|them/); // "read those docs"
    
    // Extract document IDs from previous messages
    let previousDocumentIds: number[] = [];
    for (const msg of conversationHistory) {
      if (msg.sources && Array.isArray(msg.sources)) {
        previousDocumentIds.push(...msg.sources.map((s: any) => s.id).filter((id: any) => id));
      }
    }
    
    // If user wants to read documents and we have previous document IDs, fetch their full content
    let documents: any[] = [];
    let shouldReadFullContent = false;
    
    if (isReadingRequest && previousDocumentIds.length > 0) {
      // Fetch full content of previously mentioned documents
      shouldReadFullContent = true;
      for (const docId of previousDocumentIds.slice(0, 10)) { // Limit to 10 documents
        try {
          const doc = await documentRepo.getById(docId, workspaceId);
          if (doc) {
            // Get project info
            const projectQuery = dbType === 'postgres'
              ? `SELECT p.slug, p.name FROM projects p WHERE p.id = $1`
              : `SELECT slug, name FROM projects WHERE id = ?`;
            const projectResult = await db.query(projectQuery, [doc.project_id]);
            const project = dbType === 'postgres' ? projectResult.rows[0] : projectResult[0];
            
            documents.push({
              document_id: doc.id,
              title: doc.title,
              project_slug: project?.slug || 'unknown',
              project_name: project?.name || 'unknown',
              body: doc.body || '', // Full content, not just snippet
              created_at: doc.created_at,
            });
          }
        } catch (error) {
          console.error(`Error fetching document ${docId}:`, error);
        }
      }
    } else if (matchedProjectSlugs.length > 0) {
      // List all documents in the matched project(s)
      for (const projectSlug of matchedProjectSlugs) {
        const project = allProjects.find(p => p.slug === projectSlug);
        if (project) {
          const projectDocs = await documentRepo.list(project.id, { limit: 100 });
          documents.push(...projectDocs.map(doc => ({
            document_id: doc.id,
            title: doc.title,
            project_slug: project.slug,
            project_name: project.name,
            snippet: doc.body?.substring(0, 200) || '',
            created_at: doc.created_at,
          })));
        }
      }
    } else {
      // No specific project mentioned, do a general search
      // Extract keywords from the query (remove common words like "what", "documents", "have", "in")
      const stopWords = ['what', 'documents', 'document', 'have', 'has', 'in', 'the', 'a', 'an', 'for', 'with', 'show', 'list', 'all', 'my', 'read', 'those', 'these', 'them'];
      const keywords = message
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .slice(0, 5); // Limit to 5 keywords
      
      const searchQuery = keywords.length > 0 ? keywords.join(' ') : message;
      
      // Use the existing workspace search API for consistency
      const searchResponse = await fetch(`${request.nextUrl.origin}/w/${workspaceSlug}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || '', // Forward session cookie
        },
        body: JSON.stringify({
          q: searchQuery,
          limit: 20
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        documents = searchData.results || [];
      } else {
        console.error('Search API failed:', searchResponse.status);
        // Continue with empty documents array rather than throwing
      }
    }

    // -------------------- TOOL ROUTER --------------------
    type ToolContext = { workspaceId: number; workspaceSlug: string };
    type DocRef = { id: number; title: string; project_slug?: string; project_name?: string };
    type ToolResult =
      | { tool: 'list_documents'; documents: DocRef[] }
      | { tool: 'list_projects'; projects: { slug: string; name: string }[] }
      | { tool: 'get_document'; document?: { id: number; title: string; body: string; project_slug?: string } }
      | { tool: 'search_documents'; documents: DocRef[] };

    const toolRouter = {
      async list_documents(_args: any, ctx: ToolContext): Promise<ToolResult> {
        if (matchedProjectSlugs.length > 0 && documents.length > 0) {
          const docs: DocRef[] = documents.map((d: any) => ({ id: d.document_id || d.id, title: d.title, project_slug: d.project_slug, project_name: d.project_name }));
          return { tool: 'list_documents', documents: docs };
        }
        const rows = await db.query(
          dbType === 'postgres'
            ? `SELECT d.id, d.title, p.slug AS project_slug, p.name AS project_name
               FROM documents d INNER JOIN projects p ON d.project_id = p.id
               WHERE p.workspace_id = $1 ORDER BY d.created_at DESC LIMIT 200`
            : `SELECT d.id, d.title, p.slug AS project_slug, p.name AS project_name
               FROM documents d INNER JOIN projects p ON d.project_id = p.id
               WHERE p.workspace_id = ? ORDER BY d.created_at DESC LIMIT 200`,
          [ctx.workspaceId]
        );
        const list = (dbType === 'postgres' ? rows.rows : rows) as any[];
        return {
          tool: 'list_documents',
          documents: list.map(r => ({ id: r.id, title: r.title, project_slug: r.project_slug, project_name: r.project_name }))
        };
      },
      async list_projects(_args: any, ctx: ToolContext): Promise<ToolResult> {
        const rows = await db.query(
          dbType === 'postgres'
            ? `SELECT slug, name FROM projects WHERE workspace_id = $1 ORDER BY name ASC`
            : `SELECT slug, name FROM projects WHERE workspace_id = ? ORDER BY name ASC`,
          [ctx.workspaceId]
        );
        const list = (dbType === 'postgres' ? rows.rows : rows) as any[];
        return { tool: 'list_projects', projects: list.map(r => ({ slug: r.slug, name: r.name })) };
      },
      async get_document(args: { id?: number; titleFragment?: string }, ctx: ToolContext): Promise<ToolResult> {
        const id = args?.id;
        if (typeof id === 'number') {
          const doc = await documentRepo.getById(id, ctx.workspaceId);
          if (!doc) return { tool: 'get_document', document: undefined };
          const projQ = dbType === 'postgres' ? `SELECT slug FROM projects WHERE id = $1` : `SELECT slug FROM projects WHERE id = ?`;
          const projR = await db.query(projQ, [doc.project_id]);
          const proj = dbType === 'postgres' ? projR.rows[0] : projR[0];
          return { tool: 'get_document', document: { id: doc.id, title: doc.title, body: doc.body || '', project_slug: proj?.slug } };
        }
        const tf = (args?.titleFragment || '').toLowerCase();
        if (!tf) return { tool: 'get_document', document: undefined };
        const rows = await db.query(
          dbType === 'postgres'
            ? `SELECT d.id, d.title, d.body, p.slug AS project_slug
               FROM documents d INNER JOIN projects p ON d.project_id = p.id
               WHERE p.workspace_id = $1 AND LOWER(d.title) LIKE $2
               ORDER BY d.created_at DESC LIMIT 1`
            : `SELECT d.id, d.title, d.body, p.slug AS project_slug
               FROM documents d INNER JOIN projects p ON d.project_id = p.id
               WHERE p.workspace_id = ? AND LOWER(d.title) LIKE ?
               ORDER BY d.created_at DESC LIMIT 1`,
          [ctx.workspaceId, `%${tf}%`]
        );
        const row = (dbType === 'postgres' ? rows.rows[0] : rows[0]) as any;
        if (!row) return { tool: 'get_document', document: undefined };
        return { tool: 'get_document', document: { id: row.id, title: row.title, body: row.body || '', project_slug: row.project_slug } };
      },
      async search_documents(args: { q: string }, ctx: ToolContext): Promise<ToolResult> {
        const q = (args?.q || '').trim();
        if (!q) return { tool: 'search_documents', documents: [] };
        const res = await fetch(`${request.nextUrl.origin}/w/${ctx.workspaceSlug}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': request.headers.get('Cookie') || '' },
          body: JSON.stringify({ q, limit: 200 }),
        });
        if (!res.ok) return { tool: 'search_documents', documents: [] };
        const data = await res.json();
        const docs = (data?.results || []).map((d: any) => ({ id: d.document_id || d.id, title: d.title, project_slug: d.project_slug, project_name: d.project_name }));
        return { tool: 'search_documents', documents: docs };
      },
    } as const;

    // Prepare context for AI with document content
    let contextInfo = `WORKSPACE: "${workspaceSlug}"\n\n`;
    
    if (documents.length > 0) {
      if (shouldReadFullContent) {
        // Include full document content when reading
        contextInfo += `DOCUMENT CONTENT (${documents.length} document${documents.length !== 1 ? 's' : ''} to read):\n\n`;
        documents.forEach((doc: any) => {
          const project = doc.project_slug || doc.project_name || 'unknown';
          contextInfo += `--- ${doc.title} (${project}) ---\n`;
          if (doc.body) {
            // Include more content when reading - up to 3000 chars per doc
            contextInfo += `${doc.body.substring(0, 3000)}${doc.body.length > 3000 ? '\n[Content truncated]' : ''}\n`;
          }
          contextInfo += `--- END ---\n\n`;
        });
      } else {
        // Include titles and snippets for search results
        contextInfo += `RELEVANT DOCUMENTS (${documents.length} found):\n\n`;
        documents.slice(0, 10).forEach((doc: any) => {
          const project = doc.project_slug || doc.project_name || 'unknown';
          contextInfo += `--- ${doc.title} (${project}) ---\n`;
          if (doc.snippet) {
            contextInfo += `${doc.snippet}\n`;
          } else if (doc.body) {
            contextInfo += `${doc.body.substring(0, 300)}...\n`;
          }
          contextInfo += `--- END ---\n\n`;
        });
      }
    } else {
      contextInfo += `No documents found for "${message}".\n`;
    }
    
    // Build conversation history for OpenAI
    const openAIMessages: Array<{role: string, content: string}> = [];
    
    // Add conversation history (limit to last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      openAIMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }
    
    // Add current user message with context
    openAIMessages.push({
      role: 'user',
      content: `${contextInfo}\n\nUSER QUESTION: ${message}`
    });
    
    // ----- Intent detection helpers -----
    const wantsFullList = /\b(full list|list all|show all|all of them|give me all|entire list)\b/i.test(message);
    const wantsSummarize = /(summari[sz]e|sum up|read|open|explain)\b/i.test(message);
    const wantsList = /(what\s+documents|which\s+documents|list\s+documents|show\s+documents|list\s+docs|show\s+docs)/i.test(message);
    const wantsProjects = /(what\s+projects|which\s+projects|list\s+projects|show\s+projects)/i.test(message);
    const wantsSearch = /\b(search|find|look\s+for)\b/i.test(message);

    // Extract a numeric reference if present (e.g., "summarise 3")
    const numberMatch = message.match(/\b(\d{1,3})\b/);
    const requestedIndex = numberMatch ? parseInt(numberMatch[1], 10) : null;

    // Extract a crude title fragment after the verb (e.g., "summarise user_interview3")
    const titleFragmentMatch = message.match(/(?:summari[sz]e|read|open|explain)\s+(.+)/i);
    const rawTitleFragment = titleFragmentMatch ? titleFragmentMatch[1].trim() : '';
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]+/g, ' ').trim();
    const titleFragment = normalise(rawTitleFragment);

    // If the user asked for a full list and we have documents, reply with all titles (no truncation)
    let aiResponse: string;
    // If user asked for a specific document to summarise/read, try to resolve it now using last sources
    if (wantsSummarize) {
      // Look for previous assistant message sources (from conversationHistory)
      let lastSources: Array<{ id: number; title: string; project?: string }> = [];
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === 'assistant' && Array.isArray(msg.sources) && msg.sources.length > 0) {
          lastSources = msg.sources;
          break;
        }
      }

      // If we have a numeric selection and sources, map index -> id
      if (requestedIndex && lastSources.length > 0) {
        const idx = requestedIndex - 1;
        if (idx >= 0 && idx < lastSources.length) {
          const sel = lastSources[idx];
          const doc = await documentRepo.getById(sel.id, workspaceId);
          if (doc) {
            const projQ = dbType === 'postgres' ? `SELECT slug,name FROM projects WHERE id = $1` : `SELECT slug,name FROM projects WHERE id = ?`;
            const projR = await db.query(projQ, [doc.project_id]);
            const proj = dbType === 'postgres' ? projR.rows[0] : projR[0];
            const header = `Workspace: ${workspaceSlug}\nProject: ${proj?.slug || 'unknown'}`;
            const body = doc.body || '';
            const summaryPrompt = `Summarise this document accurately. Cite the title.\nTitle: ${doc.title}\n\n${body.substring(0, 6000)}`;
            try {
              const summary = await callOpenAI([
                { role: 'user', content: `${header}\n\n${summaryPrompt}` }
              ], header, workspaceSlug);
              return NextResponse.json({
                response: summary,
                sources: [{ id: doc.id, title: doc.title, project: proj?.slug || 'unknown' }],
                context: `${header}\n\nRead: ${doc.title}`,
              });
            } catch {
              const fallback = `Summary of ${doc.title}:\n${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}`;
              return NextResponse.json({
                response: fallback,
                sources: [{ id: doc.id, title: doc.title, project: proj?.slug || 'unknown' }],
                context: `${header}\n\nRead: ${doc.title}`,
              });
            }
          }
        }
      }

      // If title fragment provided, try to resolve against lastSources or freshly found documents
      if (titleFragment) {
        const pool: Array<{ id: number; title: string; project?: string }> = [];
        if (documents.length > 0) {
          documents.forEach((d: any) => pool.push({ id: d.document_id || d.id, title: d.title, project: d.project_slug || d.project_name }));
        }
        if (lastSources.length > 0) pool.push(...lastSources);
        const best = pool.find((s) => normalise(s.title).includes(titleFragment));
        if (best) {
          const doc = await documentRepo.getById(best.id, workspaceId);
          if (doc) {
            const projQ = dbType === 'postgres' ? `SELECT slug,name FROM projects WHERE id = $1` : `SELECT slug,name FROM projects WHERE id = ?`;
            const projR = await db.query(projQ, [doc.project_id]);
            const proj = dbType === 'postgres' ? projR.rows[0] : projR[0];
            const header = `Workspace: ${workspaceSlug}\nProject: ${proj?.slug || 'unknown'}`;
            const body = doc.body || '';
            const summaryPrompt = `Summarise this document accurately. Cite the title.\nTitle: ${doc.title}\n\n${body.substring(0, 6000)}`;
            try {
              const summary = await callOpenAI([
                { role: 'user', content: `${header}\n\n${summaryPrompt}` }
              ], header, workspaceSlug);
              return NextResponse.json({
                response: summary,
                sources: [{ id: doc.id, title: doc.title, project: proj?.slug || 'unknown' }],
                context: `${header}\n\nRead: ${doc.title}`,
              });
            } catch {
              const fallback = `Summary of ${doc.title}:\n${body.substring(0, 1000)}${body.length > 1000 ? '...' : ''}`;
              return NextResponse.json({
                response: fallback,
                sources: [{ id: doc.id, title: doc.title, project: proj?.slug || 'unknown' }],
                context: `${header}\n\nRead: ${doc.title}`,
              });
            }
          }
        }
      }
    }

    if (wantsProjects) {
      const toolRes = await toolRouter.list_projects({}, { workspaceId, workspaceSlug });
      const items = toolRes.projects.map((p: any, idx: number) => `${idx + 1}. ${p.name} (${p.slug})`).join('\n');
      return NextResponse.json({
        response: `Projects (${toolRes.projects.length}):\n\n${items}`,
        tool_result: toolRes,
        sources: [],
        context: contextInfo,
      });
    }
    if ((wantsFullList || wantsList) && !shouldReadFullContent) {
      // Deterministic, full enumeration via tool
      const toolRes = await toolRouter.list_documents({}, { workspaceId, workspaceSlug });
      const docs = toolRes.documents;
      const list = docs
        .map((doc: any, idx: number) => `${idx + 1}. ${doc.title} (${doc.project_slug || doc.project_name || 'unknown'})`)
        .join('\n');
      aiResponse = `Here is the list (${docs.length}):\n\n${list}`;
      return NextResponse.json({
        response: aiResponse,
        tool_result: toolRes,
        sources: docs.map((d: any) => ({ id: d.id, title: d.title, project: d.project_slug || d.project_name })),
        context: contextInfo,
      });
      } else if (wantsSearch) {
        // Simple search intent: use tool to find docs
        const queryMatch = message.match(/(?:search|find|look\s+for)\s+(.+)/i);
        const q = (queryMatch?.[1] || message).trim();
        const toolRes = await toolRouter.search_documents({ q }, { workspaceId, workspaceSlug });
        const docs = toolRes.documents;
        if (docs.length === 0) {
          return NextResponse.json({
            response: `No documents found for "${q}"`,
            tool_result: toolRes,
            sources: [],
            context: contextInfo,
          });
        }
        const list = docs.slice(0, 10).map((d: any, idx: number) => `${idx + 1}. ${d.title} (${d.project_slug || d.project_name || 'unknown'})`).join('\n');
        return NextResponse.json({
          response: `Found ${docs.length} document${docs.length !== 1 ? 's' : ''} for "${q}":\n\n${list}${docs.length > 10 ? `\n\n...and ${docs.length - 10} more.` : ''}`,
          tool_result: toolRes,
          sources: docs.map((d: any) => ({ id: d.id, title: d.title, project: d.project_slug || d.project_name })),
          context: contextInfo,
        });
      } else {
      // Call OpenAI to generate intelligent response
      try {
        aiResponse = await callOpenAI(openAIMessages, contextInfo, workspaceSlug);
      } catch (error: any) {
        console.error('OpenAI error:', error);
        
        // Fallback to simple response if OpenAI fails
        if (shouldReadFullContent && documents.length > 0) {
          const docList = documents.map((doc: any) => {
            const summary = doc.body ? `${doc.body.substring(0, 500)}...` : 'No content available';
            return `**${doc.title}** (${doc.project_slug || doc.project_name || 'unknown'}): ${summary}`;
          }).join('\n\n');
          aiResponse = `I've read ${documents.length} document${documents.length !== 1 ? 's' : ''}:\n\n${docList}`;
        } else if (documents.length > 0) {
          aiResponse = `I found ${documents.length} relevant document${documents.length !== 1 ? 's' : ''}:\n\n${documents.slice(0, 5).map((doc: any) => `- **${doc.title}** (${doc.project_slug || doc.project_name || 'unknown'})`).join('\n')}${documents.length > 5 ? `\n\n*... and ${documents.length - 5} more. Say "full list" to see every title.*` : ''}`;
        } else {
          aiResponse = `I couldn't find any documents. The AI service encountered an error: ${error.message}. Please try again or rephrase your question.`;
        }
      }
    }
    try {
      aiResponse = await callOpenAI(openAIMessages, contextInfo, workspaceSlug);
    } catch (error: any) {
      console.error('OpenAI error:', error);
      
      // Fallback to simple response if OpenAI fails
      if (shouldReadFullContent && documents.length > 0) {
        const docList = documents.map((doc: any) => {
          const summary = doc.body ? `${doc.body.substring(0, 500)}...` : 'No content available';
          return `**${doc.title}** (${doc.project_slug || doc.project_name || 'unknown'}): ${summary}`;
        }).join('\n\n');
        aiResponse = `I've read ${documents.length} document${documents.length !== 1 ? 's' : ''}:\n\n${docList}`;
      } else if (documents.length > 0) {
        aiResponse = `I found ${documents.length} relevant document${documents.length !== 1 ? 's' : ''}:\n\n${documents.slice(0, 5).map((doc: any) => `- **${doc.title}** (${doc.project_slug || doc.project_name || 'unknown'})`).join('\n')}${documents.length > 5 ? `\n\n*... and ${documents.length - 5} more. Say "read those docs" to see their contents.*` : ''}`;
      } else {
        aiResponse = `I couldn't find any documents. The AI service encountered an error: ${error.message}. Please try again or rephrase your question.`;
      }
    }

    // Track AI usage if user is authenticated (skip if no organization_id)
    if (user && user.organization_id) {
      try {
        const usageQuery = dbType === 'postgres'
          ? `INSERT INTO ai_usage (user_id, organization_id, workspace_slug, query, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`
          : `INSERT INTO ai_usage (user_id, organization_id, workspace_slug, query, created_at) VALUES (?, ?, ?, ?, datetime('now'))`;
        
        await db.query(usageQuery, [
          user.id,
          user.organization_id,
          workspaceSlug,
          message
        ]);
      } catch (error) {
        console.error('Error tracking AI usage:', error);
        // Don't fail the request if tracking fails
      }
    }

    return NextResponse.json({
      response: aiResponse,
      sources: documents.map(doc => ({
        id: doc.document_id || doc.id,
        title: doc.title,
        project: doc.project_slug || doc.project_name,
      })),
      context: contextInfo,
    });

  } catch (error: any) {
    console.error('MCP AI error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

