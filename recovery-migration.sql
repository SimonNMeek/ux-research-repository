-- Recovery migration: Transfer data from broken database to new structure
-- This migrates existing documents, tags, and projects

ATTACH DATABASE 'db/data.sqlite.broken' AS broken;

-- Migrate workspace_tags from old tags table
INSERT OR IGNORE INTO workspace_tags (workspace_id, name, created_at)
SELECT 1, name, datetime('now') FROM broken.tags;

-- Migrate documents from broken database
INSERT INTO documents (project_id, title, body, original_text, clean_text, is_favorite, created_at)
SELECT 
    1, -- project_id for Legacy Research
    title,
    body,
    body as original_text,
    body as clean_text,
    is_favorite,
    created_at
FROM broken.documents;

-- Migrate document_tags relationships
INSERT INTO document_tags (document_id, tag_id)
SELECT 
    d.id,
    wt.id
FROM broken.document_tags bdt
JOIN broken.documents bd ON bdt.document_id = bd.id
JOIN broken.tags bt ON bdt.tag_id = bt.id
JOIN documents d ON d.id = bd.id
JOIN workspace_tags wt ON wt.name = bt.name
WHERE wt.workspace_id = 1;

-- Also migrate any legacy notes to documents
INSERT INTO documents (project_id, title, body, original_text, clean_text, created_at)
SELECT 
    1, -- project_id for Legacy Research
    filename as title,
    content as body,
    content as original_text,
    content as clean_text,
    created_at
FROM broken.notes
WHERE filename NOT IN (SELECT title FROM documents);

-- Update workspace_tags by extracting actual tag names from document_tags
INSERT OR IGNORE INTO workspace_tags (workspace_id, name, created_at)
SELECT DISTINCT 1, bt.name, datetime('now')
FROM broken.document_tags bdt
JOIN broken.tags bt ON bdt.tag_id = bt.id;

DETACH DATABASE broken;
