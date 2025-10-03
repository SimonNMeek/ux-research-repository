import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolResult 
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { WorkspaceRepo } from '../src/server/repo/workspace';
import { ProjectRepo } from '../src/server/repo/project';
import { DocumentRepo } from '../src/server/repo/document';
import { TagRepo } from '../src/server/repo/tag';
import { getDb } from '../db/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = new Server(
  { 
    name: 'sol-repo', 
    version: '0.2.0',
  }, 
  { 
    capabilities: { 
      tools: {}, 
      resources: {},
      prompts: {},
    } 
  }
);
console.error('[sol-repo] MCP server starting (workspace-aware)');

// Repository instances
const workspaceRepo = new WorkspaceRepo();
const projectRepo = new ProjectRepo();
const documentRepo = new DocumentRepo();
const tagRepo = new TagRepo();

// Active workspace state
let activeWorkspace: { id: number; slug: string; name: string } | null = null;

// Schemas
const SetActiveWorkspaceInput = z.object({ workspace_slug: z.string() }).strict();
const ListProjectsInput = z.object({}).strict();
const QueryInput = z.object({ 
  q: z.string(), 
  mode: z.enum(['fulltext', 'semantic']).default('fulltext'),
  project_slugs: z.array(z.string()).optional() 
}).strict();
const GetDocumentInput = z.object({ id: z.number() }).strict();
const SetUserPreferenceInput = z.object({ 
  userId: z.string(), 
  role: z.string().optional(),
  preferredWorkflows: z.array(z.string()).optional(),
  lastWorkflow: z.string().optional(),
  quickActions: z.array(z.string()).optional(),
}).strict();
const GetUserPreferenceInput = z.object({ userId: z.string() }).strict();

// Helper function to check active workspace
function requireActiveWorkspace() {
  if (!activeWorkspace) {
    throw new Error('Select a workspace first with set_active_workspace');
  }
  return activeWorkspace;
}

// Advertise resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'sol://docs/about',
        name: 'About Sol',
        description: 'Overview of Sol/Sol Repo/UX Repo - what it is, key features, and use cases',
        mimeType: 'text/markdown',
      },
      {
        uri: 'sol://docs/features',
        name: 'Sol Features Guide',
        description: 'Comprehensive guide to all Sol features including anonymization, search, and MCP integration',
        mimeType: 'text/markdown',
      },
      {
        uri: 'sol://docs/onboarding',
        name: 'Sol Onboarding Guide',
        description: 'Role-based onboarding journey and workflow templates for getting started with Sol',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Handle resource requests
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === 'sol://docs/about') {
    const content = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
    return { contents: [{ type: 'text', text: content }] };
  }
  
  if (uri === 'sol://docs/features') {
    const content = readFileSync(join(__dirname, 'docs', 'features.md'), 'utf-8');
    return { contents: [{ type: 'text', text: content }] };
  }
  
  if (uri === 'sol://docs/onboarding') {
    const content = readFileSync(join(__dirname, 'docs', 'onboarding-guide.md'), 'utf-8');
    return { contents: [{ type: 'text', text: content }] };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Advertise prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'sol-intro',
        description: 'Introduction to Sol - triggers when user says "Hey Sol" or asks about Sol/Sol Repo/UX Repo',
      },
      {
        name: 'sol-onboarding',
        description: 'Start onboarding journey - helps user set up their role and preferred workflows',
      },
      {
        name: 'sol-what-can-i-do',
        description: 'Explains what users can do with Sol based on their role',
      },
    ],
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;
  
  if (name === 'sol-intro') {
    const about = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
    return {
      description: 'Friendly introduction to Sol',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'Hey Sol, what can you help me with?' }
        },
        {
          role: 'assistant',
          content: { type: 'text', text: `Hey there! 👋 I'm Sol, your UX research assistant.\n\n${about}` }
        }
      ]
    };
  }
  
  if (name === 'sol-onboarding') {
    return {
      description: 'Start the onboarding journey',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'I want to get started with Sol' }
        },
        {
          role: 'assistant',
          content: { 
            type: 'text', 
            text: `The Sol Research Repo lets you query real UX research findings, generate summaries, and use research insights to drive design, product, and marketing decisions. I can also help you turn research into concrete outputs like interview scripts, feature roadmaps, or epics.

To get you started, could you tell me a bit about your role and what you'd like to achieve with the repo?

**Which best describes your role?**
- **Designer** - Create design concepts, validate UX flows
- **Product Manager** - Prioritize features, draft epics/stories
- **Researcher** - Query findings, synthesize themes, draft guides
- **Marketer** - Build messaging, validate campaigns
- **Engineer** - Understand user needs, technical requirements
- **Something else** - Tell me more about your role` 
          }
        }
      ]
    };
  }
  
  if (name === 'sol-what-can-i-do') {
    return {
      description: 'Explain Sol capabilities',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'What can I do with Sol?' }
        },
        {
          role: 'assistant',
          content: { 
            type: 'text', 
            text: `The Sol Research Repo lets you query real UX research findings, generate summaries, and use research insights to drive design, product, and marketing decisions. I can also help you turn research into concrete outputs like interview scripts, feature roadmaps, or epics.

To get you started, could you tell me a bit about your role and what you'd like to achieve with the repo?

**Which best describes your role?**
- **Designer** - Create design concepts, validate UX flows
- **Product Manager** - Prioritize features, draft epics/stories
- **Researcher** - Query findings, synthesize themes, draft guides
- **Marketer** - Build messaging, validate campaigns
- **Engineer** - Understand user needs, technical requirements
- **Something else** - Tell me more about your role` 
          }
        }
      ]
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
});

