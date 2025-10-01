# Sol Features Guide

## Core Features

### Document Management

#### Upload Files
- Supports `.txt` and `.md` files
- Drag-and-drop interface
- Multiple file upload
- File size limit: 2MB per file
- Automatic content indexing

#### Search & Filter
- **Full-text search**: Search across filenames and content
- **Partial matching**: Find documents with incomplete terms
- **Tag filtering**: Filter by single or multiple tags
- **Combined search**: Search + tag filter together
- **Sort options**:
  - Date (newest first) - default
  - Date (oldest first)
  - Favorites first

#### File Operations
- **View**: Read documents with markdown rendering
- **Edit tags**: Add/remove tags per file
- **Rename**: Clean up filenames from exports
- **Favorite**: Mark important documents
- **Delete**: Remove files permanently
- **Date tracking**: See when files were added

### PII Anonymization Engine

#### Detected PII Types

1. **People**
   - Full names (e.g., "Sarah Thompson")
   - Single names (e.g., "David")
   - Speaker labels (e.g., "*Margaret:*")

2. **Contact Information**
   - Email addresses
   - Phone numbers (UK mobile, landline, international)
   - Physical addresses
   - UK postcodes

3. **Organizations**
   - Company names
   - Organization references

4. **Financial Data**
   - Credit/debit card numbers (with Luhn validation)
   - Expiry dates
   - CVV (complete masking)
   - IBAN/BIC codes
   - UK sort codes and account numbers

5. **Government IDs**
   - National Insurance numbers (UK)
   - NHS numbers (UK)
   - Passport numbers

6. **Digital Identifiers**
   - URLs
   - IP addresses
   - Email addresses

7. **Personal Data**
   - Dates of birth
   - Age references

#### Anonymization Strategies

1. **REDACT**
   - Completely removes PII
   - Format: `[REDACTED:TYPE]`
   - Example: `[REDACTED:EMAIL]`

2. **MASK**
   - Partially obscures PII
   - Shows first/last characters
   - Example: `d******i@a***********m`

3. **HASH**
   - One-way SHA-256 hash
   - Consistent for same value
   - Example: `[HASH:EMAIL:a1b2c3...]`

4. **PSEUDONYM**
   - Reversible anonymization
   - Consistent replacement
   - Example: `[PSEUDONYM:PERSON:Person 123]`

#### Anonymization Workflow

1. **Upload & Configure**
   - Enable/disable anonymization
   - Select PII types to detect
   - Choose strategy per type
   - Set confidence thresholds

2. **Preview**
   - See side-by-side comparison
   - Review detected PII
   - Adjust configuration if needed
   - Generate new preview

3. **Save**
   - Store original content (secure)
   - Save anonymized version
   - Record anonymization profile
   - Create audit log entry

4. **Re-run**
   - Update anonymization on existing files
   - Apply new configurations
   - Version tracking

### Tag System

#### Tag Management
- **Create tags**: Add new tags during upload or later
- **Auto-suggest**: Type to find existing tags
- **Tag editing**: Modify tags on any file
- **Tag filtering**: Click to filter by tag
- **Tag overview**: See all tags in the system

#### Tag Best Practices
- Use consistent naming conventions
- Create category tags (e.g., "interview", "survey")
- Add project tags (e.g., "checkout-flow")
- Include participant type tags (e.g., "busy-parent")
- Date tags for temporal organization

### User Interface

#### Layout
- **Search bar**: Full-text search
- **Tag filter**: Filter by tags
- **Sort button**: Change sort order
- **Upload area**: Drag-and-drop zone
- **File grid**: Responsive card layout (max 3 across)

#### File Cards
- **Filename**: Clean, readable display
- **Tags**: Visual tag badges
- **Date added**: Timestamp
- **Actions**: View, edit tags, rename, favorite, delete

#### Dynamic Background
- **Time-based gradient**: Changes with sun position
- **Timezone aware**: Uses your local time
- **Seasonal adjustments**: Accounts for sunrise/sunset
- **Subtle transitions**: Not distracting

### MCP Integration

Sol provides a Model Context Protocol server for AI assistant integration:

#### Available Tools

1. **search_notes**
   - Search by text query
   - Filter by tag
   - Returns snippets and metadata

2. **get_note**
   - Retrieve full note content
   - Get all tags
   - Access metadata

3. **add_note**
   - Create new notes programmatically
   - Add tags on creation
   - Validate file format

4. **list_tags**
   - Get all available tags
   - Alphabetically sorted

5. **add_tag**
   - Tag existing notes
   - Auto-create tags

## Advanced Features

### File Naming Cleanup
- Removes Notion export hashes
- Strips UUID patterns
- Cleans special characters
- Preserves meaningful names

### Markdown Support
- Full markdown rendering in preview
- Typography plugin for beautiful formatting
- Code syntax highlighting
- Link support
- Lists, tables, formatting

### Search Capabilities
- **Filename search**: Find by file name
- **Content search**: Full-text in documents
- **Partial matching**: Match on incomplete terms
- **Tag search**: Filter by tags
- **Combined search**: Mix all of the above

### Performance
- **SQLite FTS**: Fast full-text search
- **Indexed tags**: Quick tag filtering
- **Optimized queries**: Sub-second search
- **Lazy loading**: Load as you scroll
- **Caching**: Efficient re-renders

## Upcoming Features

- **Batch operations**: Tag/delete multiple files
- **Export**: Download anonymized versions
- **Custom dictionaries**: Add project-specific PII
- **ML-based detection**: Enhanced NER
- **Themes**: Dark mode support
- **Collaboration**: Team sharing
- **Version history**: Track document changes
- **Advanced analytics**: Insight extraction

