import { BoardState, Card, ColumnId, Priority } from './types';

export function createSeedBoard(): BoardState {
  const now = new Date().toISOString();
  
  // Fixed IDs for consistent seed data
  const mvpCard: Card = {
    id: 'seed-mvp-card',
    title: "MVP: drag & drop",
    description: "Implement dnd-kit for columns & cards.",
    priority: "Critical",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
  
  const csvCard: Card = {
    id: 'seed-csv-card',
    title: "CSV import",
    description: "Support Notion-style export mapping.",
    priority: "High",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
  
  const ideaCard: Card = {
    id: 'seed-idea-card',
    title: "New feature idea",
    description: "Brainstorming new functionality for the app.",
    priority: "None",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
  
  const performanceCard: Card = {
    id: 'seed-performance-card',
    title: "Long text performance",
    description: "Textarea should handle long AI outputs.",
    priority: "Medium",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
  
  const persistenceCard: Card = {
    id: 'seed-persistence-card',
    title: "Local persistence",
    description: "localStorage save/load with debounce.",
    priority: "Low",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };
  
  const polishCard: Card = {
    id: 'seed-polish-card',
    title: "UI polish",
    description: "Badges, counts, responsive columns.",
    priority: "V2",
    createdAt: now,
    updatedAt: now,
    attachmentIds: [],
  };

  return {
    columns: {
      todo: {
        id: 'todo',
        title: 'To-do',
        cardIds: [mvpCard.id, csvCard.id, ideaCard.id],
      },
      progress: {
        id: 'progress',
        title: 'In Progress',
        cardIds: [performanceCard.id],
      },
      complete: {
        id: 'complete',
        title: 'Complete',
        cardIds: [persistenceCard.id, polishCard.id],
      },
    },
    cards: {
      [mvpCard.id]: mvpCard,
      [csvCard.id]: csvCard,
      [ideaCard.id]: ideaCard,
      [performanceCard.id]: performanceCard,
      [persistenceCard.id]: persistenceCard,
      [polishCard.id]: polishCard,
    },
    attachments: {},
    version: 1,
    lastSavedAt: now,
  };
}
