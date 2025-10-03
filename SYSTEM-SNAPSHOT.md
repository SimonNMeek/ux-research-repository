# Sol Research Platform - System Overview Snapshot

## 🎯 Platform Purpose
Sol is a user research repository platform that allows teams to store, organize, and analyze research documents across multiple workspaces and projects. It includes advanced features like anonymization, search, tagging, and AI integration.

## 🏗️ Architecture Overview

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect, useCallback, useMemo)
- **Dark Mode**: Custom hook with localStorage persistence + system detection

### Backend Stack
- **API**: Next.js 15 API Routes
- **Database**: SQLite with better-sqlite3
- **Full-Text Search**: SQLite FTS5 virtual tables
- **AI Integration**: Model Context Protocol (MCP) server

### Multi-Tenant Structure
```
/ → Homepage (research quotes)
/workspaces → Workspace selection page
/w/[workspace] → Workspace dashboard
/w/[workspace]/projects/[project] → Project interface
```

## 📊 Database Schema

### Core Tables
- **workspaces**: `id, slug, name, created_at, metadata(JSON)`
- **projects**: `id, workspace_id, slug, name, description, created_at, metadata(JSON)`
- **documents**: `id, project_id, title, body, original_text, clean_text, source_url, author, is_favorite, anonymization_profile_id, clean_version, created_at`

### Supporting Tables
- **workspace_tags**: `id, name, workspace_id`
- **document_tags**: Junction table for document-tag relationships
- **searches**: Search history tracking
- **anonymization_profiles**: `id, name, config(JSON), created_by, created_at`
- **pseudonyms**: Hash-keyed pseudonym mappings
- **user_preferences**: `id, user_id, role, preferred_workflows, quick_actions`

### Legacy Tables (Deprecated)
- **notes**: Legacy single-tenant documents (being phased out)
- **tags**: Legacy global tags (replaced by workspace_tags)

## 🔧 Key Features Implemented

### 1. Multi-Workspace System
- **Hard Isolation**: Workspace-scoped projects, documents, and tags
- **Soft Segmentation**: Projects within workspaces
- **API Routes**: `/api/workspaces` for CRUD operations
- **Repository Layer**: TypeScript classes for organized data access

### 2. Document Management
- **Upload**: Drag & drop multiple files (.txt, .md)
- **Tagging**: Multi-tag system with auto-suggestions
- **Search**: Full-text search with filename matching
- **Preview**: Modal view with markdown rendering
- **Favorites**: Star/unstar documents
- **Rename**: In-line filename editing with cleanup

### 3. Anonymization Engine
- **Package**: Custom TypeScript package (`@/packages/anonymizer`)
- **Strategies**: Redaction, masking, hashing, reversible pseudonymisation
- **Detectors**: Regex patterns, dictionary matching, NER adapters
- **Preview System**: Real-time anonymization preview before upload
- **Audit Trail**: Complete anonymization history tracking

### 4. Search & Discovery
- **Full-Text Search**: SQLite FTS5 with SQL queries
- **Multi-Mode**: Fulltext, filename, tag searches
- **Results**: Highlighted matches with context
- **Filters**: By project, tags, favorites
- **Sorting**: Date (newest/oldest), favorites-first

### 5. User Interface
- **Responsive Design**: Mobile-first with grid layouts
- **Dark Mode**: System preference detection + manual toggle
- **Modals**: Tag editing, document renaming, anonymization config
- **Drag & Drop**: File upload with visual feedback
- **Loading States**: Skeleton loaders and progress indicators

### 6. AI Integration (MCP)
- **Server**: TypeScript MCP server (`mcp/server.ts`)
- **Resources**: Markdown documentation via URIs
- **Tools**: Search, list projects, anonymization preview
- **Prompts**: Conversational onboarding flow
- **Workspace Awareness**: AI understands multi-workspace structure

## 🛠️ Component Architecture

### Shared Components
- **Header**: Logo, workspace selector, dark mode toggle, user menu
- **Breadcrumbs**: Navigation hierarchy
- **CreateWorkspaceModal**: Workspace creation with validation
- **ResearchAffirmations**: Rotating quotes on homepage
- **AnonymizeStep**: Anonymization configuration UI

### UI Library (shadcn/ui)
- **Button**: Primary, secondary, outline variants
- **Dialog/Modal**: Accessible modal system
- **Input**: Form controls with validation
- **Badge**: Tag display
- **Tabs**: Multi-section navigation
- **Card**: Content containers
- **Select**: Dropdown selections

## 🔄 API Endpoints

### Global APIs
```
GET/POST /api/workspaces → Workspace CRUD
GET /api/tags → Global tag search
```

