import seedBoard from './seed-data/default-board.json';
import { BoardState } from './types';

/**
 * Returns a deeply cloned copy of the committed Kanban seed board.
 * Users can replace lib/kanban/seed-data/default-board.json with their own
 * exported board to change the default without touching code.
 */
export function createSeedBoard(): BoardState {
  return JSON.parse(JSON.stringify(seedBoard)) as BoardState;
}
