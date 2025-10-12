# Sol API Integration Guide

Connect Sol to ChatGPT, Claude, Gemini, or any LLM using our REST API.

## Quick Start

### 1. Generate an API Key

1. Log in to Sol at https://ux-repo-web.vercel.app
2. Click your avatar → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "ChatGPT Integration")
5. **Copy the key immediately** - you won't see it again!

### 2. Test Your API Key

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://ux-repo-web.vercel.app/api/mcp/workspaces
```

## API Endpoints

All endpoints require Bearer authentication:
```
Authorization: Bearer sk-YOUR_API_KEY
```

### List Workspaces

```http
GET /api/mcp/workspaces
```

**Response:**
```json
{
  "workspaces": [
    {
      "id": 1,
      "slug": "my-workspace",
      "name": "My Workspace",
      "organization_name": "My Organization",
      "role": "owner"
    }
  ]
}
```

### List Projects

```http
GET /api/mcp/projects?workspace=my-workspace
```

**Parameters:**
- `workspace` (required) - Workspace slug

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "slug": "user-research",
      "name": "User Research",
      "description": "User interviews and feedback",
      "document_count": 42
    }
  ]
}
```

### Search Documents

```http
GET /api/mcp/search?workspace=my-workspace&q=user+feedback&limit=20
```

**Parameters:**
- `workspace` (required) - Workspace slug
- `q` (optional) - Search query. If empty, returns recent documents
- `project` (optional) - Filter by project slug
- `limit` (optional) - Max results (default: 20)

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "title": "User Interview - Sarah",
      "content_preview": "Key insights from interview...",
      "project_slug": "user-research",
      "project_name": "User Research",
      "created_at": "2025-10-12T10:30:00Z"
    }
  ],
  "query": "user feedback",
  "count": 15
}
```

### Get Document

```http
GET /api/mcp/documents?workspace=my-workspace&id=123
```

**Parameters:**
- `workspace` (required) - Workspace slug
- `id` (required) - Document ID

**Response:**
```json
{
  "document": {
    "id": 123,
    "title": "User Interview - Sarah",
    "content": "Full document content...",
    "project_slug": "user-research",
    "project_name": "User Research",
    "created_at": "2025-10-12T10:30:00Z"
  }
}
```

### Create Document

```http
POST /api/mcp/documents?workspace=my-workspace
Content-Type: application/json

{
  "title": "New Research Finding",
  "content": "Detailed content here...",
  "project_slug": "user-research"
}
```

**Response:**
```json
{
  "message": "Document created successfully",
  "document": {
    "id": 124,
    "title": "New Research Finding",
    "project_slug": "user-research"
  }
}
```

---

## Integration Guides

### ChatGPT Custom Actions

1. Go to https://chat.openai.com
2. Click your profile → **My GPTs** → **Create a GPT**
3. In the **Configure** tab:
   - **Name**: "Sol Research Assistant"
   - **Description**: "Search and manage research documents in Sol"
   - **Instructions**: "You help users search and manage their UX research documents stored in Sol. When users ask about research, use the search tool to find relevant documents."

4. Click **Actions** → **Create new action**
5. Paste this OpenAPI schema:

```yaml
openapi: 3.0.0
info:
  title: Sol Research API
  version: 1.0.0
servers:
  - url: https://ux-repo-web.vercel.app/api/mcp
paths:
  /workspaces:
    get:
      operationId: listWorkspaces
      summary: List available workspaces
      responses:
        '200':
          description: Workspaces list
  /projects:
    get:
      operationId: listProjects
      summary: List projects in a workspace
      parameters:
        - name: workspace
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Projects list
  /search:
    get:
      operationId: searchDocuments
      summary: Search research documents
      parameters:
        - name: workspace
          in: query
          required: true
          schema:
            type: string
        - name: q
          in: query
          required: false
          schema:
            type: string
        - name: project
          in: query
          required: false
          schema:
            type: string
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        '200':
          description: Search results
  /documents:
    get:
      operationId: getDocument
      summary: Get a specific document
      parameters:
        - name: workspace
          in: query
          required: true
          schema:
            type: string
        - name: id
          in: query
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Document details
    post:
      operationId: createDocument
      summary: Create a new document
      parameters:
        - name: workspace
          in: query
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
                - project_slug
              properties:
                title:
                  type: string
                content:
                  type: string
                project_slug:
                  type: string
      responses:
        '201':
          description: Document created
```

6. Click **Authentication** → **API Key** → **Bearer**
7. Paste your Sol API key
8. Click **Save**

**Usage Example:**
```
You: "Search my research for insights about onboarding"
GPT: [Uses searchDocuments with workspace and query]
```

---

### Claude Projects (Web)

Claude doesn't support custom actions yet, but you can:

1. Create a **Claude Project**
2. Add this to your custom instructions:

```
I have access to a UX research database at Sol. When I need to search research:
- I'll ask the user to run: curl -H "Authorization: Bearer YOUR_KEY" "https://ux-repo-web.vercel.app/api/mcp/search?workspace=WORKSPACE&q=QUERY"
- The user will paste the results
- I'll analyze and summarize them
```

---

### Google Gemini (Coming Soon)

Gemini Extensions are in beta. Once available, follow similar steps to ChatGPT.

---

### Custom Integration (Any LLM)

Use the API directly in your application:

```javascript
const SOL_API_KEY = 'sk-your-key';
const SOL_BASE_URL = 'https://ux-repo-web.vercel.app/api/mcp';

async function searchSol(workspace, query) {
  const response = await fetch(
    `${SOL_BASE_URL}/search?workspace=${workspace}&q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${SOL_API_KEY}`
      }
    }
  );
  return await response.json();
}

// Usage
const results = await searchSol('my-workspace', 'user feedback on navigation');
console.log(results.results);
```

---

## Security

- **Never expose your API key** in public repositories
- **Create separate keys** for each integration
- **Delete unused keys** immediately
- **Monitor usage** in your API Keys dashboard

---

## Rate Limiting

Currently, there are no rate limits, but usage is tracked per API key. Rate limiting will be added based on your organization's plan:

- **Free**: 1,000 requests/day
- **Pro**: 10,000 requests/day
- **Enterprise**: Unlimited

---

## Support

Questions? Issues?
- Email: support@sol-research.com
- GitHub: [github.com/your-repo/issues](https://github.com)
- Docs: [docs.sol-research.com](https://docs.sol-research.com)

---

## Example: End-to-End ChatGPT Workflow

1. **User**: "What did we learn from user interviews about the checkout flow?"

2. **ChatGPT** calls `searchDocuments`:
   ```json
   {
     "workspace": "my-workspace",
     "q": "checkout flow user interviews",
     "limit": 10
   }
   ```

3. **Sol returns** relevant documents

4. **ChatGPT** reads full documents using `getDocument`

5. **ChatGPT** synthesizes insights and presents them to the user

6. **User**: "Create a summary document"

7. **ChatGPT** calls `createDocument`:
   ```json
   {
     "workspace": "my-workspace",
     "title": "Checkout Flow Insights Summary",
     "content": "Based on 5 user interviews...",
     "project_slug": "user-research"
   }
   ```

8. **Done!** The summary is now saved in Sol.

