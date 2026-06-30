/** Deterministic layout rhythm from entry id (Flipboard-style organic variety). */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * (i + 1)) % 9973;
  }
  return h;
}

export type CardVariant = 'standard' | 'tall' | 'compact' | 'feature';

export interface CardLayout {
  variant: CardVariant;
  aspectClass: string;
  offsetY: number;
  nudgeX: number;
  titleClass: string;
}

export function layoutForEntry(id: string): CardLayout {
  const h = hashId(id);
  const bucket = h % 12;

  let variant: CardVariant = 'standard';
  if (bucket === 0 || bucket === 1) variant = 'feature';
  else if (bucket <= 4) variant = 'tall';
  else if (bucket <= 6) variant = 'compact';

  const aspectClass =
    variant === 'feature'
      ? 'aspect-[4/5]'
      : variant === 'tall'
        ? 'aspect-[3/4]'
        : variant === 'compact'
          ? 'aspect-[16/11]'
          : 'aspect-[16/10]';

  return {
    variant,
    aspectClass,
    offsetY: (h % 5) * 3,
    nudgeX: ((h % 7) - 3) * 2,
    titleClass:
      variant === 'feature' ? 'font-serif text-2xl' : variant === 'tall' ? 'font-serif text-xl' : 'font-serif text-xl',
  };
}
