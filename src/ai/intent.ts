export type Intents = {
  wantsFullList: boolean;
  wantsSummarize: boolean;
  wantsList: boolean;
  wantsProjects: boolean;
  wantsSearch: boolean;
  requestedIndex: number | null;
  titleFragment: string;
  searchQuery: string | null;
};

const FULL_LIST_RE = /\b(full list|list all|show all|all of them|give me all|entire list)\b/i;
const SUMMARIZE_RE = /(summari[sz]e|sum up|read|open|explain)\b/i;
const LIST_RE = /(what\s+documents|which\s+documents|list\s+documents|show\s+documents|list\s+docs|show\s+docs)/i;
const PROJECTS_RE = /(what\s+projects|which\s+projects|list\s+projects|show\s+projects)/i;
const SEARCH_RE = /\b(search|find|look\s+for)\b/i;

export function detectIntents(message: string): Intents {
  const wantsFullList = FULL_LIST_RE.test(message);
  const wantsSummarize = SUMMARIZE_RE.test(message);
  const wantsList = LIST_RE.test(message);
  const wantsProjects = PROJECTS_RE.test(message);
  const wantsSearch = SEARCH_RE.test(message);

  const numberMatch = message.match(/\b(\d{1,3})\b/);
  const requestedIndex = numberMatch ? parseInt(numberMatch[1], 10) : null;

  const titleFragmentMatch = message.match(/(?:summari[sz]e|read|open|explain)\s+(.+)/i);
  const rawTitleFragment = titleFragmentMatch ? titleFragmentMatch[1].trim() : '';
  const titleFragment = normaliseForMatch(rawTitleFragment);

  let searchQuery: string | null = null;
  const qm = message.match(/(?:search|find|look\s+for)\s+(.+)/i);
  if (qm && qm[1]) searchQuery = qm[1].trim();

  return { wantsFullList, wantsSummarize, wantsList, wantsProjects, wantsSearch, requestedIndex, titleFragment, searchQuery };
}

export function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, ' ').trim();
}

export function formatDocumentList(docs: Array<{ title: string; project_slug?: string; project_name?: string }>): string {
  return docs
    .map((doc, idx) => `${idx + 1}. ${doc.title} (${doc.project_slug || doc.project_name || 'unknown'})`)
    .join('\n');
}



