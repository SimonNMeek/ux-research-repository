import { BoardState, Card, Attachment, Priority, ColumnId } from './types';
import { nanoid } from 'nanoid';
import { KanbanBackup } from './backup';
import { createSeedBoard } from './seed';

const STORAGE_KEY = 'sol-kanban-board';

// Debounced save function
let saveTimeout: NodeJS.Timeout | null = null;

export async function saveBoardState(state: BoardState): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    try {
      const stateToSave = {
        ...state,
        lastSavedAt: new Date().toISOString(),
      };
      
      // Save to robust backup system
      await KanbanBackup.saveData(stateToSave, {
        autoExport: false, // Disabled - no Downloads folder clutter
        multipleStorage: true,
        cloudBackup: true
      });
      
      // Also save to direct localStorage for compatibility
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save board state:', error);
    }
  }, 300);
}

export async function loadBoardState(): Promise<BoardState> {
  try {
    // Try to load from robust backup system first
    const backupData = await KanbanBackup.loadData();
    if (backupData) {
      return backupData;
    }
    
    // Fallback to direct localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed as BoardState;
    }
  } catch (error) {
    console.error('Failed to load board state:', error);
  }
  
  // Return seed data if no stored data
  return createSeedBoard();
}

export function clearBoardState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    KanbanBackup.clearAllBackups();
  } catch (error) {
    console.error('Failed to clear board state:', error);
  }
}

export function createCard(
  title: string,
  description: string = '',
  priority: Priority = 'Medium',
  columnId: ColumnId = 'todo'
): Card {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    title,
    description,
    priority,
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
}

export function createAttachment(
  name: string,
  dataUrl: string,
  type: 'markdown' | 'csv' | 'other' = 'other',
  size?: number
): Attachment {
  return {
    id: nanoid(),
    name,
    type,
    dataUrl,
    size,
    createdAt: new Date().toISOString(),
  };
}

export function getFileType(filename: string): 'markdown' | 'csv' | 'other' {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'csv') return 'csv';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
