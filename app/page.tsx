"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Result = { id: number; filename: string; snippet?: string; tags: string[] };
type Note = { id: number; filename: string; content: string; tags: string[] };

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ open: boolean; note: Note | null; loading: boolean }>({ open: false, note: null, loading: false });

  const prevent = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    prevent(e);
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, [prevent]);

  const onUpload = useCallback(async () => {
    if (!file) return;
    if (!(file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      alert('Only .txt and .md allowed');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('tags', tagsInput);
    const res = await fetch('/api/notes', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Upload failed');
      return;
    }
    setFile(null);
    setTagsInput('');
    await runSearch();
  }, [file, tagsInput]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (tagFilter.trim()) params.append('tag', tagFilter.trim());
    const res = await fetch(`/api/notes?${params.toString()}`);
    const json = await res.json();
    setResults(json.results || []);
    setLoading(false);
  }, [query, tagFilter]);

  useEffect(() => {
    const h = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(h);
  }, [query, tagFilter, runSearch]);

  useEffect(() => {
    fetch('/api/tags').then((r) => r.json()).then((j) => setAllTags(j.tags || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const v = tagFilter.trim().toLowerCase();
    if (!v) {
      setTagSuggestions([]);
      return;
    }
    setTagSuggestions(allTags.filter((t) => t.toLowerCase().includes(v)).slice(0, 8));
  }, [tagFilter, allTags]);

  const parseTags = useCallback((text: string): string[] => {
    return text
      .split(',')
      .map((t) => t.trim())
      .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i);
  }, []);

  const setTagsFromSet = useCallback((tags: Set<string>) => {
    setTagsInput([...tags].join(','));
  }, []);

  const fileLabel = useMemo(() => {
    if (!file) return 'Drag a .txt/.md file here or click to select';
    const kb = (file.size / 1024).toFixed(0);
    return `${file.name} (${kb} KB)`;
  }, [file]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Sol Research</h1>
      <div
        onDragEnter={(e) => {
          prevent(e);
          setDragActive(true);
        }}
        onDragOver={prevent}
        onDragLeave={(e) => {
          prevent(e);
          setDragActive(false);
        }}
        onDrop={onDrop}
        style={{
          border: '2px dashed #888',
          padding: 24,
          borderRadius: 8,
          background: dragActive ? '#fafafa' : 'transparent',
          cursor: 'default',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <p style={{ margin: 0 }}>{fileLabel}</p>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => inputRef.current?.click()}>Browse files</button>
        </div>
        {allTags.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Previous tags</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allTags.map((t) => {
                const selected = parseTags(tagsInput).includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const current = new Set(parseTags(tagsInput));
                      if (current.has(t)) current.delete(t); else current.add(t);
                      setTagsFromSet(current);
                    }}
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 12,
                      border: '1px solid ' + (selected ? '#0366d6' : '#ddd'),
                      background: selected ? '#eaf3ff' : '#fff',
                      color: selected ? '#024ea2' : '#333',
                      cursor: 'pointer'
                    }}
                    aria-pressed={selected}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Add new tag</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="comma,separated,tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={onUpload} disabled={!file}>Add</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input
          placeholder="Search filename/content"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 2, padding: 8 }}
        />
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            placeholder="Filter by tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
          {tagSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10 }}>
              {tagSuggestions.map((t) => (
                <div key={t} style={{ padding: '6px 8px', cursor: 'pointer' }} onClick={() => setTagFilter(t)}>{t}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? <p>Loading…</p> : null}
        {results.length === 0 && !loading ? <p>No results</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {results.map((r) => (
            <li key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <button
                onClick={async () => {
                  setPreview({ open: true, note: null, loading: true });
                  try {
                    const res = await fetch(`/api/notes/${r.id}`, { cache: 'no-store' });
                    const note = await res.json();
                    setPreview({ open: true, note, loading: false });
                  } catch {
                    setPreview({ open: true, note: null, loading: false });
                  }
                }}
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: '#0366d6', cursor: 'pointer', fontWeight: 600 }}
              >
                {r.filename}
              </button>
              <a href={`/notes/${r.id}`} style={{ marginLeft: 8, fontSize: 12 }} aria-label="Open full page">↗</a>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  aria-label="Delete note"
                  title="Delete"
                  onClick={async () => {
                    if (!confirm('Delete this note?')) return;
                    const res = await fetch(`/api/notes/${r.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      runSearch();
                      if (preview.open && preview.note?.id === r.id) setPreview({ open: false, note: null, loading: false });
                    } else {
                      const err = await res.json().catch(() => ({}));
                      alert(err?.error || 'Delete failed');
                    }
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a00' }}
                >
                  🗑️
                </button>
              </div>
              </div>
              {r.snippet ? <p style={{ margin: '8px 0 4px', color: '#555' }}>{r.snippet}</p> : null}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.tags.map((t) => (
                  <span key={t} style={{ fontSize: 12, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {preview.open && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setPreview({ open: false, note: null, loading: false })}
        >
          <div
            style={{ maxWidth: 800, width: '90%', maxHeight: '80vh', overflow: 'auto', background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <strong>{preview.note?.filename || 'Opening…'}</strong>
              <button onClick={() => setPreview({ open: false, note: null, loading: false })} aria-label="Close" style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {preview.loading && <p>Loading…</p>}
              {!preview.loading && preview.note && (
                preview.note.filename.endsWith('.md') ? (
                  <ReactMarkdown>{preview.note.content}</ReactMarkdown>
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{preview.note.content}</pre>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
