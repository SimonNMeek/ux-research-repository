# About Sol / Sol Repo

> **CRITICAL INSTRUCTIONS FOR AI ASSISTANTS**: 
> 
> **When users ask "What can I do?" or "What can Sol do?" or "Hey Sol, what can I do here?":**
> 1. **IMMEDIATELY** read the `sol://docs/onboarding` resource
> 2. Follow the onboarding flow exactly as specified
> 3. Start with the value proposition, then ask about their role
> 4. DO NOT list MCP tools - users interact via the web UI, not through you
> 
> **Your role with Sol:**
> - **Query & synthesize research** for users using `search_notes` and `get_note` tools
> - **Guide workflows** based on user role (Designer, PM, Researcher, Marketer, Engineer)
> - **Generate insights** from research findings
> - **Create outputs** like user stories, interview scripts, design concepts
> - **NOT** to add files or tags (users do this via the web UI)
> 
> **When users say "Hey Sol":**
> - Respond warmly, check for preferences with `get_user_preference(userId: "default")`
> - If no preferences exist, start onboarding journey
> - If preferences exist, welcome them back and suggest resuming or starting new task
> 
> **Always:**
> - Cite research sources (note IDs and filenames)
> - Ask clarifying questions before searching
> - Synthesize insights, don't just dump raw data
> - Offer to save workflow preferences when completing tasks

**Sol** (also known as **Sol Repo** or **UX Repo**) is a privacy-first UX research repository designed to help teams organize, search, and analyze user research while maintaining GDPR compliance.

## What is Sol?

Sol is a web-based application that allows UX researchers, product teams, and designers to:

- **Store and organize** user research documents (interviews, surveys, usability tests)
- **Search and filter** research by content or tags
- **Anonymize PII** automatically to comply with GDPR/privacy regulations
- **Tag and categorize** research for easy discovery
- **Maintain privacy** with built-in anonymization engine

## Key Features

### 1. **Document Management**
- Upload `.txt` and `.md` files
- Organize with custom tags
- Search by filename and content
- Favorite important documents
- Rename and manage files easily

### 2. **PII Anonymization**
- **Automatic detection** of 11+ PII types:
  - Names (full names and single names)
  - Email addresses
  - Phone numbers (UK + international)
  - Physical addresses & postcodes
  - Organizations/companies
  - Credit/debit card numbers
  - Bank details (IBAN, sort codes)
  - National Insurance numbers
  - Passport numbers
  - URLs and IP addresses
  - Dates of birth

- **Multiple strategies**:
  - Redaction: `[REDACTED:TYPE]`
  - Masking: `d******i@a***********m`
  - Hashing: SHA-256
  - Pseudonymization: `[PSEUDONYM:PERSON:Person 123]`

- **Preview before saving**: See what will be anonymized
- **Re-run on existing docs**: Update anonymization settings
- **Audit trail**: Track all anonymization actions

### 3. **Search & Discovery**
- **Full-text search** across all documents
- **Tag-based filtering**
- **Partial matching** for flexible queries
- **Sort by date or favorites**
- **Responsive card layout** for easy browsing

### 4. **Modern UI/UX**
- **Clean, minimal interface** with Tailwind CSS
- **Accessible components** built with Radix UI
- **Dynamic background** that changes with time of day
- **Markdown support** for rich text viewing
- **Drag-and-drop** file uploads

## Technology Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API Routes, SQLite
- **Anonymization**: Custom TypeScript package
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Lucide React
- **Database**: better-sqlite3 with FTS

## What Sol Does (via AI Assistant)

**Sol is NOT a file management system through Claude** - users upload and manage files via the web UI at http://localhost:3000.

**What you CAN do through Claude + Sol:**
- **Search research**: Query across all documents for specific topics
- **Extract insights**: Synthesize findings from multiple sources
- **Generate outputs**: Create user stories, interview scripts, design concepts
- **Workflow guidance**: Get role-specific assistance with research-driven tasks
- **Answer questions**: "What did users say about X?" with citations

**What you CANNOT do through Claude:**
- Upload files (use the web UI)
- Add/remove tags (use the web UI)
- Delete files (use the web UI)
- Rename files (use the web UI)

## Use Cases (via Claude)

### UX Research Teams
Query interview transcripts, synthesize themes across studies, generate research summaries.

### Product Teams
Extract feature requirements from research, prioritize based on user needs, draft epics with research citations.

### Design Teams
Validate designs against research, extract user preferences, generate design concepts from insights.

### Academic Research
Query findings, identify research gaps, synthesize themes across participant interviews.

## Privacy & Compliance

Sol is built with privacy-first principles:

- **Local-first**: Data stays on your infrastructure
- **GDPR-compliant**: Automatic PII anonymization
- **Audit trails**: Track what was anonymized and when
- **Reversible**: Original data preserved for authorized access
- **Configurable**: Control what gets anonymized and how

## Getting Started

1. **Upload documents**: Drag-and-drop `.txt` or `.md` files
2. **Configure anonymization**: Choose what PII to detect and how to handle it
3. **Preview results**: See anonymized content before saving
4. **Tag and organize**: Add tags for easy filtering
5. **Search and discover**: Find insights across all your research

## Branding

Sol is also known as:
- **Sol Repo** - The full product name
- **UX Repo** - Common shorthand
- **Sol** - Quick reference

All three names refer to the same application and can be used interchangeably.

