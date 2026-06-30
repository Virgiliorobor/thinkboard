import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEditor } from '../hooks/useEditor';

export function Layout() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { editor, logout } = useEditor();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
          <Link to="/" className="font-serif text-2xl font-bold tracking-tight shrink-0">
            Think<span className="text-accent">board</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find something you saved…"
              className="w-full px-4 py-2 rounded-full bg-white border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </form>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="hover:text-accent transition-colors">
              Researches
            </Link>
            {editor ? (
              <>
                <Link to="/intake" className="hover:text-accent transition-colors">
                  New research
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-muted hover:text-accent text-xs"
                >
                  Editor · logout
                </button>
              </>
            ) : (
              <Link to="/edit" className="text-muted hover:text-accent transition-colors text-xs">
                Editor login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
