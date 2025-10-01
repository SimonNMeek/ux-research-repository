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
import { getDb } from '../db/index';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = new Server(
  { 
    name: 'sol-repo', 
    version: '0.1.0',
  }, 
  { 
    capabilities: { 
      tools: {}, 
      resources: {},
      prompts: {},
    } 
  }
);
console.error('[sol-repo] MCP server starting');

// Schemas
const SearchInput = z.object({ q: z.string().optional(), tag: z.string().optional() }).strict();
const GetNoteInput = z.object({ id: z.number() }).strict();
const AddNoteInput = z.object({ filename: z.string(), content: z.string(), tags: z.array(z.string()).optional() }).strict();
const ListTagsInput = z.object({}).strict();
const AddTagInput = z.object({ noteId: z.number(), tag: z.string() }).strict();

// Helper to wrap plain objects into CallToolResult
function asResult(obj: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

// Advertise prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'sol-intro',
        description: 'Introduction to Sol - triggers when user says "Hey Sol" or asks about Sol/Sol Repo/UX Repo',
      },
    ],
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  if (req.params.name === 'sol-intro') {
    const about = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
    return {
      description: 'Introduction to Sol',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Tell me about Sol',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Hey! I'm here to help you with Sol (also known as Sol Repo or UX Repo).\n\n${about}\n\nWhat would you like to know more about? I can help you with:\n- Searching and managing your research documents\n- Understanding the anonymization features\n- Tagging and organizing your files\n- Using the MCP integration\n\nJust ask!`,
          },
        },
      ],
    };
  }
  throw new Error(`Unknown prompt: ${req.params.name}`);
});

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
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  
  if (uri === 'sol://docs/about') {
    const content = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }
  
  if (uri === 'sol://docs/features') {
    const content = readFileSync(join(__dirname, 'docs', 'features.md'), 'utf-8');
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Advertise tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_sol_info',
        description: 'Get information about Sol (also known as Sol Repo or UX Repo) - what it does, key features, and capabilities',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'search_notes',
        description: 'Search notes by full-text (filename/content) and/or filter by tag',
        inputSchema: {
          type: 'object',
          properties: { q: { type: 'string' }, tag: { type: 'string' } },
          additionalProperties: false,
        },
      },
      {
        name: 'get_note',
        description: 'Get a single note by id with content and tags',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
      {
        name: 'add_note',
        description: 'Add a new note with optional tags',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['filename', 'content'],
          additionalProperties: false,
        },
      },
      {
        name: 'list_tags',
        description: 'List all tag names in alphabetical order',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        name: 'add_tag',
        description: 'Add a tag to a note',
        inputSchema: {
          type: 'object',
          properties: { noteId: { type: 'number' }, tag: { type: 'string' } },
          required: ['noteId', 'tag'],
          additionalProperties: false,
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  
  if (name === 'get_sol_info') {
    const about = readFileSync(join(__dirname, 'docs', 'about-sol.md'), 'utf-8');
    return {
      content: [
        {
          type: 'text',
          text: about,
        },
      ],
    };
  }
  
  if (name === 'search_notes') {
    const input = SearchInput.parse(args ?? {});
  const db = getDb();
  const q = (input.q || '').trim();
  const tag = (input.tag || '').trim();

  let ids = new Set<number>();

  if (q) {
    const rows = db
      .prepare(
        `SELECT n.id
         FROM notes_fts f JOIN notes n ON n.id = f.rowid
         WHERE notes_fts MATCH ?
         ORDER BY rank`
      )
      .all(q) as Array<{ id: number }>;
    rows.forEach((r) => ids.add(r.id));
  }

  if (tag) {
    const rows = db
      .prepare(
        `SELECT DISTINCT nt.note_id AS id
         FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
         WHERE LOWER(t.name) LIKE ?`
      )
      .all(`%${tag.toLowerCase()}%`) as Array<{ id: number }>;
    const tagSet = new Set(rows.map((r) => r.id));
    ids = q ? new Set([...ids].filter((id) => tagSet.has(id))) : tagSet;
  }

  if (!q && !tag) {
    const rows = db.prepare('SELECT id FROM notes ORDER BY created_at DESC LIMIT 50').all() as Array<{ id: number }>;
    ids = new Set(rows.map((r) => r.id));
  }

  const list = [...ids];
  if (list.length === 0) return { results: [] };
  const placeholders = list.map(() => '?').join(',');
  const notes = db
    .prepare(`SELECT id, filename, substr(content, 1, 200) AS snippet FROM notes WHERE id IN (${placeholders})`)
    .all(...list) as Array<{ id: number; filename: string; snippet: string }>;
  const tagRows = db
    .prepare(`SELECT nt.note_id AS id, t.name AS tag FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id IN (${placeholders})`)
    .all(...list) as Array<{ id: number; tag: string }>;
  const map = new Map<number, string[]>();
  for (const r of tagRows) {
    const arr = map.get(r.id) || [];
    arr.push(r.tag);
    map.set(r.id, arr);
  }
    const payload = { results: notes.map((n) => ({ id: n.id, filename: n.filename, snippet: n.snippet, tags: map.get(n.id) || [] })) };
    return asResult(payload);
  }
  if (name === 'get_note') {
    const input = GetNoteInput.parse(args ?? {});
    const db = getDb();
    const note = db.prepare('SELECT id, filename, content FROM notes WHERE id = ?').get(input.id) as
      | { id: number; filename: string; content: string }
      | undefined;
    if (!note) throw new Error('Not found');
    const tags = db
      .prepare('SELECT t.name AS tag FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = ?')
      .all(input.id) as Array<{ tag: string }>;
    return asResult({ id: note.id, filename: note.filename, content: note.content, tags: tags.map((t) => t.tag) });
  }
  if (name === 'add_note') {
    const input = AddNoteInput.parse(args ?? {});
    const MAX_BYTES = 2 * 1024 * 1024;
    const isTxt = input.filename.endsWith('.txt');
    const isMd = input.filename.endsWith('.md');
    if (!isTxt && !isMd) throw new Error('Only .txt and .md allowed');
    if (Buffer.byteLength(input.content, 'utf8') > MAX_BYTES) throw new Error('File too large (max 2MB)');
    const db = getDb();
    const info = db.prepare('INSERT INTO notes (filename, content) VALUES (?, ?)').run(input.filename, input.content);
    const id = Number(info.lastInsertRowid);
    const tags = input.tags || [];
    if (tags.length > 0) {
      const upsertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
      const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
      const insertJoin = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
      const tx = db.transaction((ts: string[]) => {
        for (const t of ts) {
          const tag = t.trim(); if (!tag) continue;
          upsertTag.run(tag);
          const row = findTag.get(tag) as { id: number } | undefined;
          if (row) insertJoin.run(id, row.id);
        }
      });
      tx(tags);
    }
    return asResult({ id });
  }
  if (name === 'list_tags') {
    const db = getDb();
    const rows = db.prepare('SELECT name FROM tags ORDER BY name COLLATE NOCASE').all() as Array<{ name: string }>;
    return asResult({ tags: rows.map((r) => r.name) });
  }
  if (name === 'add_tag') {
    const input = AddTagInput.parse(args ?? {});
    const tag = input.tag.trim();
    if (!tag) throw new Error('Missing tag');
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tag);
    const row = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag) as { id: number } | undefined;
    if (!row) throw new Error('Tag error');
    db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(input.noteId, row.id);
    return asResult({ ok: true });
  }
  const errMsg = `Unknown tool: ${name}`;
  console.error('[sol-repo] ' + errMsg);
  throw new Error(errMsg);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[sol-repo] MCP server connected');
}

main().catch((err) => {
  console.error('[sol-repo] fatal', err);
  process.exit(1);
});


