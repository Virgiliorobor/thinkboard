import { useState } from 'react';

export function CardHero({
  src,
  title,
  aspectClass,
}: {
  src: string;
  title: string;
  aspectClass: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className={`${aspectClass} bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 flex items-end p-6`}
      >
        <span className="font-serif text-2xl text-ink/80 leading-tight line-clamp-4">{title}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} overflow-hidden bg-stone-100`}>
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    </div>
  );
}
