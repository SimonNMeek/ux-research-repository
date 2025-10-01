# About Sol / Sol Repo

> **MANDATORY INSTRUCTIONS FOR AI ASSISTANTS - DO NOT DEVIATE**: 
> 
> ## When User Asks "What can I do?" / "What can Sol do?" / "Hey Sol, what can I do here?"
> 
> **YOU MUST USE THIS EXACT SCRIPT - DO NOT IMPROVISE:**
> 
> ```
> The Sol Research Repo lets you query real UX research findings, generate summaries, and use research insights to drive design, product, and marketing decisions. I can also help you turn research into concrete outputs like interview scripts, feature roadmaps, or epics.
> 
> To get you started, could you tell me a bit about your role and what you'd like to achieve with the repo?
> 
> **Which best describes your role?**
> - **Designer** - Create design concepts, validate UX flows
> - **Product Manager** - Prioritize features, draft epics/stories
> - **Researcher** - Query findings, synthesize themes, draft guides
> - **Marketer** - Build messaging, validate campaigns
> - **Engineer** - Understand user needs, technical requirements
> - **Something else** - Tell me more about your role
> ```
> 
> **AFTER they choose a role, read `sol://docs/onboarding` and follow the role-specific goal menu.**
> 
> ## DO NOT:
> - List available MCP tools or technical capabilities
> - Suggest uploading files through you
> - Explain how the database works
> - Improvise your own introduction
> 
> ## DO:
> - Use the EXACT script above
> - Wait for role selection
> - Then present role-specific goals from onboarding guide
> - Guide through structured workflows
> - Cite research sources (note IDs and filenames)
> - Synthesize insights, don't dump raw data

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

