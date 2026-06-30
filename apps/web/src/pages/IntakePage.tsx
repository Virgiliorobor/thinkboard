import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type ImportMode = 'none' | 'txt' | 'json';

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
        } catch {
          alert('Invalid JSON file');
        }
      } else {
        setImportTxt(text);
        setImportJson(null);
        setImportMode('txt');
      }
    };
    reader.readAsText(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const jsonResearch =
        importJson?.research && typeof importJson.research === 'object'
          ? (importJson.research as Record<string, unknown>)
          : null;

      const research = await api.createResearch({
        name: (jsonResearch?.name as string) || name,
        description: (jsonResearch?.description as string) || description,
        isPrivate: (jsonResearch?.isPrivate as boolean) ?? isPrivate,
        password: isPrivate ? password : undefined,
        seedTopics: !importJson?.topics,
        seedTrails: true,
      });

      if (importJson) {
        const payload = { ...importJson };
        if (payload.research && typeof payload.research === 'object') {
          payload.research = { ...(payload.research as object), name: research.name };
        }
        await api.bulkImport(research.slug, payload);
        navigate(`/r/${research.slug}/inbox`);
      } else if (importTxt) {
        await api.importTxt(research.slug, importTxt);
        navigate(`/r/${research.slug}/inbox`);
      } else {
        navigate(`/r/${research.slug}`);
      }
    } finally {
      setLoading(false);
    }
  };

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
              JSON loaded — entries go to inbox for review.
            </p>
          )}
          {importMode === 'txt' && (
            <p className="text-xs text-emerald-600 mt-2">
              TXT loaded — entries go to inbox for review.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating…' : 'Create research'}
        </button>
      </form>
    </div>
  );
}
