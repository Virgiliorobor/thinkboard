import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type EntryCard } from '../lib/api';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [results, setResults] = useState<EntryCard[]>([]);

  useEffect(() => {
    if (!q) return;
    api.search(q).then(setResults);
  }, [q]);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-2">Search</h1>
      <p className="text-muted mb-8">
        Results for "<span className="text-ink">{q}</span>"
      </p>

      <div className="space-y-4">
        {results.map((e) => (
          <Link
            key={e.id}
            to={e.researchSlug ? `/r/${e.researchSlug}/entry/${e.id}` : '/'}
            className="block bg-card rounded-lg shadow-card p-5 hover:-translate-y-0.5 transition-transform"
          >
            {e.userComment && (
              <blockquote className="border-l-4 border-accent pl-4 mb-2 text-sm italic text-muted line-clamp-2">
                "{e.userComment}"
              </blockquote>
            )}
            <h3 className="font-serif text-lg font-medium">{e.title}</h3>
          </Link>
        ))}
      </div>

      {!results.length && q && <p className="text-muted">No results.</p>}
    </div>
  );
}
