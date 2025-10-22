export type Priority = "Critical" | "High" | "Medium" | "Low" | "V2" | "None";
export type ColumnId = "todo" | "progress" | "complete";
export type SortOption = "priority" | "date";

export interface Attachment {
  id: string;         // nanoid
  name: string;       // filename
  type: "markdown" | "csv" | "other";
  dataUrl: string;    // base64/data URL (stored locally)
  size?: number;
  createdAt: string;  // ISO
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  attachmentIds: string[];
}

export interface BoardState {
  columns: Record<ColumnId, { id: ColumnId; title: string; cardIds: string[] }>;
  cards: Record<string, Card>;
  attachments: Record<string, Attachment>;
  version: number;
  lastSavedAt?: string;
}
