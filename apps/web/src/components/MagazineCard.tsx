import type { EntryCard } from '../lib/api';
import { Link } from 'react-router-dom';
import { layoutForEntry } from '../lib/cardLayout';
import { CardHero } from './CardHero';

const statusColors: Record<string, string> = {
  starred: 'bg-amber-100 text-amber-800',
  implement: 'bg-emerald-100 text-emerald-800',
  watch_later: 'bg-blue-100 text-blue-800',
  generic: 'bg-stone-200 text-stone-600',
};

export function MagazineCard({ entry, researchSlug }: { entry: EntryCard; researchSlug: string }) {
  const hasImage = Boolean(entry.heroImage);
  const layout = layoutForEntry(entry.id);

  return (
    <Link
      to={`/r/${researchSlug}/entry/${entry.id}`}
      className="group block break-inside-avoid mb-5"
      style={{
        marginTop: layout.offsetY,
        transform: `translateX(${layout.nudgeX}px)`,
      }}
    >
      <article
        className={`bg-card rounded-lg shadow-card overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${
          layout.variant === 'feature' ? 'ring-1 ring-stone-200/80' : ''
        }`}
      >
        {hasImage ? (
          <CardHero src={entry.heroImage!} title={entry.title} aspectClass={layout.aspectClass} />
        ) : (
          <div
            className={`${layout.aspectClass} bg-gradient-to-br from-stone-100 to-stone-200 flex items-end p-6`}
          >
            <span className={`${layout.titleClass} text-ink/80 leading-tight line-clamp-5`}>
              {entry.title}
            </span>
          </div>
        )}

        <div className={`p-5 ${layout.variant === 'feature' ? 'pt-6' : ''}`}>
          {entry.userComment && (
            <blockquote className="border-l-4 border-accent pl-4 mb-4 text-muted italic text-sm leading-relaxed line-clamp-3">
              "{entry.userComment}"
            </blockquote>
          )}

          {hasImage && (
            <h2
              className={`${layout.titleClass} font-medium leading-snug mb-2 line-clamp-3 group-hover:text-accent transition-colors`}
            >
              {entry.title}
            </h2>
          )}

          {entry.excerpt && !entry.userComment && (
            <p className="text-sm text-muted line-clamp-3">{entry.excerpt}</p>
          )}

          <div className="flex items-center gap-2 mt-4 text-xs text-muted">
            {entry.author && <span>{entry.author}</span>}
            {entry.status !== 'published' && statusColors[entry.status] && (
              <span className={`px-2 py-0.5 rounded-full ${statusColors[entry.status]}`}>
                {entry.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
