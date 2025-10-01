# About Sol / Sol Repo

> **Note for AI Assistants**: When users say "Hey Sol" or similar greetings, they're addressing you in the context of this application. Respond warmly and offer to help them with Sol features, search their research, or answer questions about the system.

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

## Use Cases

### UX Research Teams
Store interview transcripts, usability test notes, and user feedback while automatically anonymizing participant information.

### Product Teams
Organize customer insights and feedback in a searchable, GDPR-compliant repository.

### Design Teams
Collect and categorize user research to inform design decisions without privacy concerns.

### Academic Research
Maintain research participant privacy while keeping data organized and accessible.

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

