import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

export function TrailPage() {
  const { slug, trailId } = useParams<{ slug: string; trailId: string }>();
  const navigate = useNavigate();
  const [trail, setTrail] = useState<Awaited<ReturnType<typeof api.trailDetail>> | null>(null);

  useEffect(() => {
    if (!slug || !trailId) return;
    api
      .trailDetail(slug, trailId)
      .then(setTrail)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          navigate(`/r/${slug}/trail/${trailId}/unlock`, { replace: true });
        }
      });
  }, [slug, trailId, navigate]);

  if (!trail) return <p className="text-muted">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/r/${slug}`} className="text-sm text-muted hover:text-accent mb-6 inline-block">
        ← Back to magazine
      </Link>

      <h1 className="font-serif text-3xl font-bold mb-8">{trail.name}</h1>

      <ol className="relative border-l-2 border-stone-200 ml-4 space-y-8">
        {trail.nodes.map((node, i) => (
          <li key={node.entry?.id ?? i} className="ml-6">
            <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-accent border-4 border-cream" />
            {node.entry ? (
              <Link
                to={`/r/${slug}/entry/${node.entry.id}`}
                className="block bg-card rounded-lg shadow-card p-5 hover:-translate-y-0.5 transition-transform"
              >
                {node.entry.userComment && (
                  <blockquote className="border-l-4 border-accent pl-4 mb-3 text-sm italic text-muted">
                    "{node.entry.userComment}"
                  </blockquote>
                )}
                <h3 className="font-serif text-lg font-medium">{node.entry.title}</h3>
              </Link>
            ) : (
              <p className="text-muted text-sm">Missing entry</p>
            )}
          </li>
        ))}
      </ol>

      {!trail.nodes.length && (
        <p className="text-muted">No entries on this trail yet.</p>
      )}
    </div>
  );
}
