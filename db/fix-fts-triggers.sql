-- Fix FTS triggers to avoid conflicts with non-text column updates
-- This allows updating is_favorite without triggering FTS updates

-- Drop existing triggers
DROP TRIGGER IF EXISTS documents_au;

-- Create new trigger that only updates FTS when text content changes
CREATE TRIGGER documents_au AFTER UPDATE ON documents 
WHEN NEW.title != OLD.title OR NEW.body != OLD.body
BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, body)
  VALUES('delete', OLD.id, OLD.title, OLD.body);
  INSERT INTO documents_fts(rowid, title, body)
  VALUES (NEW.id, NEW.title, NEW.body);
END;
