import Masonry from 'react-masonry-css';
import type { EntryCard } from '../lib/api';
import { MagazineCard } from './MagazineCard';

const breakpointCols = { default: 3, 1100: 2, 640: 1 };

export function MagazineGrid({
  entries,
  researchSlug,
}: {
  entries: EntryCard[];
  researchSlug: string;
}) {
  if (!entries.length) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="font-serif text-2xl mb-2">Nothing here yet</p>
        <p className="text-sm">Capture a link or import your research to get started.</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointCols}
      className="flex -ml-5 w-auto"
      columnClassName="pl-5 bg-clip-padding"
    >
      {entries.map((entry) => (
        <MagazineCard key={entry.id} entry={entry} researchSlug={researchSlug} />
      ))}
    </Masonry>
  );
}
