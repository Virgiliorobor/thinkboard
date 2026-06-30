import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type EntryCard, type Research, type Topic, type Trail } from '../lib/api';
import { MagazineGrid } from '../components/MagazineGrid';
import { useEditor } from '../hooks/useEditor';

export function MagazinePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { editor } = useEditor();
  const [research, setResearch] = useState<Research | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [entries, setEntries] = useState<EntryCard[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLocked(false);

    api
      .research(slug)
      .then((r) => {
        setResearch(r);
        return Promise.all([api.topics(slug), api.trails(slug)]);
      })
      .then(([t, tr]) => {
        setTopics(t);
        setTrails(tr);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setLocked(true);
          navigate(`/r/${slug}/unlock`, { replace: true });
        }
      });
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug || locked) return;
    api.entries(slug, activeTopic ? { topic: activeTopic } : undefined).then(setEntries);
  }, [slug, activeTopic, locked]);

  if (locked) return null;

  if (!research) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold mb-2">{research.name}</h1>
        {research.description && <p className="text-muted max-w-2xl">{research.description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {editor && (
          <>
            <Link
              to={`/r/${slug}/capture`}
              className="px-4 py-2 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90"
            >
              + Capture
            </Link>
            <Link
              to={`/r/${slug}/inbox`}
              className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm hover:border-accent/50"
            >
              Inbox
            </Link>
          </>
        )}
        {trails.map((trail) => (
          <Link
            key={trail.id}
            to={trail.locked ? `/r/${slug}/trail/${trail.id}/unlock` : `/r/${slug}/trail/${trail.id}`}
            className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm hover:border-accent/50 flex items-center gap-1"
          >
            {trail.locked && <span>🔒</span>}
            {trail.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setActiveTopic(null)}
          className={`px-3 py-1 rounded-full text-sm ${!activeTopic ? 'bg-ink text-cream' : 'bg-white border border-stone-200'}`}
        >
          All
        </button>
        {topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTopic(t.slug)}
            className={`px-3 py-1 rounded-full text-sm ${activeTopic === t.slug ? 'bg-ink text-cream' : 'bg-white border border-stone-200'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <MagazineGrid entries={entries} researchSlug={slug!} />
    </div>
  );
}
