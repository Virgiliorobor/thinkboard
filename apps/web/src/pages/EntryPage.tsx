import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArticleBody } from '../components/ArticleBody';

export function EntryPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [entry, setEntry] = useState<
    (Awaited<ReturnType<typeof api.entry>> & { researchSlug?: string | null }) | null
  >(null);

  useEffect(() => {
    if (!id) return;
    api.entry(id).then(setEntry);
  }, [id]);

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
        <img src={entry.heroImage} alt="" className="w-full rounded-xl mb-8 max-h-96 object-cover" />
      )}

      <h1 className="font-serif text-4xl font-bold leading-tight mb-4">{entry.title}</h1>

      {entry.userComment && (
        <blockquote className="border-l-4 border-accent pl-6 py-2 mb-8 text-lg italic text-muted">
          "{entry.userComment}"
        </blockquote>
      )}

      <div className="flex gap-4 text-sm text-muted mb-8">
        {entry.author && <span>{entry.author}</span>}
        {entry.sourceUrl && (
          <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Original source →
          </a>
        )}
      </div>

      {entry.fullTextMd ? (
        <ArticleBody markdown={entry.fullTextMd} />
      ) : (
        entry.excerpt && <p className="text-muted leading-relaxed">{entry.excerpt}</p>
      )}
    </article>
  );
}
