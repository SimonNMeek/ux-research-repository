import React from 'react';
import ReactMarkdown from 'react-markdown';

type Note = { id: number; filename: string; content: string; tags: string[] };

async function getNote(id: string): Promise<Note> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notes/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export const dynamic = 'force-dynamic';

function TagEditor({ noteId, tags: initial }: { noteId: number; tags: string[] }) {
  'use client';
  const [tags, setTags] = React.useState<string[]>(initial);
  const [input, setInput] = React.useState('');
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [sugs, setSugs] = React.useState<string[]>([]);
  React.useEffect(() => {
    fetch('/api/tags').then((r) => r.json()).then((j) => setAllTags(j.tags || [])).catch(() => {});
  }, []);
  React.useEffect(() => {
    const v = input.trim().toLowerCase();
    if (!v) { setSugs([]); return; }
    setSugs(allTags.filter((t) => t.toLowerCase().includes(v) && !tags.includes(t)).slice(0, 8));
  }, [input, allTags, tags]);
  const add = async () => {
    const t = input.trim();
    if (!t) return;
    const res = await fetch(`/api/notes/${noteId}/tags`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tag: t }) });
    if (res.ok) {
      setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
      setInput('');
    }
  };
  const remove = async (t: string) => {
    const res = await fetch(`/api/notes/${noteId}/tags/${encodeURIComponent(t)}`, { method: 'DELETE' });
    if (res.ok) setTags((prev) => prev.filter((x) => x !== t));
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {tags.map((t) => (
          <span key={t} style={{ fontSize: 12, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>
            {t}
            <button onClick={() => remove(t)} style={{ marginLeft: 6, fontSize: 10 }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="add tag" style={{ padding: 8 }} />
        <button onClick={add}>Add tag</button>
        {sugs.length > 0 && (
          <div style={{ position: 'absolute', top: 36, left: 0, background: 'white', border: '1px solid #ddd', zIndex: 10 }}>
            {sugs.map((t) => (
              <div key={t} style={{ padding: '6px 8px', cursor: 'pointer' }} onClick={() => { setInput(t); setSugs([]); }}>
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function NotePage({ params }: { params: { id: string } }) {
  const note = await getNote(params.id);
  const isMd = note.filename.endsWith('.md');
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <a href="/">← Back</a>
      <h1 style={{ marginTop: 12 }}>{note.filename}</h1>
      <TagEditor noteId={note.id} tags={note.tags} />
      <article style={{ lineHeight: 1.6 }}>
        {isMd ? (
          <div style={{ lineHeight: 1.6 }}>
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap' }}>{note.content}</pre>
        )}
      </article>
    </div>
  );
}


