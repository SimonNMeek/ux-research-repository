import { BoardState, Card, ColumnId } from './types';
import Papa from 'papaparse';

export interface CSVRow {
  id?: string;
  title: string;
  description?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low' | 'V2' | 'None';
  column?: ColumnId;
  md_filename?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Raw CSV row interface for parsing
interface RawCSVRow {
  [key: string]: string | undefined;
}

export function parseCSV(csvText: string): CSVRow[] {
  const result = Papa.parse<RawCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
  }

  // Map the raw CSV data to our expected format
  return result.data.map((row, index) => {
    // Map different possible column names to our standard format
    const title = row.Item || row.title || row.Title || row.name || row.Name || `Task ${index + 1}`;
    const description = row.Description || row.description || '';
    const priority = mapPriority(row.Priority || row.priority || 'None');
    const status = row.Status || row.status || '';
    const column = mapStatusToColumn(status);
    const assignee = row.Assignee || row.assignee || '';
    const dueDate = row['Due Date'] || row.dueDate || '';
    const sprint = row.Sprint || row.sprint || '';
    const storyPoints = row['Story Points'] || row.storyPoints || '';
    const type = row.Type || row.type || '';

    // Create a rich description from available fields
    const richDescription = [
      description,
      assignee && `Assignee: ${assignee}`,
      dueDate && `Due Date: ${dueDate}`,
      sprint && `Sprint: ${sprint}`,
      storyPoints && `Story Points: ${storyPoints}`,
      type && `Type: ${type}`
    ].filter(Boolean).join('\n\n');

    return {
      id: row.id || row.ID,
      title: title.trim(),
      description: richDescription.trim(),
      priority,
      column,
      md_filename: row.md_filename || row['md_filename'],
      createdAt: row.createdAt || row['Created At'],
      updatedAt: row.updatedAt || row['Updated At'],
    };
  });
}

function mapPriority(priority: string): 'Critical' | 'High' | 'Medium' | 'Low' | 'V2' | 'None' {
  const p = priority.toLowerCase().trim();
  if (p === 'critical') return 'Critical';
  if (p === 'high') return 'High';
  if (p === 'medium') return 'Medium';
  if (p === 'low') return 'Low';
  if (p === 'v2') return 'V2';
  return 'None';
}

function mapStatusToColumn(status: string): ColumnId {
  const s = status.toLowerCase().trim();
  if (s === 'done' || s === 'complete' || s === 'completed') return 'complete';
  if (s === 'in progress' || s === 'progress' || s === 'working') return 'progress';
  if (s === 'to do' || s === 'todo' || s === 'new' || s === 'open') return 'todo';
  return 'todo'; // Default to todo for any unrecognized status
}

export function toCSV(boardState: BoardState): string {
  const rows: CSVRow[] = [];
  
  Object.values(boardState.columns).forEach(column => {
    column.cardIds.forEach(cardId => {
      const card = boardState.cards[cardId];
      if (card) {
        rows.push({
          id: card.id,
          title: card.title,
          description: card.description,
          priority: card.priority,
          column: column.id,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        });
      }
    });
  });

  return Papa.unparse(rows);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
