import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type EntryCard } from '../lib/api';
import { MagazineGrid } from '../components/MagazineGrid';

export function InboxPage() {
  const { slug } = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<EntryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!slug) return;
    setLoading(true);
    api
      .entries(slug, { inbox: 'true' })
      .then(setEntries)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not load inbox');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [slug]);

  const publish = async (id: string) => {
    setPublishingId(id);
    setError(null);
    try {
      await api.publishInbox(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publish failed');
    } finally {
      setPublishingId(null);
    }
  };

  const publishAll = async () => {
    if (!slug) return;
    if (
      !window.confirm(
        `Publish all ${entries.length} inbox entries to your magazine? They will become publicly visible.`
      )
    ) {
      return;
    }
    setPublishingAll(true);
    setError(null);
    try {
      const result = await api.publishAllInbox(slug);
      setEntries([]);
      if (result.published === 0) {
        setError('No entries were published — inbox may already be empty.');
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publish all failed');
    } finally {
      setPublishingAll(false);
    }
  };

  if (loading) return <p className="text-muted">Loading inbox…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <h1 className="font-serif text-3xl font-bold">Import inbox</h1>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={publishAll}
            disabled={publishingAll || !!publishingId}
            className="px-5 py-2.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {publishingAll ? 'Publishing all…' : `Publish all (${entries.length})`}
          </button>
        )}
      </div>
      <p className="text-muted mb-2">Review imported entries before they appear in your magazine.</p>
      {entries.length > 0 && (
        <p className="text-sm text-muted mb-4">{entries.length} entries waiting to publish</p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-4 bg-white rounded-lg p-4 mb-3 shadow-sm">
          <div className="min-w-0">
            <h3 className="font-medium truncate">{e.title}</h3>
            {e.sourceUrl && (
              <p className="text-xs text-muted truncate mt-0.5">{e.sourceUrl}</p>
            )}
            {e.userComment && (
              <p className="text-sm text-muted italic mt-1 line-clamp-2">"{e.userComment}"</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => publish(e.id)}
            disabled={publishingId === e.id || publishingAll}
            className="shrink-0 px-4 py-2 bg-accent text-white rounded-full text-sm disabled:opacity-50"
          >
            {publishingId === e.id ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      ))}

      {!entries.length && (
        <p className="text-muted">
          Inbox empty.{' '}
          <Link to={`/r/${slug}`} className="text-accent hover:underline">
            View magazine →
          </Link>
        </p>
      )}

      {entries.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-xl mb-4">Preview</h2>
          <MagazineGrid entries={entries} researchSlug={slug!} />
        </div>
      )}
    </div>
  );
}
