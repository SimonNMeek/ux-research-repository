import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { parseCSV, CSVRow } from '@/lib/kanban/csv';
import { createCard, createAttachment, getFileType } from '@/lib/kanban/storage';
import { Card, Attachment, Priority, ColumnId } from '@/lib/kanban/types';

// Helper function to encode Unicode strings to base64
function encodeToBase64(str: string): string {
  try {
    // First encode to UTF-8 bytes, then to base64
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('Failed to encode string to base64:', error);
    // Fallback: remove non-ASCII characters
    return btoa(str.replace(/[^\x00-\x7F]/g, '?'));
  }
}

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cards: Card[], attachments: Attachment[], cardColumns: Record<string, ColumnId>) => void;
}

export function ImportDialog({ isOpen, onClose, onImport }: ImportDialogProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mdFiles, setMdFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCsvFile(file || null);
    setError(null);
  };

  const handleMdFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setMdFiles(files);
    setError(null);
  };

  const handleImport = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read CSV file
      const csvText = await csvFile.text();
      const csvRows = parseCSV(csvText);

      // Read Markdown files
      const mdFileMap = new Map<string, string>();
      for (const file of mdFiles) {
        const content = await file.text();
        mdFileMap.set(file.name, content);
      }

      // Convert CSV rows to cards
      const cards: Card[] = [];
      const attachments: Attachment[] = [];
      const cardColumns: Record<string, ColumnId> = {};

      for (const row of csvRows) {
        const card = createCard(
          row.title,
          row.description || '',
          (row.priority as Priority) || 'None', // Default to 'None'
          'todo' // Always create in todo, we'll move it later
        );

        // Override ID and dates if provided
        if (row.id) card.id = row.id;
        if (row.createdAt) card.createdAt = row.createdAt;
        if (row.updatedAt) card.updatedAt = row.updatedAt;

        // Store the target column for this card
        cardColumns[card.id] = (row.column as ColumnId) || 'todo';

        cards.push(card);

        // Attach Markdown file if specified
        if (row.md_filename && mdFileMap.has(row.md_filename)) {
          const mdContent = mdFileMap.get(row.md_filename)!;
          const attachment = createAttachment(
            row.md_filename,
            `data:text/markdown;base64,${encodeToBase64(mdContent)}`,
            'markdown'
          );
          card.attachmentIds.push(attachment.id);
          attachments.push(attachment);
        } else {
          // Try to auto-match Markdown files based on title
          const titleForMatch = card.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const [filename, content] of mdFileMap.entries()) {
            const filenameForMatch = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (filenameForMatch.includes(titleForMatch) || titleForMatch.includes(filenameForMatch)) {
              const attachment = createAttachment(
                filename,
                `data:text/markdown;base64,${encodeToBase64(content)}`,
                'markdown'
              );
              card.attachmentIds.push(attachment.id);
              attachments.push(attachment);
              break; // Only attach the first matching file
            }
          }
        }
      }

             onImport(cards, attachments, cardColumns);
      onClose();
      
      // Reset form
      setCsvFile(null);
      setMdFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Cards</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">CSV File *</Label>
            <div className="mt-1">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supports: Item, Description, Priority, Status, Assignee, Due Date, Sprint, Story Points, Type
            </p>
          </div>
          
          <div>
            <Label htmlFor="md-files">Markdown Files (Optional)</Label>
            <div className="mt-1">
              <Input
                id="md-files"
                type="file"
                accept=".md,.markdown"
                multiple
                onChange={handleMdFilesChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Files will be automatically matched to cards by title similarity
            </p>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!csvFile || isLoading}
            >
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
