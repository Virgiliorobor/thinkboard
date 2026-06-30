import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type EntryCard } from '../lib/api';
import { MagazineGrid } from '../components/MagazineGrid';

export function InboxPage() {
  const { slug } = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<EntryCard[]>([]);

  const load = () => {
    if (!slug) return;
    api.entries(slug, { inbox: 'true' }).then(setEntries);
  };

  useEffect(load, [slug]);

  const publish = async (id: string) => {
    await api.publishInbox(id);
    load();
  };

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-2">Import inbox</h1>
      <p className="text-muted mb-8">Review imported entries before they appear in your magazine.</p>

      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-4 bg-white rounded-lg p-4 mb-3 shadow-sm">
          <div>
            <h3 className="font-medium">{e.title}</h3>
            {e.userComment && <p className="text-sm text-muted italic mt-1 line-clamp-2">"{e.userComment}"</p>}
          </div>
          <button
            onClick={() => publish(e.id)}
            className="shrink-0 px-4 py-2 bg-accent text-white rounded-full text-sm"
          >
            Publish
          </button>
        </div>
      ))}

      {!entries.length && (
        <p className="text-muted">
          Inbox empty.{' '}
          <Link to={`/r/${slug}`} className="text-accent hover:underline">
            Back to magazine
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
