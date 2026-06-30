import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { ArticleBody } from '../components/ArticleBody';
import { useEditor } from '../hooks/useEditor';

export function EntryPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { editor } = useEditor();
  const [entry, setEntry] = useState<
    (Awaited<ReturnType<typeof api.entry>> & { researchSlug?: string | null }) | null
  >(null);
  const [refetching, setRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    api.entry(id).then(setEntry);
  };

  useEffect(load, [id]);

  const refetch = async () => {
    if (!id) return;
    setRefetching(true);
    setRefetchError(null);
    try {
      await api.refetchEntry(id);
      load();
    } catch (err) {
      setRefetchError(err instanceof ApiError ? err.message : 'Could not fetch metadata');
    } finally {
      setRefetching(false);
    }
  };

  if (!entry) return <p className="text-muted">Loading…</p>;

  return (
    <article className="max-w-3xl mx-auto">
      <Link
        to={`/r/${entry.researchSlug ?? slug}`}
        className="text-sm text-muted hover:text-accent mb-6 inline-block"
      >
        ← Back to magazine
      </Link>

      {entry.heroImage && (
        <img
          src={entry.heroImage}
          alt=""
          className="w-full rounded-xl mb-8 max-h-96 object-cover"
          referrerPolicy="no-referrer"
        />
      )}

      <h1 className="font-serif text-4xl font-bold leading-tight mb-4">{entry.title}</h1>

      {entry.userComment && (
        <blockquote className="border-l-4 border-accent pl-6 py-2 mb-8 text-lg italic text-muted">
          "{entry.userComment}"
        </blockquote>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted mb-8 items-center">
        {entry.author && <span>{entry.author}</span>}
        {entry.sourceUrl && (
          <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Original source →
          </a>
        )}
        {editor && entry.sourceUrl && (
          <button
            type="button"
            onClick={refetch}
            disabled={refetching}
            className="px-3 py-1 border border-stone-200 rounded-full text-ink hover:border-accent/50 disabled:opacity-50"
          >
            {refetching ? 'Fetching…' : 'Re-fetch metadata'}
          </button>
        )}
      </div>

      {refetchError && <p className="text-sm text-red-600 mb-4">{refetchError}</p>}

      {entry.fullTextMd ? (
        <ArticleBody markdown={entry.fullTextMd} />
      ) : (
        entry.excerpt && <p className="text-muted leading-relaxed">{entry.excerpt}</p>
      )}
    </article>
  );
}
