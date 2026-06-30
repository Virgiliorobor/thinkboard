import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, type Research } from '../lib/api';
import { useEditor } from '../hooks/useEditor';

export function HubPage() {
  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { editor } = useEditor();

  const load = () => {
    setLoading(true);
    api.researches().then(setResearches).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (r: Research) => {
    if (
      !window.confirm(
        `Delete "${r.name}" and all its entries, topics, and trails? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(r.slug);
    try {
      await api.deleteResearch(r.slug);
      setResearches((prev) => prev.filter((x) => x.slug !== r.slug));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-serif text-4xl font-bold mb-2">Research magazine</h1>
          <p className="text-muted">Curated inquiries — browse publicly, edit with editor access.</p>
        </div>
        {editor && (
          <Link
            to="/intake"
            className="px-5 py-2.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            + New research
          </Link>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {researches.map((r) => (
          <div
            key={r.id}
            className="relative bg-card rounded-xl shadow-card p-6 hover:-translate-y-1 transition-transform"
          >
            {editor && (
              <button
                type="button"
                onClick={() => remove(r)}
                disabled={deleting === r.slug}
                className="absolute top-4 right-4 text-xs text-red-600/80 hover:text-red-700 disabled:opacity-50"
                title="Delete research"
              >
                {deleting === r.slug ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <Link
              to={r.locked ? `/r/${r.slug}/unlock` : `/r/${r.slug}`}
              className="group block"
            >
              <div className="flex items-start justify-between gap-2 pr-14">
                <h2 className="font-serif text-2xl font-medium mb-2 group-hover:text-accent transition-colors">
                  {r.name}
                </h2>
                {r.locked && <span title="Private">🔒</span>}
              </div>
              {r.description && (
                <p className="text-sm text-muted line-clamp-2 mb-4">{r.description}</p>
              )}
              <div className="flex gap-4 text-xs text-muted">
                <span>{r.entryCount ?? 0} entries</span>
                <span>{r.topicCount ?? 0} topics</span>
                {r.isPrivate && !r.locked && (
                  <span className="text-emerald-600">unlocked</span>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {!researches.length && (
        <div className="text-center py-16 text-muted">
          <p className="mb-4">No public researches yet.</p>
          {editor ? (
            <Link to="/intake" className="text-accent font-medium hover:underline">
              Create your first research →
            </Link>
          ) : (
            <Link to="/edit" className="text-accent font-medium hover:underline">
              Editor login to create →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function EditorGuard({ children }: { children: React.ReactNode }) {
  const { editor } = useEditor();
  if (!editor) return <Navigate to="/edit" state={{ from: window.location.pathname }} replace />;
  return <>{children}</>;
}
