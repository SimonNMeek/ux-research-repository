"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit3, Trash2, X, Plus, Heart, Pencil, ArrowUpDown, Tag, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSunBackground } from '@/hooks/useSunBackground';
import AnonymizeStep from '@/components/AnonymizeStep';

  type Result = { id: number; filename: string; snippet?: string; tags: string[]; is_favorite: boolean; created_at: string };
type Note = { id: number; filename: string; content: string; tags: string[]; is_favorite: boolean };

export default function Home() {
  const backgroundColors = useSunBackground();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ open: boolean; note: Note | null; loading: boolean }>({ open: false, note: null, loading: false });
  const [editingTags, setEditingTags] = useState<{ open: boolean; noteId: number | null; currentTags: string[]; newTag: string }>({ open: false, noteId: null, currentTags: [], newTag: '' });
  const [renaming, setRenaming] = useState<{ open: boolean; noteId: number | null; currentFilename: string; newFilename: string }>({ open: false, noteId: null, currentFilename: '', newFilename: '' });
  const [sortBy, setSortBy] = useState<'date-newest' | 'date-oldest' | 'favorites-first'>('date-newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [anonymizationConfig, setAnonymizationConfig] = useState<any>(null);

  const prevent = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    prevent(e);
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    const validFiles = droppedFiles.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'));
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [prevent]);

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

  const onUpload = useCallback(async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    const form = new FormData();
    files.forEach(file => {
      form.append('files', file);
    });
    form.append('tags', tagsInput);
    
    if (anonymizationConfig) {
      form.append('anonymize', 'true');
      form.append('anonymizationConfig', JSON.stringify(anonymizationConfig));
    }
    
    try {
      const res = await fetch('/api/notes', { method: 'POST', body: form });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data?.error || 'Upload failed');
        return;
      }
      
      // Show results
      if (data.results) {
        const errors = data.results.filter((r: any) => r.error);
        const successes = data.results.filter((r: any) => r.id);
        
        if (errors.length > 0) {
          const errorMsg = errors.map((e: any) => `${e.filename}: ${e.error}`).join('\n');
          alert(`Some files failed:\n${errorMsg}`);
        }
        
        if (successes.length > 0) {
          console.log(`Successfully uploaded ${successes.length} file(s)`);
        }
      }
      
      setFiles([]);
      setTagsInput('');
      setAnonymizationConfig(null);
      await runSearch();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [files, tagsInput, anonymizationConfig, runSearch]);

  const handleAnonymizationPreview = useCallback(async (text: string, config: any) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'preview.txt',
          content: text,
          anonymize: true,
          anonymizationConfig: config
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Preview failed');
      
      // Return the anonymization result
      return {
        anonymizedText: data.anonymizedText || text,
        matches: data.matches || [],
        summary: data.summary || { totalMatches: 0, byType: {}, byStrategy: {} }
      };
    } catch (error) {
      console.error('Preview failed:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      runSearch();
    }, 250);
    return () => clearTimeout(h);
  }, [query, tagFilter, runSearch]);

  useEffect(() => {
    const loadInitialData = async () => {
      // Load tags
      try {
        const tagsRes = await fetch('/api/tags');
        const tagsJson = await tagsRes.json();
        setAllTags(tagsJson.tags || []);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
      
      // Load files
      try {
        setLoading(true);
        const res = await fetch('/api/notes');
        const json = await res.json();
        setResults(json.results || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load files:', error);
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array - only run on mount

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

  const openTagEditor = useCallback((noteId: number, currentTags: string[]) => {
    setEditingTags({ open: true, noteId, currentTags, newTag: '' });
  }, []);

  const addTagToNote = useCallback(async (noteId: number, tag: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      });
      if (res.ok) {
        setEditingTags(prev => ({
          ...prev,
          currentTags: [...prev.currentTags, tag]
        }));
        await runSearch();
        // Refresh all tags
        fetch('/api/tags').then((r) => r.json()).then((j) => setAllTags(j.tags || [])).catch(() => {});
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to add tag');
      }
    } catch (err) {
      alert('Failed to add tag');
    }
  }, [runSearch]);

  const removeTagFromNote = useCallback(async (noteId: number, tag: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEditingTags(prev => ({
          ...prev,
          currentTags: prev.currentTags.filter(t => t !== tag)
        }));
        await runSearch();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to remove tag');
      }
    } catch (err) {
      alert('Failed to remove tag');
    }
  }, [runSearch]);

  const toggleFavorite = useCallback(async (noteId: number) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/favorite`, {
        method: 'POST'
      });
      if (res.ok) {
        await runSearch();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to toggle favorite');
      }
    } catch (err) {
      alert('Failed to toggle favorite');
    }
  }, [runSearch]);

  const openRenameDialog = useCallback((noteId: number, currentFilename: string) => {
    setRenaming({ open: true, noteId, currentFilename, newFilename: currentFilename });
  }, []);

  const renameFile = useCallback(async () => {
    if (!renaming.noteId || !renaming.newFilename.trim()) return;
    
    try {
      const res = await fetch(`/api/notes/${renaming.noteId}/rename`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: renaming.newFilename.trim() })
      });
      
      if (res.ok) {
        setRenaming({ open: false, noteId: null, currentFilename: '', newFilename: '' });
        await runSearch();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to rename file');
      }
    } catch (err) {
      alert('Failed to rename file');
    }
  }, [renaming, runSearch]);

  const cleanFilename = useCallback((filename: string) => {
    // Remove Notion export hash patterns like "27d343951973808591ebdef700f19951"
    let cleaned = filename.replace(/\b[a-f0-9]{32}\b/g, '');
    
    // Remove extra spaces and clean up
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove leading/trailing dashes or underscores
    cleaned = cleaned.replace(/^[-_]+|[-_]+$/g, '');
    
    // If we removed everything, fall back to original
    if (!cleaned) return filename;
    
    return cleaned;
  }, []);

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    
    switch (sortBy) {
      case 'date-newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'favorites-first':
        return sorted.sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          // If both have same favorite status, sort by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      default:
        return sorted;
    }
  }, [results, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };

    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sortDropdownOpen]);

  const fileLabel = useMemo(() => {
    if (files.length === 0) return 'Drag .txt/.md files here or click to select';
    if (files.length === 1) {
      const kb = (files[0].size / 1024).toFixed(0);
      return `${files[0].name} (${kb} KB)`;
    }
    return `${files.length} files selected`;
  }, [files]);

  return (
    <div className={`min-h-screen ${backgroundColors.primary} bg-gradient-to-b ${backgroundColors.gradient}`}>
      <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sol Research</h1>
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
        className={`border-2 border-dashed border-gray-400 p-6 rounded-lg cursor-default transition-colors bg-white ${
          dragActive ? 'bg-gray-50' : 'bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md"
          multiple
          className="hidden"
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || []);
            if (selectedFiles.length > 0) {
              setFiles(prev => [...prev, ...selectedFiles]);
            }
          }}
        />
        <p className="m-0">{fileLabel}</p>
        {files.length > 0 && (
          <div className="mt-2 max-h-30 overflow-y-auto border border-gray-200 rounded p-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between py-1">
                <span className="text-xs">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Button onClick={() => inputRef.current?.click()}>Browse files</Button>
        </div>
        {allTags.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">Previous tags</div>
            <div className="flex gap-2 flex-wrap">
              {allTags.map((t) => {
                const selected = parseTags(tagsInput).includes(t);
                return (
                  <Button
                    key={t}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const current = new Set(parseTags(tagsInput));
                      if (current.has(t)) current.delete(t); else current.add(t);
                      setTagsFromSet(current);
                    }}
                    className="text-xs h-6 px-2"
                    aria-pressed={selected}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4">
          <Label className="text-xs text-gray-600 mb-2">Add new tag</Label>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="comma,separated,tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={onUpload} disabled={files.length === 0 || uploading}>
              {uploading ? 'Uploading...' : 'Add'}
            </Button>
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="mt-4">
            <AnonymizeStep
              files={files}
              onConfigChange={setAnonymizationConfig}
              onPreview={handleAnonymizationPreview}
            />
          </div>
        )}
      </div>

        <div className="mt-6 flex gap-3 items-start">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
          placeholder="Search filename/content"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-white pl-10"
            />
          </div>
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
            placeholder="Filter by tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
              className="w-full bg-white pl-10"
          />
          {tagSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded overflow-hidden shadow-lg z-50 mt-1">
              {tagSuggestions.map((t) => (
                  <div key={t} className="px-2 py-1 cursor-pointer hover:bg-gray-100" onClick={() => setTagFilter(t)}>{t}</div>
              ))}
            </div>
          )}
        </div>
          <div className="relative" ref={sortDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="h-10 px-3"
            >
              <ArrowUpDown size={16} className="mr-2" />
              Sort
            </Button>
            {sortDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[180px]">
                <div className="py-1">
                  <button
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${sortBy === 'date-newest' ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => {
                      setSortBy('date-newest');
                      setSortDropdownOpen(false);
                    }}
                  >
                    Date (newest first)
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${sortBy === 'date-oldest' ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => {
                      setSortBy('date-oldest');
                      setSortDropdownOpen(false);
                    }}
                  >
                    Date (oldest first)
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${sortBy === 'favorites-first' ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => {
                      setSortBy('favorites-first');
                      setSortDropdownOpen(false);
                    }}
                  >
                    Favorites first
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>

      <div className="mt-4">
        {loading ? <p className="text-gray-600">Loading…</p> : null}
        {results.length === 0 && !loading ? <p className="text-gray-600">No results</p> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedResults.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
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
                    className="font-semibold text-blue-600 hover:text-blue-700 text-left flex-1 min-w-0 break-words leading-tight"
              >
                    {cleanFilename(r.filename)}
              </button>
                  <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Rename file"
                    title="Rename"
                    onClick={() => openRenameDialog(r.id, r.filename)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={r.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    title={r.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => toggleFavorite(r.id)}
                    className={`h-6 w-6 p-0 ${r.is_favorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <Heart size={16} fill={r.is_favorite ? 'currentColor' : 'none'} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
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
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                  </div>
                </div>
              </div>
              
              {r.snippet ? (
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{r.snippet}</p>
              ) : null}
              
              <div className="text-xs text-gray-500 mb-3">
                Added {new Date(r.created_at).toLocaleDateString()}
              </div>
              
              <div className="flex gap-2 flex-wrap items-center">
                {r.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openTagEditor(r.id, r.tags)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  title="Edit tags"
                >
                  <Tag size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={preview.open} onOpenChange={(open) => setPreview({ open, note: null, loading: false })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{preview.note ? cleanFilename(preview.note.filename) : 'Opening…'}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {preview.loading && <p className="text-gray-600">Loading…</p>}
              {!preview.loading && preview.note && (
                preview.note.filename.endsWith('.md') ? (
                <div className="prose max-w-none">
                  <ReactMarkdown>{preview.note.content}</ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{preview.note.content}</pre>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingTags.open} onOpenChange={(open) => setEditingTags({ open, noteId: null, currentTags: [], newTag: '' })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600 mb-2">Current tags:</Label>
              <div className="flex gap-2 flex-wrap">
                {editingTags.currentTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTagFromNote(editingTags.noteId!, tag)}
                      className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                    >
                      <X size={10} />
                    </Button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-600 mb-2">Add existing tag:</Label>
              <div className="flex gap-2 flex-wrap">
                {allTags
                  .filter(tag => !editingTags.currentTags.includes(tag))
                  .map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => addTagToNote(editingTags.noteId!, tag)}
                      className="text-xs h-6 px-2"
                    >
                      <Plus size={10} className="mr-1" />
                      {tag}
                    </Button>
                  ))}
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-600 mb-2">Add new tag:</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={editingTags.newTag}
                  onChange={(e) => setEditingTags(prev => ({ ...prev, newTag: e.target.value }))}
                  placeholder="Enter new tag name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && editingTags.newTag.trim()) {
                      addTagToNote(editingTags.noteId!, editingTags.newTag.trim());
                      setEditingTags(prev => ({ ...prev, newTag: '' }));
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (editingTags.newTag.trim()) {
                      addTagToNote(editingTags.noteId!, editingTags.newTag.trim());
                      setEditingTags(prev => ({ ...prev, newTag: '' }));
                    }
                  }}
                  disabled={!editingTags.newTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming.open} onOpenChange={(open) => setRenaming({ open, noteId: null, currentFilename: '', newFilename: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-sm text-gray-600 mb-2">Current filename:</Label>
              <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{renaming.currentFilename}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600 mb-2">New filename:</Label>
              <Input
                type="text"
                value={renaming.newFilename}
                onChange={(e) => setRenaming(prev => ({ ...prev, newFilename: e.target.value }))}
                placeholder="Enter new filename"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && renaming.newFilename.trim()) {
                    renameFile();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRenaming({ open: false, noteId: null, currentFilename: '', newFilename: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={renameFile}
                disabled={!renaming.newFilename.trim() || renaming.newFilename === renaming.currentFilename}
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
    </div>
  );
}
