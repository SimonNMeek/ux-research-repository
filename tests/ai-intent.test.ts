import { describe, it, expect } from 'vitest';
import { detectIntents, formatDocumentList, normaliseForMatch } from '@/src/ai/intent';

describe('AI intent detection', () => {
  it('detects list intent for "what documents do I have in User Experience"', () => {
    const intents = detectIntents('What documents do I have in the User Experience project?');
    expect(intents.wantsList).toBe(true);
    expect(intents.wantsFullList).toBe(false);
  });

  it('detects full list intent', () => {
    const intents = detectIntents('Full list');
    expect(intents.wantsFullList).toBe(true);
  });

  it('detects summarize by title and extracts fragment', () => {
    const intents = detectIntents('Summarise user_interview3.md');
    expect(intents.wantsSummarize).toBe(true);
    expect(intents.titleFragment).toContain('user_interview3');
  });

  it('detects summarize by index', () => {
    const intents = detectIntents('summarize 3');
    expect(intents.wantsSummarize).toBe(true);
    expect(intents.requestedIndex).toBe(3);
  });

  it('detects projects intent', () => {
    const intents = detectIntents('which projects do I have?');
    expect(intents.wantsProjects).toBe(true);
  });

  it('detects search intent and extracts query', () => {
    const intents = detectIntents('search interview pain points');
    expect(intents.wantsSearch).toBe(true);
    expect(intents.searchQuery).toBe('interview pain points');
  });
});

describe('List formatting', () => {
  it('formats a deterministic, numbered list', () => {
    const list = formatDocumentList([
      { title: 'user_interview1.md', project_slug: 'user-experience' },
      { title: 'user_interview2.md', project_name: 'User Experience' },
    ]);
    expect(list).toMatchInlineSnapshot(`
"1. user_interview1.md (user-experience)\n2. user_interview2.md (User Experience)"
`);
  });
});

describe('Normalisation', () => {
  it('normalises for fuzzy matching', () => {
    expect(normaliseForMatch(' User   Experience! ')).toBe('user experience');
    expect(normaliseForMatch('Su8mmarise')).toBe('su8mmarise');
  });
});



