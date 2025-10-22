import { z } from 'zod';
import { Priority, ColumnId } from './types';

export const PrioritySchema = z.enum(["Critical", "High", "Medium", "Low", "V2"]);
export const ColumnIdSchema = z.enum(["todo", "progress", "complete"]);

export const CardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PrioritySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  attachmentIds: z.array(z.string()),
});

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["markdown", "csv", "other"]),
  dataUrl: z.string(),
  size: z.number().optional(),
  createdAt: z.string(),
});

export const BoardStateSchema = z.object({
  columns: z.record(ColumnIdSchema, z.object({
    id: ColumnIdSchema,
    title: z.string(),
    cardIds: z.array(z.string()),
  })),
  cards: z.record(z.string(), CardSchema),
  attachments: z.record(z.string(), AttachmentSchema),
  version: z.number(),
  lastSavedAt: z.string().optional(),
});

export const CSVRowSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  priority: PrioritySchema.optional(),
  column: ColumnIdSchema.optional(),
  md_filename: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
