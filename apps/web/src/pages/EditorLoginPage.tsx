import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useEditor } from '../hooks/useEditor';

export function EditorLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useEditor();

  const from = (location.state as { from?: string })?.from ?? '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.editorLogin(password);
      await refresh();
      navigate(from);
    } catch {
      setError('Invalid editor password');
    }
  };

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="font-serif text-3xl font-bold mb-2">Editor login</h1>
      <p className="text-muted text-sm mb-8">
        Required to create researches, trails, and capture entries. Reading is public.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Editor password"
          className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
          autoFocus
        />
        {error && <p className="text-accent text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90 transition-colors"
        >
          Sign in as editor
        </button>
      </form>
    </div>
  );
}