// Advertise tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'set_active_workspace',
        description: 'Set the active workspace for all subsequent operations. Required before using other tools.',
        inputSchema: {
          type: 'object',
          properties: { workspace_slug: { type: 'string' } },
          required: ['workspace_slug'],
          additionalProperties: false,
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in the active workspace. Requires an active workspace to be set.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'query',
        description: 'Search through research documents across projects in the active workspace. Use this to find relevant research findings, user insights, or specific topics.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            mode: { type: 'string', enum: ['fulltext', 'semantic'] },
            project_slugs: { type: 'array', items: { type: 'string' } },
          },
          required: ['q'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_document',
        description: 'Get the full content of a specific research document by ID. Requires the document to be in the active workspace.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_sol_info',
        description: 'Get information about Sol (Sol Repo/UX Repo) - what it does and how to help users.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'set_user_preference',
        description: 'Set user preferences for role and workflows',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            role: { type: 'string' },
            preferredWorkflows: { type: 'array', items: { type: 'string' } },
            lastWorkflow: { type: 'string' },
            quickActions: { type: 'array', items: { type: 'string' } },
          },
          required: ['userId'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_user_preference',
        description: 'Get user preferences for role and workflows',
        inputSchema: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
          additionalProperties: false,
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'set_active_workspace') {
      const { workspace_slug } = SetActiveWorkspaceInput.parse(args);
      
      const workspace = workspaceRepo.getBySlug(workspace_slug);
      if (!workspace) {
        return {
          content: [{ type: 'text', text: `Workspace '${workspace_slug}' not found. Available workspaces: ${workspaceRepo.listAll().map(w => w.slug).join(', ')}` }],
          isError: true,
        };
      }
      
      activeWorkspace = {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name
      };
      
      return {
        content: [{ type: 'text', text: `Active workspace set to: ${workspace.name} (${workspace.slug})` }],
      };
    }

    if (name === 'list_projects') {
      const workspace = requireActiveWorkspace();
      const projects = projectRepo.listByWorkspace(workspace.id);
      
      return {
        content: [{ 
          type: 'text', 
          text: `Projects in ${workspace.name}:\n${projects.map(p => `- ${p.name} (${p.slug}): ${p.description}`).join('\n')}` 
        }],
      };
    }

    if (name === 'query') {
      const workspace = requireActiveWorkspace();
      const { q, mode = 'fulltext', project_slugs } = QueryInput.parse(args);
      
      // Resolve project IDs
      let projectIds: number[];
      
      if (project_slugs && project_slugs.length > 0) {
        projectIds = projectRepo.resolveSlugsToids(workspace.id, project_slugs);
        
        if (projectIds.length !== project_slugs.length) {
          const foundProjects = projectRepo.getByIdsInWorkspace(workspace.id, projectIds);
          const foundSlugs = foundProjects.map(p => p.slug);
          const missingSlugs = project_slugs.filter(slug => !foundSlugs.includes(slug));
          
          return {
            content: [{ type: 'text', text: `Project not in active workspace: ${missingSlugs.join(', ')}` }],
            isError: true,
          };
        }
      } else {
        // Search all projects in workspace
        const allProjects = projectRepo.listByWorkspace(workspace.id);
        projectIds = allProjects.map(p => p.id);
      }
      
      // Perform search
      const results = documentRepo.searchFullText(projectIds, q, { limit: 20 });
      
      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No documents found matching "${q}" in workspace ${workspace.name}` }],
        };
      }
      
      const resultText = results.map(result => 
        `**${result.title}** (Project: ${result.project_slug}, ID: ${result.id})\n${result.snippet || result.body.substring(0, 200)}...\n`
      ).join('\n');
      
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${results.length} documents matching "${q}" in ${workspace.name}:\n\n${resultText}` 
        }],
      };
    }

    if (name === 'get_document') {
      const workspace = requireActiveWorkspace();
      const { id } = GetDocumentInput.parse(args);
      
      const documentWithProject = documentRepo.getWithProject(id);
      if (!documentWithProject) {
        return {
          content: [{ type: 'text', text: `Document ${id} not found` }],
          isError: true,
        };
      }
      
      // Validate document belongs to active workspace
      if (documentWithProject.workspace_id !== workspace.id) {
        return {
          content: [{ type: 'text', text: `Document not in active workspace` }],
          isError: true,
        };
      }
      
      // Get tags for the document
      const tags = tagRepo.getForDocument(id);
      
      return {
        content: [{ 
          type: 'text', 
          text: `**${documentWithProject.title}**\n\nProject: ${documentWithProject.project_slug}\nTags: ${tags.map(t => t.name).join(', ')}\n\n${documentWithProject.clean_text || documentWithProject.body}` 
        }],
      };
    }

    if (name === 'get_sol_info') {
      const about = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
      const onboarding = readFileSync(join(__dirname, 'docs', 'onboarding-guide.md'), 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `🚨 ONBOARDING SCRIPT - USE THIS EXACT TEXT, DO NOT PARAPHRASE 🚨

When user asks "What can I do?" or "What can Sol do?", respond with:

─────────────────────────────────────────────
The Sol Research Repo lets you query real UX research findings, generate summaries, and use research insights to drive design, product, and marketing decisions. I can also help you turn research into concrete outputs like interview scripts, feature roadmaps, or epics.

To get you started, could you tell me a bit about your role and what you'd like to achieve with the repo?

**Which best describes your role?**
- **Designer** - Create design concepts, validate UX flows
- **Product Manager** - Prioritize features, draft epics/stories
- **Researcher** - Query findings, synthesize themes, draft guides
- **Marketer** - Build messaging, validate campaigns
- **Engineer** - Understand user needs, technical requirements
- **Something else** - Tell me more about your role
─────────────────────────────────────────────

AFTER they choose a role, present the role-specific goals from the onboarding guide below.

═══════════════════════════════════════════════════════════════════

${about}

═══════════════════════════════════════════════════════════════════

${onboarding}`,
          },
        ],
      };
    }

    if (name === 'set_user_preference') {
      const input = SetUserPreferenceInput.parse(args);
      const db = getDb();
      
      db.prepare(`
        INSERT OR REPLACE INTO user_preferences 
        (user_id, role, preferred_workflows, last_workflow, quick_actions, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        input.userId,
        input.role || null,
        JSON.stringify(input.preferredWorkflows || []),
        input.lastWorkflow || null,
        JSON.stringify(input.quickActions || [])
      );
      
      return {
        content: [{ type: 'text', text: `User preferences saved for ${input.userId}` }],
      };
    }

    if (name === 'get_user_preference') {
      const { userId } = GetUserPreferenceInput.parse(args);
      const db = getDb();
      
      const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
      
      if (!prefs) {
        return {
          content: [{ type: 'text', text: `No preferences found for user ${userId}` }],
        };
      }
      
      return {
        content: [{ 
          type: 'text', 
          text: `User preferences for ${userId}:\n- Role: ${prefs.role || 'Not set'}\n- Preferred workflows: ${JSON.parse(prefs.preferred_workflows || '[]').join(', ')}\n- Last workflow: ${prefs.last_workflow || 'None'}\n- Quick actions: ${JSON.parse(prefs.quick_actions || '[]').join(', ')}` 
        }],
      };
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[sol-repo] MCP server connected');
}

main().catch((error) => {
  console.error('[sol-repo] Server error:', error);
  process.exit(1);
});