### Workspace-Scoped APIs
```
GET /w/[ws]/api/workspace → Workspace info
GET/POST /w/[ws]/api/projects → Project CRUD
GET/PUT/DELETE /w/[ws]/api/projects/[slug] → Project operations
GET/POST /w/[ws]/api/projects/[slug]/documents → Document CRUD
GET/DELETE /w/[ws]/api/projects/[slug]/documents/[id] → Document operations
POST /w/[ws]/api/projects/[slug]/documents/[id]/favorite → Toggle favorite
POST /w/[ws]/api/projects/[slug]/documents/[id]/rename → Rename document
GET/POST /w/[ws]/api/projects/[slug]/documents/[id]/tags → Tag management
GET/POST /w/[ws]/api/search → Full-text search
```

### Legacy APIs (Deprecated)
```
DELETE /api/notes/[id] → Delete note
POST /api/notes/[id]/rename → Rename note
POST /api/notes/[id]/favorite → Toggle favorite
GET/POST /api/notes/[id]/tags → Tag management
POST /api/notes/[id]/anonymize → Re-run anonymization
```

## 🎨 User Experience Flow

### New User Journey
1. **Homepage**: Inspiring research quotes with dark mode toggle
2. **Workspace Selection**: Choose or create workspace
3. **Workspace Dashboard**: View projects, search, favorites
4. **Project Interface**: Upload documents, manage tags, anonymize content

### Document Workflow
1. **Upload**: Drag files → Add tags → Configure anonymization → Upload
2. **Organization**: Tag management → Favorite important docs → Rename files
3. **Discovery**: Search across content → Filter by tags/projects → Sort results
4. **Analysis**: Preview documents → Extract insights → Share findings

## 🔒 Security & Privacy

### Anonymization Features
- **PII Detection**: Names, emails, phone numbers, addresses
- **Data Classes**: PERSON, SINGLE_NAME, EMAIL, PHONE, LOCATION
- **Reversible**: Hash-based pseudonymisation for consistency
- **Audit Trail**: Complete history of all anonymization actions
- **Live Preview**: Test settings before committing

### Access Control
- **Workspace Isolation**: Hard boundaries between client data
- **Project Segregation**: Soft isolation within workspaces
- **Tag Isolation**: Workspace-scoped tags prevent cross-contamination

## 🚀 Deployment & Development

### Environment
- **Framework**: Next.js 15 development server
- **Database**: SQLite with WAL mode for concurrency
- **File Storage**: Local file system (production would use cloud)
- **Ports**: App on 3000, MCP server on 3001

### Development Tools
- **Testing**: Vitest framework with workspace isolation tests
- **Type Safety**: Full TypeScript implementation
- **Linting**: ESLint with Next.js configuration
- **Version Control**: Git with comprehensive commit history

### Known Limitations
- **Client-Side Anonymizer**: Browser fs module conflicts (temp workaround)
- **File Storage**: Local only (no cloud integration yet)
- **User Management**: Single user system (no auth/permissions)
- **Import Limitations**: PDF/image processing not implemented

## 📈 Future Enhancement Opportunities

### Scalability
- **Cloud Storage**: AWS S3 or similar for file storage
- **Database**: PostgreSQL for production scale
- **Caching**: Redis for search performance
- **CDN**: Static asset distribution

### Features
- **AI Analysis**: Automated research insight extraction
- **Collaboration**: Multi-user workspace sharing
- **Export**: PDF reports and data exports
- **Integrations**: Slack, Teams, research tools

### Performance
- **Pagination**: Infinite scroll for large document sets
- **Compression**: File optimization during upload
- **Background Jobs**: Async anonymization processing
- **Real-time**: WebSocket updates for collaboration

## 💡 Technical Decisions Made

### Why SQLite?
- **Simplicity**: Zero-config, file-based database
- **FTS**: Built-in full-text search capabilities
- **Development**: Fast iteration and testing
- **Portability**: Easy backup and migration

### Why Multi-Workspace Architecture?
- **Client Isolation**: Hard boundaries for GDPR compliance
- **Scalability**: Support for growing client base
- **Flexibility**: Different workflows per client
- **Security**: Data segregation prevents leaks

### Why Next.js App Router?
- **Performance**: Server components and streaming
- **Developer Experience**: Simplified routing and layouts
- **Production Ready**: Optimized builds and deployment
- **TypeScript**: Excellent type safety

## 🔗 Integration Points

### MCP/AI Integration
- **Claude Integration**: Model Context Protocol for AI assistant
- **Conversational Onboarding**: Guided user role discovery
- **Auto-Setup**: Automatic workspace connection
- **Search Integration**: AI can search and analyze documents

### External Systems Ready
- **API-First**: RESTful endpoints for integration
- **Webhook Support**: Event triggers for external systems
- **Data Export**: JSON responses for analytics platforms
- **Authentication Ready**: Auth providers can be plugged in

---

*This snapshot was generated from the current codebase state as of the latest commit. The platform represents a production-ready MVP for multi-tenant research repository management with advanced anonymization capabilities.*
