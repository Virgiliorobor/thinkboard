import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type ImportMode = 'none' | 'txt' | 'json';

function entryCount(payload: Record<string, unknown> | null): number | null {
  if (!payload?.entries || !Array.isArray(payload.entries)) return null;
  return payload.entries.length;
}

export function IntakePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('none');
  const [importTxt, setImportTxt] = useState<string | null>(null);
  const [importJson, setImportJson] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        try {
          setImportJson(JSON.parse(text));
          setImportTxt(null);
          setImportMode('json');
          setError(null);
        } catch {
          setError('Invalid JSON file — check the format.');
        }
      } else {
        setImportTxt(text);
        setImportJson(null);
        setImportMode('txt');
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setPhase('Creating research…');
    try {
      const jsonResearch =
        importJson?.research && typeof importJson.research === 'object'
          ? (importJson.research as Record<string, unknown>)
          : null;

      const research = await api.createResearch({
        name: name.trim(),
        description: description.trim() || (jsonResearch?.description as string) || undefined,
        isPrivate,
        password: isPrivate ? password : undefined,
        seedTopics: !importJson?.topics,
        seedTrails: !importJson,
      });

      if (importJson) {
        const count = entryCount(importJson);
        setPhase(count ? `Importing ${count} entries…` : 'Importing entries…');
        const payload = { ...importJson };
        delete payload.research;
        const result = await api.bulkImport(research.slug, payload);
        if (result.imported === 0 && count && count > 0) {
          throw new Error('No entries were imported. They may already exist in this research.');
        }
        navigate(`/r/${research.slug}/inbox`);
      } else if (importTxt) {
        setPhase('Importing links…');
        await api.importTxt(research.slug, importTxt);
        navigate(`/r/${research.slug}/inbox`);
      } else {
        navigate(`/r/${research.slug}`);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong';
      setError(message);
      setPhase(null);
    } finally {
      setLoading(false);
    }
  };

  const importCount = entryCount(importJson);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-4xl font-bold mb-2">New research</h1>
      <p className="text-muted mb-8">Public by default — share the link with anyone. Lock it if needed.</p>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Research name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI Design — taste & agency playbooks"
            className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
            required
          />
          {importMode === 'json' && (
            <p className="text-xs text-muted mt-1">
              Your form name is used — the JSON <code className="text-xs">research.name</code> is ignored.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Intent (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you exploring and why?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Private research (viewers need a password)</span>
        </label>

        {isPrivate && (
          <div>
            <label className="block text-sm font-medium mb-2">View password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password for readers"
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white"
              required={isPrivate}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Bulk import (optional)</label>
          <p className="text-xs text-muted mb-2">
            Upload a <strong>.json</strong> bulk-import file (recommended) or legacy <strong>.txt</strong> links file.
          </p>
          <input
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFile}
            className="text-sm text-muted"
          />
          {importMode === 'json' && (
            <p className="text-xs text-emerald-600 mt-2">
              JSON loaded{importCount ? ` — ${importCount} entries` : ''} (go to inbox after create).
            </p>
          )}
          {importMode === 'txt' && (
            <p className="text-xs text-emerald-600 mt-2">TXT loaded — entries go to inbox for review.</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {loading ? phase ?? 'Working…' : 'Create research'}
        </button>
      </form>
    </div>
  );
}
