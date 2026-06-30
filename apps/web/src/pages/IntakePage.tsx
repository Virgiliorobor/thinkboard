import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function IntakePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [importFile, setImportFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportFile(reader.result as string);
    reader.readAsText(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const research = await api.createResearch({
        name,
        description,
        isPrivate,
        password: isPrivate ? password : undefined,
      });
      if (importFile) {
        await api.importTxt(research.slug, importFile);
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
          <label className="block text-sm font-medium mb-2">Import links file (optional)</label>
          <input type="file" accept=".txt" onChange={handleFile} className="text-sm text-muted" />
          {importFile && (
            <p className="text-xs text-emerald-600 mt-2">File loaded — entries go to inbox for review.</p>
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
