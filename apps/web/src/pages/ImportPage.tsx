import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export function ImportPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState('');
  const [fetchArticles, setFetchArticles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJsonText(reader.result as string);
    reader.readAsText(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !jsonText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = JSON.parse(jsonText);
      if (payload.options) {
        payload.options.fetchArticles = fetchArticles;
      } else {
        payload.options = { fetchArticles };
      }
      const res = await api.bulkImport(slug, payload);
      setResult(
        `Imported ${res.imported} entries` +
          (res.skipped ? ` (${res.skipped} duplicates skipped)` : '') +
          (res.topicsCreated ? ` · ${res.topicsCreated} topics created` : '') +
          '.'
      );
      if (res.imported > 0) {
        setTimeout(() => navigate(`/r/${slug}/inbox`), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/r/${slug}`} className="text-sm text-accent hover:underline">
        ← Back to magazine
      </Link>
      <h1 className="font-serif text-4xl font-bold mt-4 mb-2">Bulk import (JSON)</h1>
      <p className="text-muted mb-6">
        Paste or upload a Thinkboard bulk-import file. See{' '}
        <a
          href="https://github.com/Virgiliorobor/thinkboard/blob/main/docs/bulk-import.example.json"
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          example JSON
        </a>{' '}
        and README for AI conversion instructions.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">JSON file</label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={loadFile}
            className="text-sm text-muted"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Or paste JSON</label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={16}
            placeholder='{"$schema":"thinkboard-bulk-import-v1","entries":[...]}'
            className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
            required
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={fetchArticles}
            onChange={(e) => setFetchArticles(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Fetch article metadata from URLs (slower, richer cards)</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-emerald-600">{result}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90 disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Import to inbox'}
        </button>
      </form>
    </div>
  );
}
