import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export function UnlockResearchPage() {
  const { slug } = useParams<{ slug: string }>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setError('');
    try {
      await api.unlockResearch(slug, password);
      navigate(`/r/${slug}`);
    } catch {
      setError('Invalid password');
    }
  };

  return (
    <div className="max-w-sm mx-auto py-16 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="font-serif text-3xl font-bold mb-2">Private research</h1>
      <p className="text-muted text-sm mb-8">This research is password-protected. Enter the password to read.</p>

      <form onSubmit={submit} className="space-y-4 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Research password"
          className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white"
          autoFocus
        />
        {error && <p className="text-accent text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}

export function UnlockTrailPage() {
  const { slug, trailId } = useParams<{ slug: string; trailId: string }>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !trailId) return;
    setError('');
    try {
      await api.unlockTrail(trailId, password);
      navigate(`/r/${slug}/trail/${trailId}`);
    } catch {
      setError('Invalid password');
    }
  };

  return (
    <div className="max-w-sm mx-auto py-16 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="font-serif text-3xl font-bold mb-2">Private trail</h1>
      <p className="text-muted text-sm mb-8">This trail is password-protected.</p>

      <form onSubmit={submit} className="space-y-4 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Trail password"
          className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white"
          autoFocus
        />
        {error && <p className="text-accent text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90"
        >
          Unlock trail
        </button>
      </form>
    </div>
  );
}
